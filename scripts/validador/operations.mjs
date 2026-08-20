// Validación del módulo operations contra FreeCAD 1.1.3 headless.
import fs from 'node:fs';
import path from 'node:path';
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleOperationTool, OPERATION_TOOLS } from '../../dist/tools/operations.js';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleOperationTool, name, args);

const results = [];

async function runTest(name, args) {
  const res = await R(name, args);
  report(res);
  results.push(res);
  return res;
}

async function resetDoc() {
  // Crear un documento limpio con objetos base para las operaciones
  await bridge.execute(`
if FreeCAD.ActiveDocument is not None:
    FreeCAD.closeDocument(FreeCAD.ActiveDocument.Name)
doc = FreeCAD.newDocument("OpsDoc")
box1 = doc.addObject("Part::Box", "Box1")
box1.Length = 10; box1.Width = 10; box1.Height = 10
box2 = doc.addObject("Part::Box", "Box2")
box2.Length = 10; box2.Width = 10; box2.Height = 10
box2.Placement.Base = FreeCAD.Vector(5, 5, 0)
cyl1 = doc.addObject("Part::Cylinder", "Cyl1")
cyl1.Radius = 5; cyl1.Height = 10
cyl1.Placement.Base = FreeCAD.Vector(2, 2, 0)
boxMove = doc.addObject("Part::Box", "BoxMove")
boxMove.Length = 10; boxMove.Width = 10; boxMove.Height = 10
boxRot = doc.addObject("Part::Box", "BoxRot")
boxRot.Length = 10; boxRot.Width = 10; boxRot.Height = 10
boxMirror = doc.addObject("Part::Box", "BoxMirror")
boxMirror.Length = 10; boxMirror.Width = 10; boxMirror.Height = 10
boxRefine = doc.addObject("Part::Box", "BoxRefine")
boxRefine.Length = 10; boxRefine.Width = 10; boxRefine.Height = 10
# Create hollow pipes using boolean cut (Part::Tube is not a document object type)
outer1 = doc.addObject("Part::Cylinder", "Pipe1Outer")
outer1.Radius = 10; outer1.Height = 20
inner1 = doc.addObject("Part::Cylinder", "Pipe1Inner")
inner1.Radius = 8; inner1.Height = 20
pipe1 = doc.addObject("Part::Cut", "Pipe1")
pipe1.Base = outer1
pipe1.Tool = inner1
outer2 = doc.addObject("Part::Cylinder", "Pipe2Outer")
outer2.Radius = 10; outer2.Height = 20
inner2 = doc.addObject("Part::Cylinder", "Pipe2Inner")
inner2.Radius = 8; inner2.Height = 20
pipe2 = doc.addObject("Part::Cut", "Pipe2")
pipe2.Base = outer2
pipe2.Tool = inner2
pipe2.Placement.Base = FreeCAD.Vector(5, 0, 0)
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);
}

try {
  await resetDoc();

  const tests = [
    ['freecad_boolean_fuse', { object1: 'Box1', object2: 'Box2', name: 'Fuse' }],
    ['freecad_boolean_cut', { object1: 'Box1', object2: 'Cyl1', name: 'Cut' }],
    ['freecad_boolean_intersect', { object1: 'Box1', object2: 'Cyl1', name: 'Common' }],
    ['freecad_fillet', { objectName: 'Box1', radius: 1 }],
    ['freecad_chamfer', { objectName: 'Box1', distance: 1 }],
    ['freecad_move_object', { objectName: 'BoxMove', x: 10, y: 5, z: 2 }],
    ['freecad_rotate_object', { objectName: 'BoxRot', axis: 'z', angle: 45 }],
    ['freecad_copy_object', { objectName: 'Box1', newName: 'Box1Copy' }],
    ['freecad_delete_object', { objectName: 'Box2' }],
    ['freecad_mirror_object', { objectName: 'BoxMirror', plane: 'XY', name: 'Mirror' }],
    ['freecad_check_geometry', { objectName: 'Box1' }],
    ['freecad_refine_shape', { objectName: 'BoxRefine', name: 'Refined' }],
    ['freecad_boolean_fragments', { objectNames: ['Box1', 'Cyl1'], name: 'Fragments' }],
    ['freecad_slice', { baseName: 'Box1', toolName: 'Cyl1', name: 'Slice' }],
    ['freecad_boolean_xor', { object1: 'Box1', object2: 'Cyl1', name: 'XOR' }],
    ['freecad_join_connect', { object1: 'Pipe1', object2: 'Pipe2', name: 'JoinConnect' }],
    ['freecad_join_cutout', { object1: 'Pipe1', object2: 'Pipe2', name: 'JoinCutout' }],
  ];

  const testedNames = new Set(tests.map(([name]) => name));
  const expectedTools = OPERATION_TOOLS.map(t => t.name);
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

const outputLines = results.map(r => {
  const status = r.ok ? 'PASS' : 'FAIL';
  let line = `[${status}] ${r.name}`;
  if (!r.ok) {
    line += `\n        ${r.text}`;
  }
  return line;
});

const resPath = path.resolve('scripts/resultados/operations.txt');
fs.writeFileSync(resPath, outputLines.join('\n') + '\n', 'utf-8');
console.log(`\nResumen guardado en ${resPath}`);
