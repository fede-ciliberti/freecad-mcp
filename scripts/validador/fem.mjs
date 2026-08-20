// Validación del módulo FEM contra FreeCAD 1.1.3 headless.
// Cada tool corre en un proceso aislado (run-tool.mjs) para no contaminar el estado.

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(__dirname, 'run-tool.mjs');
const RESULTS_FILE = join(__dirname, '..', 'resultados', 'fem.txt');

const BASE_SETUP = `
import FreeCAD, Part, ObjectsFem
doc = FreeCAD.newDocument("fem_val")
box = doc.addObject("Part::Box", "Box")
box.Length = 100
box.Width = 100
box.Height = 100
doc.recompute()
`;

const TOOLS = [
  {
    name: 'freecad_fem_analysis',
    args: { name: 'Analysis' },
    setup: BASE_SETUP,
  },
  {
    name: 'freecad_fem_material',
    args: { analysisName: 'Analysis', materialName: 'Steel', name: 'Material' },
    setup: BASE_SETUP + `
analysis = ObjectsFem.makeAnalysis(doc, "Analysis")
doc.recompute()
`,
  },
  {
    name: 'freecad_fem_constraint_fixed',
    args: { analysisName: 'Analysis', objectName: 'Box', references: ['Face1'], name: 'Fixed1' },
    setup: BASE_SETUP + `
analysis = ObjectsFem.makeAnalysis(doc, "Analysis")
doc.recompute()
`,
  },
  {
    name: 'freecad_fem_constraint_force',
    args: { analysisName: 'Analysis', objectName: 'Box', references: ['Face6'], force: 1000, directionZ: -1, name: 'Force1' },
    setup: BASE_SETUP + `
analysis = ObjectsFem.makeAnalysis(doc, "Analysis")
doc.recompute()
`,
  },
  {
    name: 'freecad_fem_constraint_pressure',
    args: { analysisName: 'Analysis', objectName: 'Box', references: ['Face2'], pressure: 10, name: 'Pressure1' },
    setup: BASE_SETUP + `
analysis = ObjectsFem.makeAnalysis(doc, "Analysis")
doc.recompute()
`,
  },
  {
    name: 'freecad_fem_mesh',
    args: { analysisName: 'Analysis', objectName: 'Box', maxElementSize: 20, meshOrder: 2, name: 'FEMMesh' },
    setup: BASE_SETUP + `
analysis = ObjectsFem.makeAnalysis(doc, "Analysis")
doc.recompute()
`,
  },
  {
    name: 'freecad_fem_solver',
    args: { analysisName: 'Analysis', solver: 'calculix', analysisType: 'static', run: false, name: 'Solver' },
    setup: BASE_SETUP + `
analysis = ObjectsFem.makeAnalysis(doc, "Analysis")
doc.recompute()
`,
  },
  {
    name: 'freecad_fem_results',
    args: { analysisName: 'Analysis' },
    setup: BASE_SETUP + `
analysis = ObjectsFem.makeAnalysis(doc, "Analysis")
doc.recompute()
`,
  },
];

function runTool(tool) {
  return new Promise((resolve) => {
    const child = spawn('node', [
      RUNNER,
      '--module', 'fem',
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
    `FEM validation results (${new Date().toISOString()})`,
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
