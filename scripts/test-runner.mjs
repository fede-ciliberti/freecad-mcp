// Suite de validación del MCP freecad-mcp usando node:test (builtin de Node 18+).
// Corre los 15 validadores de scripts/validador/ + el bridge QA de scripts/resultados/bridge-qa.mjs,
// recolecta resultados, clasifica FAILs documentados (GUI-only / requiere-externo) y devuelve
// exit code != 0 solo si hay un FAIL no documentado.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FREECAD_CMD =
  process.env.FREECAD_CMD ||
  '/home/fciliberti/Trabajos/Tools/freecad-bin/squashfs-root/usr/bin/freecadcmd';

// 15 validadores por módulo (orden estable, igual que el README).
const VALIDATORS = [
  'document.mjs',
  'primitives.mjs',
  'operations.mjs',
  'sketcher.mjs',
  'part-design.mjs',
  'import-export.mjs',
  'draft.mjs',
  'mesh.mjs',
  'techdraw.mjs',
  'advanced-operations.mjs',
  'spreadsheet.mjs',
  'bim.mjs',
  'fem.mjs',
  'surface.mjs',
  'assembly.mjs',
  'state.mjs',
  'view.mjs',
];

const BRIDGE_QA = join(__dirname, 'resultados', 'bridge-qa.mjs');

// Tools cuyo FAIL en headless está documentado: requieren GUI de FreeCAD o un binario/módulo externo.
// Estas no hacen fallar el suite.
const DOCUMENTED_GUI_ONLY = new Set([
  'freecad_import_iges', // ImportGui solo disponible con GUI
]);

const DOCUMENTED_REQUIRES_EXTERNAL = new Set([
  // Si en algún entorno fallan por depender de Gmsh/ifcopenshell, se documentan aquí.
  // Actualmente pasan en el entorno de validación, pero se mantienen explícitas por robustez.
  'freecad_fem_mesh',
  'freecad_export_ifc',
]);

const DOCUMENTED_FAILS = new Set([
  ...DOCUMENTED_GUI_ONLY,
  ...DOCUMENTED_REQUIRES_EXTERNAL,
]);

function isDocumentedFail(toolName) {
  return DOCUMENTED_FAILS.has(toolName);
}

function isGuiOnly(toolName) {
  return DOCUMENTED_GUI_ONLY.has(toolName);
}

function isRequiresExternal(toolName) {
  return DOCUMENTED_REQUIRES_EXTERNAL.has(toolName);
}

// Ejecuta un script Node como subproceso aislado, heredando FREECAD_CMD.
function runScript(scriptPath, label) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [scriptPath],
      {
        env: { ...process.env, FREECAD_CMD },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({ scriptPath, label, code, stdout, stderr });
    });
  });
}

// Parsea líneas de resultado de la forma [PASS|FAIL] <toolName> ...
function parseResults(stdout, source) {
  const results = [];
  const lines = stdout.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^\[(PASS|FAIL)\]\s+(\S+)/);
    if (!match) continue;
    const [, status, name] = match;
    const ok = status === 'PASS';
    let text = '';
    if (!ok) {
      // La línea siguiente indentada suele ser el mensaje de error.
      const next = lines[i + 1] || '';
      if (next.trim().startsWith('FreeCAD error:') || next.trim().startsWith('HANDLER THREW:')) {
        text = next.trim();
        i++;
      } else if (next.match(/^\s+/)) {
        text = next.trim();
        i++;
      }
    }
    results.push({ source, name, ok, text });
  }
  return results;
}

// Parsea el resumen del bridge QA.
function parseBridgeQA(stdout) {
  const overall = stdout.includes('=== OVERALL QA RESULT: PASS ===');
  return {
    source: 'bridge-qa',
    name: 'bridge-qa',
    ok: overall,
    text: overall ? '' : 'Bridge QA overall FAIL',
  };
}

async function main() {
  const allResults = [];
  const failedUndocumented = [];

  console.log('=== freecad-mcp validation suite ===\n');
  console.log(`FREECAD_CMD: ${FREECAD_CMD}\n`);

  // Ejecutar cada validador dentro de un test de node:test.
  for (const validator of VALIDATORS) {
    const scriptPath = join(__dirname, 'validador', validator);
    const label = validator.replace(/\.mjs$/, '');

    await test(label, async () => {
      const run = await runScript(scriptPath, label);
      // Imprimir stdout/stderr tal cual para mantener el log detallado.
      if (run.stdout) process.stdout.write(run.stdout);
      if (run.stderr) process.stderr.write(run.stderr);

      const results = parseResults(run.stdout, label);
      allResults.push(...results);

      for (const r of results) {
        if (!r.ok && !isDocumentedFail(r.name)) {
          failedUndocumented.push(r);
        }
      }
    });
  }

  // Bridge QA.
  await test('bridge-qa', async () => {
    const run = await runScript(BRIDGE_QA, 'bridge-qa');
    if (run.stdout) process.stdout.write(run.stdout);
    if (run.stderr) process.stderr.write(run.stderr);

    const result = parseBridgeQA(run.stdout);
    allResults.push(result);
    if (!result.ok) {
      failedUndocumented.push(result);
    }
  });

  // Resumen global.
  const pass = allResults.filter((r) => r.ok).length;
  const fail = allResults.filter((r) => !r.ok).length;
  const documented = allResults.filter((r) => !r.ok && isDocumentedFail(r.name)).length;
  const undocumented = allResults.filter((r) => !r.ok && !isDocumentedFail(r.name)).length;
  const total = allResults.length;

  console.log('\n=== RESUMEN GLOBAL ===');
  console.log(`Total:  ${total}`);
  console.log(`PASS:   ${pass}`);
  console.log(`FAIL:   ${fail}`);
  console.log(`  - documentados (GUI-only / requiere-externo): ${documented}`);
  console.log(`  - no documentados: ${undocumented}`);

  if (documented > 0) {
    console.log('\nFAILs documentados (no fallan el suite):');
    for (const r of allResults) {
      if (!r.ok && isDocumentedFail(r.name)) {
        const reason = isGuiOnly(r.name)
          ? 'GUI-only'
          : isRequiresExternal(r.name)
          ? 'requiere-externo'
          : 'documentado';
        console.log(`  [${reason}] ${r.name}`);
        if (r.text) console.log(`    ${r.text}`);
      }
    }
  }

  if (undocumented > 0) {
    console.log('\nFAILs no documentados:');
    for (const r of allResults) {
      if (!r.ok && !isDocumentedFail(r.name)) {
        console.log(`  [FAIL] ${r.source} / ${r.name}`);
        if (r.text) console.log(`    ${r.text}`);
      }
    }
  }

  const exitCode = undocumented > 0 ? 1 : 0;
  console.log(`\nSuite result: ${exitCode === 0 ? 'PASS' : 'FAIL'} (exit ${exitCode})`);
  process.exitCode = exitCode;
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exitCode = 1;
});
