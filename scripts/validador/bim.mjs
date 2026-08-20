// Validación del módulo BIM contra FreeCAD 1.1.3 headless.
// Cada tool corre en un proceso aislado (run-tool.mjs) para no contaminar el estado.

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(__dirname, 'run-tool.mjs');
const RESULTS_FILE = join(__dirname, '..', 'resultados', 'bim.txt');

const TOOLS = [
  {
    name: 'freecad_arch_wall',
    args: { length: 3000, width: 200, height: 3000, name: 'Wall' },
    setup: '',
  },
  {
    name: 'freecad_arch_structure',
    args: { structureType: 'column', length: 500, width: 500, height: 3000, name: 'Column' },
    setup: '',
  },
  {
    name: 'freecad_arch_window',
    args: { wallName: 'Wall', windowWidth: 1000, windowHeight: 1200, sillHeight: 900, name: 'Window' },
    setup: `
import FreeCAD, Arch
doc = FreeCAD.newDocument("bim_window")
wall = Arch.makeWall(None, length=3000, width=200, height=3000)
wall.Label = "Wall"
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`,
  },
  {
    name: 'freecad_arch_floor',
    args: { height: 3000, objectNames: ['Wall'], name: 'Level' },
    setup: `
import FreeCAD, Arch
doc = FreeCAD.newDocument("bim_floor")
wall = Arch.makeWall(None, length=3000, width=200, height=3000)
wall.Label = "Wall"
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`,
  },
  {
    name: 'freecad_arch_building',
    args: { floorNames: ['Level'], name: 'Building' },
    setup: `
import FreeCAD, Arch
doc = FreeCAD.newDocument("bim_building")
floor = Arch.makeFloor()
floor.Label = "Level"
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`,
  },
  {
    name: 'freecad_arch_site',
    args: { buildingNames: ['Building'], name: 'Site' },
    setup: `
import FreeCAD, Arch
doc = FreeCAD.newDocument("bim_site")
building = Arch.makeBuilding()
building.Label = "Building"
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`,
  },
  {
    name: 'freecad_arch_roof',
    args: { baseName: 'Wall', angle: 45, name: 'Roof' },
    setup: `
import FreeCAD, Arch
doc = FreeCAD.newDocument("bim_roof")
wall = Arch.makeWall(None, length=3000, width=200, height=3000)
wall.Label = "Wall"
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`,
  },
  {
    name: 'freecad_arch_stairs',
    args: { numberOfSteps: 10, totalHeight: 3000, width: 1000, name: 'Stairs' },
    setup: '',
  },
  {
    name: 'freecad_export_ifc',
    args: { filePath: '/tmp/opencode/bim.ifc', objectNames: ['Wall'] },
    setup: `
import FreeCAD, Arch
doc = FreeCAD.newDocument("bim_ifc")
wall = Arch.makeWall(None, length=3000, width=200, height=3000)
wall.Label = "Wall"
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`,
  },
];

function runTool(tool) {
  return new Promise((resolve) => {
    const child = spawn('node', [
      RUNNER,
      '--module', 'bim',
      '--tool', tool.name,
      '--args', JSON.stringify(tool.args),
      '--setup', tool.setup,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      let result;
      try {
        const line = stdout.trim().split('\n').pop();
        result = JSON.parse(line);
      } catch {
        result = {
          name: tool.name,
          ok: false,
          text: `Runner failed to produce JSON (exit ${code}). stdout: ${stdout.slice(0, 500)} stderr: ${stderr.slice(0, 500)}`,
          category: '[validación]',
        };
      }
      resolve(result);
    });
  });
}

async function main() {
  await mkdir(dirname(RESULTS_FILE), { recursive: true });
  const results = [];

  for (const tool of TOOLS) {
    const result = await runTool(tool);
    results.push(result);
    const status = result.ok ? 'PASS' : result.category;
    console.log(`[${status}] ${result.name}`);
    if (!result.ok) console.log(`        ${result.text}`);
  }

  const summary = [
    `BIM validation results (${new Date().toISOString()})`,
    `Total: ${results.length}`,
    `PASS: ${results.filter(r => r.ok).length}`,
    `FAIL: ${results.filter(r => !r.ok).length}`,
    '',
    ...results.map(r => {
      const status = r.ok ? 'PASS' : r.category;
      return `${status} ${r.name}${r.ok ? '' : '\n  ' + r.text}`;
    }),
  ].join('\n');

  await writeFile(RESULTS_FILE, summary);
  console.log(`\nResumen guardado en ${RESULTS_FILE}`);
}

main();
