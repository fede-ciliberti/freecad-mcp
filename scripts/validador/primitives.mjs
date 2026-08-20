// Validación del módulo primitives contra FreeCAD 1.1.3 headless.
import fs from 'node:fs';
import path from 'node:path';
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handlePrimitiveTool, PRIMITIVE_TOOLS } from '../../dist/tools/primitives.js';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handlePrimitiveTool, name, args);

const results = [];

async function runTest(name, args) {
  const res = await R(name, args);
  report(res);
  results.push(res);
  return res;
}

try {
  // Asegurar que exista un documento activo
  await bridge.execute('if FreeCAD.ActiveDocument is None: FreeCAD.newDocument("PrimDoc")');

  const tests = [
    ['freecad_create_box', { length: 10, width: 20, height: 30, name: 'TestBox' }],
    ['freecad_create_cylinder', { radius: 5, height: 20, name: 'TestCylinder' }],
    ['freecad_create_sphere', { radius: 10, name: 'TestSphere' }],
    ['freecad_create_cone', { radius1: 10, radius2: 5, height: 20, name: 'TestCone' }],
    ['freecad_create_torus', { radius1: 20, radius2: 5, name: 'TestTorus' }],
    [
      'freecad_create_wedge',
      {
        xmin: 0,
        ymin: 0,
        zmin: 0,
        x2min: 2,
        z2min: 2,
        xmax: 10,
        ymax: 10,
        zmax: 10,
        x2max: 8,
        z2max: 8,
        name: 'TestWedge',
      },
    ],
    ['freecad_create_helix', { pitch: 5, height: 20, radius: 10, angle: 0, leftHanded: false, name: 'TestHelix' }],
    ['freecad_create_spiral', { growth: 2, rotations: 3, radius: 5, name: 'TestSpiral' }],
    ['freecad_create_ellipsoid', { radius1: 10, radius2: 15, radius3: 20, name: 'TestEllipsoid' }],
    ['freecad_create_tube', { outerRadius: 10, innerRadius: 5, height: 20, name: 'TestTube' }],
    ['freecad_create_prism', { sides: 6, radius: 10, height: 20, name: 'TestPrism' }],
  ];

  // Verificar cobertura total de PRIMITIVE_TOOLS
  const testedNames = new Set(tests.map(([name]) => name));
  const expectedTools = PRIMITIVE_TOOLS.map(t => t.name);
  for (const toolName of expectedTools) {
    if (!testedNames.has(toolName)) {
      throw new Error(`Falta test para la tool: ${toolName}`);
    }
  }

  for (const [name, args] of tests) {
    await runTest(name, args);
  }
} finally {
  bridge.destroy();
}

// Guardar resultados en scripts/resultados/primitives.txt
const outputLines = results.map(r => {
  const status = r.ok ? 'PASS' : 'FAIL';
  let line = `[${status}] ${r.name}`;
  if (!r.ok) {
    line += `\n        ${r.text}`;
  }
  return line;
});

const resPath = path.resolve('scripts/resultados/primitives.txt');
fs.writeFileSync(resPath, outputLines.join('\n') + '\n', 'utf-8');
console.log(`\nResumen guardado en ${resPath}`);
