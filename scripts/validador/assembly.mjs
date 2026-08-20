// Validación del módulo Assembly contra FreeCAD 1.1.3 headless.
// Cada tool corre en un proceso aislado (run-tool.mjs) para no contaminar el estado.

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(__dirname, 'run-tool.mjs');
const RESULTS_FILE = join(__dirname, '..', 'resultados', 'assembly.txt');

const BASE_SETUP = `
import FreeCAD, Part
doc = FreeCAD.newDocument("asm_val")
box1 = doc.addObject("Part::Box", "Box1")
box1.Length = 100
box1.Width = 100
box1.Height = 100
box2 = doc.addObject("Part::Box", "Box2")
box2.Length = 100
box2.Width = 100
box2.Height = 100
box2.Placement.Base = FreeCAD.Vector(150, 0, 0)
doc.recompute()
`;

const ASM_SETUP = BASE_SETUP + `
assembly = doc.addObject("Assembly::AssemblyObject", "Assembly")
doc.recompute()
`;

const ASM_WITH_LINKS_SETUP = BASE_SETUP + `
assembly = doc.addObject("Assembly::AssemblyObject", "Assembly")
link1 = doc.addObject("App::Link", "Box1_Link")
link1.LinkedObject = box1
link2 = doc.addObject("App::Link", "Box2_Link")
link2.LinkedObject = box2
assembly.addObject(link1)
assembly.addObject(link2)
doc.recompute()
`;

const TOOLS = [
  {
    name: 'freecad_assembly_create',
    args: { name: 'Assembly' },
    setup: '',
  },
  {
    name: 'freecad_assembly_insert_component',
    args: { assemblyName: 'Assembly', objectName: 'Box1', x: 0, y: 0, z: 0 },
    setup: ASM_SETUP,
  },
  {
    name: 'freecad_assembly_toggle_grounded',
    args: { assemblyName: 'Assembly', componentName: 'Box1_Link' },
    setup: ASM_WITH_LINKS_SETUP,
  },
  {
    name: 'freecad_assembly_fixed_joint',
    args: { assemblyName: 'Assembly', component1: 'Box1_Link', element1: 'Face1', component2: 'Box2_Link', element2: 'Face2', name: 'FixedJoint' },
    setup: ASM_WITH_LINKS_SETUP,
  },
  {
    name: 'freecad_assembly_revolute_joint',
    args: { assemblyName: 'Assembly', component1: 'Box1_Link', element1: 'Face3', component2: 'Box2_Link', element2: 'Face4', name: 'RevoluteJoint' },
    setup: ASM_WITH_LINKS_SETUP,
  },
  {
    name: 'freecad_assembly_slider_joint',
    args: { assemblyName: 'Assembly', component1: 'Box1_Link', element1: 'Face1', component2: 'Box2_Link', element2: 'Face2', name: 'SliderJoint' },
    setup: ASM_WITH_LINKS_SETUP,
  },
  {
    name: 'freecad_assembly_cylindrical_joint',
    args: { assemblyName: 'Assembly', component1: 'Box1_Link', element1: 'Face3', component2: 'Box2_Link', element2: 'Face4', name: 'CylindricalJoint' },
    setup: ASM_WITH_LINKS_SETUP,
  },
  {
    name: 'freecad_assembly_ball_joint',
    args: { assemblyName: 'Assembly', component1: 'Box1_Link', element1: 'Vertex1', component2: 'Box2_Link', element2: 'Vertex2', name: 'BallJoint' },
    setup: ASM_WITH_LINKS_SETUP,
  },
  {
    name: 'freecad_assembly_distance_joint',
    args: { assemblyName: 'Assembly', component1: 'Box1_Link', element1: 'Face1', component2: 'Box2_Link', element2: 'Face2', distance: 50, name: 'DistanceJoint' },
    setup: ASM_WITH_LINKS_SETUP,
  },
  {
    name: 'freecad_assembly_solve',
    args: { assemblyName: 'Assembly' },
    setup: ASM_WITH_LINKS_SETUP,
  },
];

function runTool(tool) {
  return new Promise((resolve) => {
    const child = spawn('node', [
      RUNNER,
      '--module', 'assembly',
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
    `Assembly validation results (${new Date().toISOString()})`,
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
