// Validación del módulo advanced-operations contra FreeCAD 1.1.3 headless.
// Cubre TODAS las tools listadas en ADVANCED_OPERATION_TOOLS.
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleAdvancedOperationTool, ADVANCED_OPERATION_TOOLS } from '../../dist/tools/advanced-operations.js';
import * as fs from 'fs';
import * as path from 'path';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleAdvancedOperationTool, name, args);

const results = [];

async function test(name, args) {
  const res = await R(name, args);
  report(res);
  results.push(res);
  return res;
}

// Preparar documento con objetos base: sólidos y una cara para extrude
await bridge.execute(`
doc = FreeCAD.newDocument("ValAdvOps")
b = doc.addObject("Part::Box", "Box")
b.Length = 10; b.Width = 10; b.Height = 10

c = doc.addObject("Part::Cylinder", "Cylinder")
c.Radius = 5; c.Height = 10

face = doc.addObject("Part::Plane", "Face")
face.Length = 10; face.Width = 10

doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);

// Mapa de pruebas: cada tool del array debe tener una entrada aquí.
const tests = [
  { name: 'freecad_thickness', args: { objectName: 'Box', thickness: -1, faceNames: ['Face6'], name: 'BoxThickness' } },
  { name: 'freecad_offset_3d', args: { objectName: 'Box', distance: 2, name: 'BoxOffset' } },
  { name: 'freecad_section', args: { objectName: 'Box', plane: 'XY', offset: 5, name: 'BoxSection' } },
  { name: 'freecad_compound', args: { objectNames: ['Box', 'Cylinder'], name: 'Comp' } },
  { name: 'freecad_linear_array', args: { objectName: 'Box', directionX: 20, directionY: 0, directionZ: 0, count: 3, name: 'LinArr' } },
  { name: 'freecad_polar_array', args: { objectName: 'Box', count: 4, angle: 360, axisX: 0, axisY: 0, axisZ: 1, name: 'PolArr' } },
  { name: 'freecad_scale_object', args: { objectName: 'Box', scaleX: 2.0, scaleY: 2.0, scaleZ: 2.0, name: 'ScaledBox' } },
  { name: 'freecad_extrude', args: { objectName: 'Face', dirX: 0, dirY: 0, dirZ: 10, solid: true, name: 'Extrusion' } },
  { name: 'freecad_get_center_of_mass', args: { objectName: 'Box' } },
  { name: 'freecad_get_face_info', args: { objectName: 'Box', faceIndex: 1 } },
  { name: 'freecad_get_face_info', args: { objectName: 'Box' } },
  { name: 'freecad_get_edge_info', args: { objectName: 'Box', edgeIndex: 1 } },
  { name: 'freecad_get_edge_info', args: { objectName: 'Box' } },
];

// Verificar cobertura total contra ADVANCED_OPERATION_TOOLS
const toolNames = new Set(ADVANCED_OPERATION_TOOLS.map(t => t.name));
const testedNames = new Set(tests.map(t => t.name));
const missing = [...toolNames].filter(n => !testedNames.has(n));
if (missing.length > 0) {
  console.error(`[ERROR] Faltan tools en el validador de advanced-operations: ${missing.join(', ')}`);
  process.exitCode = 1;
}

for (const t of tests) {
  await test(t.name, t.args);
}

bridge.destroy();

// Guardar resultados
const outDir = 'scripts/resultados';
fs.mkdirSync(outDir, { recursive: true });
const summaryLines = results.map(r => {
  const status = r.ok ? 'PASS' : 'FAIL';
  return `[${status}] ${r.name}${r.ok ? '' : '\n  Error: ' + r.text}`;
});

fs.writeFileSync(path.join(outDir, 'advanced-operations.txt'), summaryLines.join('\n') + '\n');
console.log('\n--- Resumen guardado en scripts/resultados/advanced-operations.txt ---');
