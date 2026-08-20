// Validación del módulo draft contra FreeCAD 1.1.3 headless.
// Cubre las 17 tools declaradas en DRAFT_TOOLS.
// Crea bocetos/wires y Part::Box según cada tool; cuando freecad_draft_wire
// falla por el bug de booleanos, se crea el wire de apoyo vía API directa
// para poder validar las tools dependientes (offset, path_array, upgrade).
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleDraftTool } from '../../dist/tools/draft.js';
import { handleDocumentTool } from '../../dist/tools/document.js';
import { handlePrimitiveTool } from '../../dist/tools/primitives.js';
import { writeFileSync } from 'node:fs';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleDraftTool, name, args);
const RDoc = (name, args) => runFull(bridge, handleDocumentTool, name, args);
const RPrim = (name, args) => runFull(bridge, handlePrimitiveTool, name, args);

const results = [];
const track = async (name, args) => {
  const r = await R(name, args);
  results.push(r);
  report(r);
  return r;
};

async function freshDoc(label) {
  await RDoc('freecad_new_document', { name: label });
}

async function makeBox(name, length = 10, width = 10, height = 10) {
  await RPrim('freecad_create_box', { length, width, height, name });
}

async function makeWire(name, points, closed = false) {
  const pts = points.map((p) => `FreeCAD.Vector(${p.x}, ${p.y}, ${p.z})`).join(', ');
  const r = await bridge.execute(`
doc = FreeCAD.ActiveDocument
import Draft
pts = [${pts}]
wire = Draft.make_wire(pts, closed=${closed ? 'True' : 'False'}, face=False)
wire.Label = ${JSON.stringify(name)}
doc.recompute()
_mcp_result["result"] = {"name": wire.Name}
`);
  return r.result?.name || name;
}

console.log('=== DRAFT vs FreeCAD 1.1.3 headless ===\n');

// 1. freecad_draft_wire — bug de booleano: genera 'false' en vez de 'False'
{
  console.log('--- freecad_draft_wire ---');
  await freshDoc('wire');
  await track('freecad_draft_wire', {
    points: [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
    ],
    closed: false,
  });
}

// 2. freecad_draft_bspline — bug de booleano
{
  console.log('\n--- freecad_draft_bspline ---');
  await freshDoc('bspline');
  await track('freecad_draft_bspline', {
    points: [
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 10, z: 0 },
      { x: 10, y: 0, z: 0 },
    ],
    closed: false,
  });
}

// 3. freecad_draft_polygon
{
  console.log('\n--- freecad_draft_polygon ---');
  await freshDoc('polygon');
  await track('freecad_draft_polygon', { sides: 6, radius: 5 });
}

// 4. freecad_draft_ellipse
{
  console.log('\n--- freecad_draft_ellipse ---');
  await freshDoc('ellipse');
  await track('freecad_draft_ellipse', { majorRadius: 10, minorRadius: 5 });
}

// 5. freecad_draft_rectangle
{
  console.log('\n--- freecad_draft_rectangle ---');
  await freshDoc('rectangle');
  await track('freecad_draft_rectangle', { width: 10, height: 5 });
}

// 6. freecad_draft_shapestring
{
  console.log('\n--- freecad_draft_shapestring ---');
  await freshDoc('shapestring');
  await track('freecad_draft_shapestring', { text: 'FreeCAD', size: 5 });
}

// 7. freecad_draft_clone
{
  console.log('\n--- freecad_draft_clone ---');
  await freshDoc('clone');
  await makeBox('BoxClone');
  await track('freecad_draft_clone', { objectNames: ['BoxClone'] });
}

// 8. freecad_draft_move — bug de booleano con copy=false (default)
{
  console.log('\n--- freecad_draft_move ---');
  await freshDoc('move');
  await makeBox('BoxMove');
  await track('freecad_draft_move', { objectNames: ['BoxMove'], x: 5, y: 2, z: 0 });
}

// 9. freecad_draft_rotate — bug de booleano con copy=false (default)
{
  console.log('\n--- freecad_draft_rotate ---');
  await freshDoc('rotate');
  await makeBox('BoxRotate');
  await track('freecad_draft_rotate', { objectNames: ['BoxRotate'], angle: 45 });
}

// 10. freecad_draft_scale — bug de booleano con copy=true (default)
{
  console.log('\n--- freecad_draft_scale ---');
  await freshDoc('scale');
  await makeBox('BoxScale');
  await track('freecad_draft_scale', { objectNames: ['BoxScale'], scaleX: 2 });
}

// 11. freecad_draft_offset — necesita un wire; usamos API directa porque draft_wire falla
{
  console.log('\n--- freecad_draft_offset ---');
  await freshDoc('offset');
  const wireName = await makeWire(
    'BaseWire',
    [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 0, y: 10, z: 0 },
    ],
    true,
  );
  await track('freecad_draft_offset', { objectName: wireName, distance: 1 });
}

// 12. freecad_draft_upgrade — necesita un wire cerrado
{
  console.log('\n--- freecad_draft_upgrade ---');
  await freshDoc('upgrade');
  const wireName = await makeWire(
    'Wire1',
    [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 0, y: 10, z: 0 },
    ],
    true,
  );
  await track('freecad_draft_upgrade', { objectNames: [wireName] });
}

// 13. freecad_draft_downgrade — necesita un sólido
{
  console.log('\n--- freecad_draft_downgrade ---');
  await freshDoc('downgrade');
  await makeBox('BoxDowngrade');
  await track('freecad_draft_downgrade', { objectNames: ['BoxDowngrade'] });
}

// 14. freecad_draft_path_array — necesita un objeto + path wire
{
  console.log('\n--- freecad_draft_path_array ---');
  await freshDoc('patharr');
  await makeBox('ArrObj', 2, 2, 2);
  const pathName = await makeWire(
    'ArrPath',
    [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 10 },
      { x: 10, y: 0, z: 20 },
    ],
    false,
  );
  await track('freecad_draft_path_array', { objectName: 'ArrObj', pathName, count: 3 });
}

// 15. freecad_draft_dimension
{
  console.log('\n--- freecad_draft_dimension ---');
  await freshDoc('dimension');
  await track('freecad_draft_dimension', { point1X: 0, point1Y: 0, point2X: 10, point2Y: 0 });
}

// 16. freecad_draft_shape2dview — necesita un objeto 3D
{
  console.log('\n--- freecad_draft_shape2dview ---');
  await freshDoc('shape2d');
  await makeBox('Box2D');
  await track('freecad_draft_shape2dview', { objectName: 'Box2D' });
}

// 17. freecad_draft_facebinder — necesita un objeto con caras
{
  console.log('\n--- freecad_draft_facebinder ---');
  await freshDoc('facebinder');
  await makeBox('BoxFb');
  await track('freecad_draft_facebinder', { objectName: 'BoxFb', faceNames: ['Face1'] });
}

// --- Resumen ---
console.log('\n=== RESUMEN DRAFT ===');
const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`PASS: ${pass} / FAIL: ${fail} / TOTAL: ${results.length}`);

const lines = results.map((r) => {
  if (r.ok) return `[PASS] ${r.name}`;
  const text = r.text.replace(/^FreeCAD error:\s*/, '').slice(0, 300);
  return `[FAIL] ${r.name} — ${text}`;
});
writeFileSync(
  '/home/fciliberti/Trabajos/Tools/freecad-mcp/scripts/resultados/draft.txt',
  lines.join('\n') + '\n',
);
console.log('\nResultados guardados en scripts/resultados/draft.txt');

bridge.destroy();
