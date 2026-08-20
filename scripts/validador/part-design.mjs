// Validación del módulo part-design contra FreeCAD 1.1.3 headless.
// Cubre las 20 tools declaradas en PART_DESIGN_TOOLS.
// Estrategia: cada test arranca en un documento limpio. Cuando una tool
// depende de un sólido base y freecad_pad está roto (Symmetric), se crea el
// pad base vía API directa para poder validar la tool dependiente.
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handlePartDesignTool } from '../../dist/tools/part-design.js';
import { handleSketcherTool } from '../../dist/tools/sketcher.js';
import { handleDocumentTool } from '../../dist/tools/document.js';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handlePartDesignTool, name, args);
const RSk = (name, args) => runFull(bridge, handleSketcherTool, name, args);
const RDoc = (name, args) => runFull(bridge, handleDocumentTool, name, args);

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

async function makeRectSketch(skName, x1, y1, x2, y2) {
  await RSk('freecad_create_sketch', { name: skName, plane: 'XY' });
  await RSk('freecad_add_sketch_rectangle', { sketchName: skName, x1, y1, x2, y2 });
  await RSk('freecad_close_sketch', { sketchName: skName });
}

async function makeCircleSketch(skName, cx, cy, r) {
  await RSk('freecad_create_sketch', { name: skName, plane: 'XY' });
  await RSk('freecad_add_sketch_circle', { sketchName: skName, centerX: cx, centerY: cy, radius: r });
  await RSk('freecad_close_sketch', { sketchName: skName });
}

// Crea un Pad base usando API directa de FreeCAD porque freecad_pad falla en 1.1.3.
// Devuelve el nombre del Tip (última feature sólida del Body).
async function makeBasePad(skName, length) {
  await makeRectSketch(skName, 0, 0, 10, 10);
  const r = await R('freecad_pad', { sketchName: skName, length });
  if (r.ok) {
    const tipRes = await bridge.execute(`
doc = FreeCAD.ActiveDocument
body = None
for o in doc.Objects:
    if o.TypeId == "PartDesign::Body":
        body = o
        break
_mcp_result["result"] = {"tip": body.Tip.Name if body and body.Tip else None}
`);
    return tipRes.result?.tip || 'Pad';
  }
  // Fallback: pad roto, crear el sólido base a mano para seguir validando dependientes.
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
sk = doc.getObject(${JSON.stringify(skName)})
body = None
for o in doc.Objects:
    if o.TypeId == "PartDesign::Body":
        body = o
        break
if body is None:
    body = doc.addObject("PartDesign::Body", "Body")
if sk not in body.Group:
    body.addObject(sk)
pad = doc.addObject("PartDesign::Pad", "Pad")
pad.Profile = sk
pad.Length = ${length}
pad.Reversed = False
body.addObject(pad)
doc.recompute()
_mcp_result["result"] = {"name": pad.Name, "tip": body.Tip.Name}
`);
  return 'Pad';
}

console.log('=== PART-DESIGN vs FreeCAD 1.1.3 headless ===\n');

// 1. freecad_pad — bug conocido: pad.Symmetric
{
  console.log('--- freecad_pad ---');
  await freshDoc('pad');
  await makeRectSketch('Sk', 0, 0, 10, 10);
  await track('freecad_pad', { sketchName: 'Sk', length: 5 });
}

// 2. freecad_pocket — necesita sólido base + sketch de perfil
{
  console.log('\n--- freecad_pocket ---');
  await freshDoc('pocket');
  const tip = await makeBasePad('SkP', 10);
  await makeCircleSketch('SkPocket', 5, 5, 2);
  await track('freecad_pocket', { sketchName: 'SkPocket', depth: 3 });
}

// 3. freecad_revolve
{
  console.log('\n--- freecad_revolve ---');
  await freshDoc('revolve');
  await makeRectSketch('SkR', 20, 0, 30, 10);
  await track('freecad_revolve', { sketchName: 'SkR', angle: 360, axisX: 0, axisY: 1, axisZ: 0 });
}

// 4. freecad_loft
{
  console.log('\n--- freecad_loft ---');
  await freshDoc('loft');
  await makeRectSketch('Sk1', 0, 0, 10, 10);
  await makeRectSketch('Sk2', 5, 5, 15, 15);
  await track('freecad_loft', { sketchNames: ['Sk1', 'Sk2'], solid: true });
}

// 5. freecad_sweep
{
  console.log('\n--- freecad_sweep ---');
  await freshDoc('sweep');
  await makeRectSketch('SkProf', 0, 0, 5, 5);
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
import Part
w = doc.addObject("Part::Feature", "Path")
w.Shape = Part.makePolygon([FreeCAD.Vector(0,0,0), FreeCAD.Vector(0,0,20), FreeCAD.Vector(10,0,30)])
doc.recompute()
_mcp_result["result"] = {"name": w.Name}
`);
  await track('freecad_sweep', { profileName: 'SkProf', pathName: 'Path', solid: true });
}

// 6. freecad_partdesign_fillet — bug conocido: Quantity / Base
{
  console.log('\n--- freecad_partdesign_fillet ---');
  await freshDoc('fillet');
  const tip = await makeBasePad('SkF', 10);
  await track('freecad_partdesign_fillet', { objectName: tip, radius: 1 });
}

// 7. freecad_partdesign_chamfer — bug conocido: Quantity / Base
{
  console.log('\n--- freecad_partdesign_chamfer ---');
  await freshDoc('chamfer');
  const tip = await makeBasePad('SkC', 10);
  await track('freecad_partdesign_chamfer', { objectName: tip, size: 1 });
}

// 8. freecad_hole — bug conocido: Missing container body / no base set
{
  console.log('\n--- freecad_hole ---');
  await freshDoc('hole');
  const tip = await makeBasePad('SkH', 10);
  await makeCircleSketch('SkHole', 5, 5, 4.25);
  await track('freecad_hole', { sketchName: 'SkHole', diameter: 8.5, depth: 0 });
}

// 9. freecad_partdesign_thickness
{
  console.log('\n--- freecad_partdesign_thickness ---');
  await freshDoc('thickness');
  const tip = await makeBasePad('SkT', 10);
  await track('freecad_partdesign_thickness', { objectName: tip, thickness: 2, faceNames: ['Face6'] });
}

// 10. freecad_linear_pattern
{
  console.log('\n--- freecad_linear_pattern ---');
  await freshDoc('linpat');
  const tip = await makeBasePad('SkLP', 10);
  await track('freecad_linear_pattern', { featureName: tip, directionAxis: 'x', length: 20, occurrences: 3 });
}

// 11. freecad_polar_pattern
{
  console.log('\n--- freecad_polar_pattern ---');
  await freshDoc('polpat');
  const tip = await makeBasePad('SkPP', 10);
  await track('freecad_polar_pattern', { featureName: tip, axis: 'z', angle: 360, occurrences: 4 });
}

// 12. freecad_partdesign_mirrored
{
  console.log('\n--- freecad_partdesign_mirrored ---');
  await freshDoc('mirror');
  const tip = await makeBasePad('SkM', 10);
  await track('freecad_partdesign_mirrored', { featureName: tip, plane: 'YZ' });
}

// 13. freecad_additive_helix
{
  console.log('\n--- freecad_additive_helix ---');
  await freshDoc('addhelix');
  await makeCircleSketch('SkAH', 0, 0, 1);
  await track('freecad_additive_helix', { sketchName: 'SkAH', pitch: 2, height: 10 });
}

// 14. freecad_subtractive_helix
{
  console.log('\n--- freecad_subtractive_helix ---');
  await freshDoc('subhelix');
  const tip = await makeBasePad('SkSH', 10);
  await makeCircleSketch('SkSH2', 5, 5, 1);
  await track('freecad_subtractive_helix', { sketchName: 'SkSH2', pitch: 2, height: 8 });
}

// 15. freecad_additive_pipe
{
  console.log('\n--- freecad_additive_pipe ---');
  await freshDoc('addpipe');
  await makeCircleSketch('SkAP', 0, 0, 2);
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
import Part
w = doc.addObject("Part::Feature", "Spine")
w.Shape = Part.makePolygon([FreeCAD.Vector(0,0,0), FreeCAD.Vector(0,0,10), FreeCAD.Vector(10,0,20)])
doc.recompute()
_mcp_result["result"] = {"name": w.Name}
`);
  await track('freecad_additive_pipe', { profileName: 'SkAP', spineName: 'Spine' });
}

// 16. freecad_subtractive_pipe
{
  console.log('\n--- freecad_subtractive_pipe ---');
  await freshDoc('subpipe');
  const tip = await makeBasePad('SkSP', 10);
  await makeCircleSketch('SkSP2', 5, 5, 1);
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
import Part
w = doc.addObject("Part::Feature", "Spine2")
w.Shape = Part.makePolygon([FreeCAD.Vector(5,5,0), FreeCAD.Vector(5,5,8)])
doc.recompute()
_mcp_result["result"] = {"name": w.Name}
`);
  await track('freecad_subtractive_pipe', { profileName: 'SkSP2', spineName: 'Spine2' });
}

// 17. freecad_groove
{
  console.log('\n--- freecad_groove ---');
  await freshDoc('groove');
  const tip = await makeBasePad('SkG', 10);
  await makeRectSketch('SkG2', 12, 5, 15, 7);
  await track('freecad_groove', { sketchName: 'SkG2', angle: 360, axisX: 0, axisY: 1, axisZ: 0 });
}

// 18. freecad_draft_angle
{
  console.log('\n--- freecad_draft_angle ---');
  await freshDoc('draftang');
  const tip = await makeBasePad('SkDA', 10);
  await track('freecad_draft_angle', { featureName: tip, faceNames: ['Face2'], angle: 5 });
}

// 19. freecad_multi_transform
{
  console.log('\n--- freecad_multi_transform ---');
  await freshDoc('multitr');
  const tip = await makeBasePad('SkMT', 10);
  const mir = await R('freecad_partdesign_mirrored', { featureName: tip, plane: 'YZ' });
  let mirName = 'Mirrored';
  if (mir.ok) {
    try {
      const m = JSON.parse(mir.text);
      mirName = m.name || 'Mirrored';
    } catch {}
  }
  await track('freecad_multi_transform', { featureName: tip, transformNames: [mirName] });
}

// 20. freecad_shape_binder
{
  console.log('\n--- freecad_shape_binder ---');
  await freshDoc('shapeb');
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
b = doc.addObject("Part::Box", "ExtBox")
b.Length = 10; b.Width = 10; b.Height = 10
doc.recompute()
_mcp_result["result"] = {"name": b.Name}
`);
  await track('freecad_shape_binder', { objectName: 'ExtBox', subElements: ['Face1'] });
}

// --- Resumen ---
console.log('\n=== RESUMEN PART-DESIGN ===');
const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`PASS: ${pass} / FAIL: ${fail} / TOTAL: ${results.length}`);

import { writeFileSync } from 'node:fs';
const lines = results.map((r) => {
  if (r.ok) return `[PASS] ${r.name}`;
  const text = r.text.replace(/^FreeCAD error:\s*/, '').slice(0, 300);
  return `[FAIL] ${r.name} — ${text}`;
});
writeFileSync(
  '/home/fciliberti/Trabajos/Tools/freecad-mcp/scripts/resultados/part-design.txt',
  lines.join('\n') + '\n',
);
console.log('\nResultados guardados en scripts/resultados/part-design.txt');

bridge.destroy();
