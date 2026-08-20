// Validación del módulo import-export contra FreeCAD 1.1.3 headless.
// Cubre las 16 tools declaradas en IMPORT_EXPORT_TOOLS.
// Crea archivos reales de prueba en /tmp/opencode/ y luego importa/exporta.
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleImportExportTool } from '../../dist/tools/import-export.js';
import { handleDocumentTool } from '../../dist/tools/document.js';
import { handlePrimitiveTool } from '../../dist/tools/primitives.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleImportExportTool, name, args);
const RDoc = (name, args) => runFull(bridge, handleDocumentTool, name, args);
const RPrim = (name, args) => runFull(bridge, handlePrimitiveTool, name, args);

const results = [];
const track = async (name, args) => {
  const r = await R(name, args);
  results.push(r);
  report(r);
  return r;
};

const TMP_DIR = '/tmp/opencode';
mkdirSync(TMP_DIR, { recursive: true });

async function freshDoc(label) {
  await RDoc('freecad_new_document', { name: label });
}

async function makeBox(name, length = 10, width = 10, height = 10) {
  await RPrim('freecad_create_box', { length, width, height, name });
}

console.log('=== IMPORT-EXPORT vs FreeCAD 1.1.3 headless ===\n');

// 1. freecad_execute_python
{
  console.log('--- freecad_execute_python ---');
  await freshDoc('py');
  await track('freecad_execute_python', {
    code: '_mcp_result["result"] = {"executed": True, "value": 42}',
  });
}

// 2. freecad_export_step
{
  console.log('\n--- freecad_export_step ---');
  await freshDoc('estep');
  await makeBox('BoxStep');
  await track('freecad_export_step', {
    objectNames: ['BoxStep'],
    filePath: `${TMP_DIR}/fcval.step`,
  });
}

// 3. freecad_export_stl
{
  console.log('\n--- freecad_export_stl ---');
  await freshDoc('estl');
  await makeBox('BoxStl');
  await track('freecad_export_stl', {
    objectNames: ['BoxStl'],
    filePath: `${TMP_DIR}/fcval.stl`,
  });
}

// 4. freecad_import_step
{
  console.log('\n--- freecad_import_step ---');
  await freshDoc('istep');
  await track('freecad_import_step', {
    filePath: `${TMP_DIR}/fcval.step`,
  });
}

// 5. freecad_import_stl
{
  console.log('\n--- freecad_import_stl ---');
  await freshDoc('istl');
  await track('freecad_import_stl', {
    filePath: `${TMP_DIR}/fcval.stl`,
  });
}

// 6. freecad_export_obj
{
  console.log('\n--- freecad_export_obj ---');
  await freshDoc('eobj');
  await makeBox('BoxObj');
  await track('freecad_export_obj', {
    objectNames: ['BoxObj'],
    filePath: `${TMP_DIR}/fcval.obj`,
  });
}

// 7. freecad_export_iges
{
  console.log('\n--- freecad_export_iges ---');
  await freshDoc('eiges');
  await makeBox('BoxIges');
  await track('freecad_export_iges', {
    objectNames: ['BoxIges'],
    filePath: `${TMP_DIR}/fcval.iges`,
  });
}

// 8. freecad_import_iges
{
  console.log('\n--- freecad_import_iges ---');
  await freshDoc('iiges');
  await track('freecad_import_iges', {
    filePath: `${TMP_DIR}/fcval.iges`,
  });
}

// 9. freecad_export_brep
{
  console.log('\n--- freecad_export_brep ---');
  await freshDoc('ebrep');
  await makeBox('BoxBrep');
  await track('freecad_export_brep', {
    objectName: 'BoxBrep',
    filePath: `${TMP_DIR}/fcval.brep`,
  });
}

// 10. freecad_export_dxf (necesita geometría 2D; exportamos una cara del box)
{
  console.log('\n--- freecad_export_dxf ---');
  await freshDoc('edxf');
  await makeBox('BoxDxf');
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
box = doc.getObject("BoxDxf")
face = box.Shape.Faces[0]
wire = doc.addObject("Part::Feature", "WireDxf")
wire.Shape = face
wire.Placement = FreeCAD.Placement(FreeCAD.Vector(0,0,0), FreeCAD.Rotation(FreeCAD.Vector(0,0,1),0))
doc.recompute()
_mcp_result["result"] = {"name": wire.Name}
`);
  await track('freecad_export_dxf', {
    objectNames: ['WireDxf'],
    filePath: `${TMP_DIR}/fcval.dxf`,
  });
}

// 11. freecad_import_dxf
{
  console.log('\n--- freecad_import_dxf ---');
  await freshDoc('idxf');
  await track('freecad_import_dxf', {
    filePath: `${TMP_DIR}/fcval.dxf`,
  });
}

// 12. freecad_export_svg
{
  console.log('\n--- freecad_export_svg ---');
  await freshDoc('esvg');
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
import Part
# Create a proper 2D rectangle with non-zero area for SVG export
wire = doc.addObject("Part::Feature", "WireSvg")
wire.Shape = Part.makePolygon([
    FreeCAD.Vector(0, 0, 0),
    FreeCAD.Vector(10, 0, 0),
    FreeCAD.Vector(10, 10, 0),
    FreeCAD.Vector(0, 10, 0),
    FreeCAD.Vector(0, 0, 0)
])
doc.recompute()
_mcp_result["result"] = {"name": wire.Name}
`);
  await track('freecad_export_svg', {
    objectNames: ['WireSvg'],
    filePath: `${TMP_DIR}/fcval.svg`,
  });
}

// 13. freecad_import_svg
{
  console.log('\n--- freecad_import_svg ---');
  await freshDoc('isvg');
  await track('freecad_import_svg', {
    filePath: `${TMP_DIR}/fcval.svg`,
  });
}

// 14. freecad_measure_distance
{
  console.log('\n--- freecad_measure_distance ---');
  await freshDoc('dist');
  await track('freecad_measure_distance', {
    point1: { x: 0, y: 0, z: 0 },
    point2: { x: 10, y: 0, z: 0 },
  });
}

// 15. freecad_measure_angle
{
  console.log('\n--- freecad_measure_angle ---');
  await freshDoc('angle');
  await makeBox('BoxAngle');
  await track('freecad_measure_angle', {
    objectName: 'BoxAngle',
    face1: 'Face1',
    face2: 'Face2',
  });
}

// 16. freecad_get_volume
{
  console.log('\n--- freecad_get_volume ---');
  await freshDoc('vol');
  await makeBox('BoxVol');
  await track('freecad_get_volume', { objectName: 'BoxVol' });
}

// 17. freecad_get_bounding_box
{
  console.log('\n--- freecad_get_bounding_box ---');
  await freshDoc('bb');
  await makeBox('BoxBb');
  await track('freecad_get_bounding_box', { objectName: 'BoxBb' });
}

// --- Resumen ---
console.log('\n=== RESUMEN IMPORT-EXPORT ===');
const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`PASS: ${pass} / FAIL: ${fail} / TOTAL: ${results.length}`);

const lines = results.map((r) => {
  if (r.ok) return `[PASS] ${r.name}`;
  const text = r.text.replace(/^FreeCAD error:\s*/, '').slice(0, 300);
  return `[FAIL] ${r.name} — ${text}`;
});
writeFileSync(
  path.resolve('scripts/resultados/import-export.txt'),
  lines.join('\n') + '\n',
);
console.log('\nResultados guardados en scripts/resultados/import-export.txt');

bridge.destroy();
