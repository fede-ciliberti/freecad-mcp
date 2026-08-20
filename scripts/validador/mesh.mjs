// Validación del módulo mesh contra FreeCAD 1.1.3 headless.
// Cubre TODAS las tools listadas en MESH_TOOLS.
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleMeshTool, MESH_TOOLS } from '../../dist/tools/mesh.js';
import * as fs from 'fs';
import * as path from 'path';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleMeshTool, name, args);

const results = [];

async function test(name, args) {
  const res = await R(name, args);
  report(res);
  results.push(res);
  return res;
}

// Preparar documento con dos sólidos para operaciones de malla
await bridge.execute(`
doc = FreeCAD.newDocument("ValMesh")
b1 = doc.addObject("Part::Box", "Box")
b1.Length = 10; b1.Width = 10; b1.Height = 10
b2 = doc.addObject("Part::Box", "Box2")
b2.Length = 10; b2.Width = 10; b2.Height = 10
b2.Placement.Base = FreeCAD.Vector(5, 5, 0)
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);

// Mapa de pruebas: cada tool del array debe tener una entrada aquí.
const tests = [
  { name: 'freecad_mesh_from_shape', args: { objectName: 'Box', name: 'MeshBox' } },
  { name: 'freecad_mesh_from_shape', args: { objectName: 'Box2', name: 'MeshBox2' } },
  { name: 'freecad_mesh_to_shape', args: { meshName: 'MeshBox', sewing: true, name: 'ShapeFromMesh' } },
  { name: 'freecad_mesh_repair', args: { meshName: 'MeshBox', fillHoles: true, removeDuplicates: true, fixNormals: true } },
  { name: 'freecad_mesh_decimate', args: { meshName: 'MeshBox', targetReduction: 0.5 } },
  { name: 'freecad_mesh_refine', args: { meshName: 'MeshBox', maxEdgeLength: 5.0 } },
  { name: 'freecad_mesh_info', args: { meshName: 'MeshBox' } },
  { name: 'freecad_mesh_boolean', args: { mesh1Name: 'MeshBox', mesh2Name: 'MeshBox2', operation: 'union', name: 'MeshUnion' } },
];

// Verificar cobertura total contra MESH_TOOLS
const toolNames = new Set(MESH_TOOLS.map(t => t.name));
const testedNames = new Set(tests.map(t => t.name));
const missing = [...toolNames].filter(n => !testedNames.has(n));
if (missing.length > 0) {
  console.error(`[ERROR] Faltan tools en el validador de mesh: ${missing.join(', ')}`);
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

fs.writeFileSync(path.join(outDir, 'mesh.txt'), summaryLines.join('\n') + '\n');
console.log('\n--- Resumen guardado en scripts/resultados/mesh.txt ---');
