// Helpers compartidos para validar las tools del MCP contra FreeCAD 1.1.3 (headless).
// Uso: importar createBridge() y runFull() desde los scripts de validación por módulo.
// HEADLESS forzado (useSocket=false) para no interferir con la GUI de FreeCAD existente.
// El REPL interno es robusto: detecta Quantity no serializable y devuelve errores claros.

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { FreeCADBridge } from '../dist/freecad-bridge.js';

export const FREECAD_CMD =
  process.env.FREECAD_CMD ||
  '/home/fciliberti/Trabajos/Tools/freecad-bin/squashfs-root/usr/bin/freecadcmd';

const RESULT_MARKER = '__MCP_RESULT__';

const ROBUST_REPL_SCRIPT = `
import sys
import json
import FreeCAD
import Part

MARKER = "${RESULT_MARKER}"

def _has_quantity(obj, seen=None):
    if seen is None:
        seen = set()
    id_ = id(obj)
    if id_ in seen:
        return False
    seen.add(id_)
    if hasattr(obj, 'Value') and hasattr(obj, 'Unit'):
        return True
    if isinstance(obj, dict):
        for v in obj.values():
            if _has_quantity(v, seen):
                return True
    elif isinstance(obj, (list, tuple)):
        for item in obj:
            if _has_quantity(item, seen):
                return True
    return False

def _convert_quantities(obj, seen=None):
    if seen is None:
        seen = set()
    id_ = id(obj)
    if id_ in seen:
        return obj
    seen.add(id_)
    if hasattr(obj, 'Value') and hasattr(obj, 'Unit'):
        return obj.Value
    if isinstance(obj, dict):
        return {k: _convert_quantities(v, seen) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_convert_quantities(item, seen) for item in obj]
    return obj

print("__MCP_READY__", flush=True)

while True:
    try:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if not line.startswith("__MCP_EXEC__"):
            continue

        count = int(line.split(":")[1])
        code_lines = []
        for _ in range(count):
            code_lines.append(sys.stdin.readline().rstrip("\\n"))
        code = "\\n".join(code_lines)

        _mcp_result = {"success": True}
        _mcp_globals = dict(globals())
        _mcp_globals["_mcp_result"] = _mcp_result
        try:
            exec(code, _mcp_globals)
            _mcp_result = _mcp_globals["_mcp_result"]
        except Exception as e:
            _mcp_result = {"success": False, "error": str(e)}

        # Si el resultado contiene Quantity, lo convertimos para no romper json.dumps,
        # pero marcamos el resultado como error de handler para que se reporte como FAIL.
        if _has_quantity(_mcp_result):
            _mcp_result = {
                "success": False,
                "error": "Handler returned non-serializable Quantity object (use .Value in src/tools)",
                "original": _convert_quantities(_mcp_result)
            }

        try:
            json_str = json.dumps(_mcp_result)
        except Exception as e:
            json_str = json.dumps({"success": False, "error": "JSON serialization error: " + str(e)})

        print(MARKER, flush=True)
        print(json_str, flush=True)
        print(MARKER + "END", flush=True)
    except Exception as e:
        print(MARKER, flush=True)
        print(json.dumps({"success": False, "error": "REPL error: " + str(e)}), flush=True)
        print(MARKER + "END", flush=True)
`;

class RobustFreeCADBridge extends FreeCADBridge {
  async ensureProcess() {
    if (this.ready && this.process && this.process.exitCode === null) {
      return this.ready;
    }

    await writeFile(this.replScriptPath, ROBUST_REPL_SCRIPT, 'utf-8');

    const pythonBin = `${this.freecadApp}/bin/python`;
    const libPath = `${this.freecadApp}/lib`;

    this.process = spawn(pythonBin, ['-u', this.replScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONPATH: libPath,
        PYTHONUNBUFFERED: '1',
      },
    });

    this.stdoutBuffer = '';

    this.process.stdout.on('data', (chunk) => {
      this.stdoutBuffer += chunk.toString();
      if (this.pendingMarker && this.stdoutBuffer.includes(this.pendingMarker)) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        this.pendingReject = null;
        resolve?.(this.stdoutBuffer);
      }
    });

    this.process.stderr.on('data', () => {});

    this.process.on('exit', () => {
      if (this.pendingReject) {
        const reject = this.pendingReject;
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(new Error('FreeCAD process exited unexpectedly'));
      }
    });

    this.process.on('error', (err) => {
      if (this.pendingReject) {
        const reject = this.pendingReject;
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(err);
      }
    });

    this.ready = new Promise((resolve, reject) => {
      this.pendingMarker = '__MCP_READY__';
      const timer = setTimeout(() => {
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(new Error('FreeCAD initialization timed out'));
      }, this.timeout);

      this.pendingResolve = () => {
        clearTimeout(timer);
        this.stdoutBuffer = '';
        resolve();
      };
      this.pendingReject = (err) => {
        clearTimeout(timer);
        reject(err);
      };
    });

    return this.ready;
  }
}

export function createBridge() {
  const bridge = new RobustFreeCADBridge(FREECAD_CMD);
  bridge.useSocket = false; // forzar headless
  return bridge;
}

/** Ejecuta un handler real de tool (el mismo registrado en index.ts) y devuelve resultado normalizado. */
export async function runFull(bridge, handler, name, args) {
  try {
    const res = await handler(name, args, bridge);
    return { name, ok: !res.isError, text: res.content?.[0]?.text ?? '' };
  } catch (e) {
    return { name, ok: false, text: `HANDLER THREW: ${e.message}` };
  }
}

export function report(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${result.name}`);
  if (!result.ok) console.log(`        ${result.text}`);
}
