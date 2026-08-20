// Validación del módulo sketcher contra FreeCAD 1.1.3 headless.
import fs from 'node:fs';
import path from 'node:path';
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleSketcherTool, SKETCHER_TOOLS } from '../../dist/tools/sketcher.js';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleSketcherTool, name, args);

const results = [];

async function runTest(name, args) {
  const res = await R(name, args);
  report(res);
  results.push(res);
  return res;
}

try {
  // Documento limpio con sketches y objetos base preparados
  await bridge.execute(`
if FreeCAD.ActiveDocument is not None:
    FreeCAD.closeDocument(FreeCAD.ActiveDocument.Name)
doc = FreeCAD.newDocument("SketcherDoc")

# Sketch principal con geometrías acumuladas (índices conocidos)
sk = doc.addObject("Sketcher::SketchObject", "Sketch")
sk.MapMode = "Deactivated"
sk.Placement = FreeCAD.Placement(FreeCAD.Vector(0,0,0), FreeCAD.Rotation(FreeCAD.Vector(0,0,1), 0))
# 0: línea
sk.addGeometry(Part.LineSegment(FreeCAD.Vector(0,0,0), FreeCAD.Vector(10,0,0)))
# 1: círculo
sk.addGeometry(Part.Circle(FreeCAD.Vector(5,5,0), FreeCAD.Vector(0,0,1), 2))
# 2: arco
import math
c = Part.Circle(FreeCAD.Vector(2,8,0), FreeCAD.Vector(0,0,1), 1.5)
arc = Part.ArcOfCircle(c, math.radians(0), math.radians(90))
sk.addGeometry(arc)
# 3,4,5,6: rectángulo
sk.addGeometry(Part.LineSegment(FreeCAD.Vector(20,0,0), FreeCAD.Vector(30,0,0)))
sk.addGeometry(Part.LineSegment(FreeCAD.Vector(30,0,0), FreeCAD.Vector(30,10,0)))
sk.addGeometry(Part.LineSegment(FreeCAD.Vector(30,10,0), FreeCAD.Vector(20,10,0)))
sk.addGeometry(Part.LineSegment(FreeCAD.Vector(20,10,0), FreeCAD.Vector(20,0,0)))
# 7: elipse
sk.addGeometry(Part.Ellipse(FreeCAD.Vector(40,5,0), 4, 2))
# 8: bspline
pts = [FreeCAD.Vector(0,20,0), FreeCAD.Vector(5,25,0), FreeCAD.Vector(10,20,0)]
bs = Part.BSplineCurve()
bs.interpolate(pts, PeriodicFlag=False)
sk.addGeometry(bs)
# 9..14: hexágono (6 líneas)
import math as m
n = 6; r = 3; cx = 15; cy = 25
for i in range(n):
    a1 = 2*m.pi*i/n
    a2 = 2*m.pi*((i+1)%n)/n
    sk.addGeometry(Part.LineSegment(
        FreeCAD.Vector(cx+r*m.cos(a1), cy+r*m.sin(a1), 0),
        FreeCAD.Vector(cx+r*m.cos(a2), cy+r*m.sin(a2), 0)))
# 15,16,17,18: slot (2 líneas + 2 arcos)
dx = 5; dy = 0; length = 5; w = 2
nx = -dy/length * w/2; ny = dx/length * w/2
ab = m.atan2(dy, dx)
sk.addGeometry(Part.LineSegment(FreeCAD.Vector(25+nx,25+ny,0), FreeCAD.Vector(30+nx,25+ny,0)))
sk.addGeometry(Part.LineSegment(FreeCAD.Vector(30-nx,25-ny,0), FreeCAD.Vector(25-nx,25-ny,0)))
sk.addGeometry(Part.ArcOfCircle(Part.Circle(FreeCAD.Vector(30,25,0), FreeCAD.Vector(0,0,1), w/2), ab-m.pi/2, ab+m.pi/2))
sk.addGeometry(Part.ArcOfCircle(Part.Circle(FreeCAD.Vector(25,25,0), FreeCAD.Vector(0,0,1), w/2), ab+m.pi/2, ab+3*m.pi/2))
# 19: punto
sk.addGeometry(Part.Point(FreeCAD.Vector(35,35,0)))
doc.recompute()

# Sketch para fillet: rectángulo simple (índices 0..3, vértices 0..3)
import Sketcher
skf = doc.addObject("Sketcher::SketchObject", "SketchFillet")
skf.MapMode = "Deactivated"
skf.Placement = FreeCAD.Placement(FreeCAD.Vector(0,0,0), FreeCAD.Rotation(FreeCAD.Vector(0,0,1), 0))
skf.addGeometry(Part.LineSegment(FreeCAD.Vector(0,0,0), FreeCAD.Vector(10,0,0)))
skf.addGeometry(Part.LineSegment(FreeCAD.Vector(10,0,0), FreeCAD.Vector(10,10,0)))
skf.addGeometry(Part.LineSegment(FreeCAD.Vector(10,10,0), FreeCAD.Vector(0,10,0)))
skf.addGeometry(Part.LineSegment(FreeCAD.Vector(0,10,0), FreeCAD.Vector(0,0,0)))
skf.addConstraint(Sketcher.Constraint("Coincident", 0, 2, 1, 1))
skf.addConstraint(Sketcher.Constraint("Coincident", 1, 2, 2, 1))
skf.addConstraint(Sketcher.Constraint("Coincident", 2, 2, 3, 1))
skf.addConstraint(Sketcher.Constraint("Coincident", 3, 2, 0, 1))
doc.recompute()

# Sketch para trim: línea (índice 0) cruzada por círculo (índice 1)
skt = doc.addObject("Sketcher::SketchObject", "SketchTrim")
skt.MapMode = "Deactivated"
skt.Placement = FreeCAD.Placement(FreeCAD.Vector(0,0,0), FreeCAD.Rotation(FreeCAD.Vector(0,0,1), 0))
skt.addGeometry(Part.LineSegment(FreeCAD.Vector(0,0,0), FreeCAD.Vector(10,0,0)))
skt.addGeometry(Part.Circle(FreeCAD.Vector(5,0,0), FreeCAD.Vector(0,0,1), 2))
doc.recompute()

# Sketch para toggle construction
sktg = doc.addObject("Sketcher::SketchObject", "SketchToggle")
sktg.MapMode = "Deactivated"
sktg.Placement = FreeCAD.Placement(FreeCAD.Vector(0,0,0), FreeCAD.Rotation(FreeCAD.Vector(0,0,1), 0))
sktg.addGeometry(Part.LineSegment(FreeCAD.Vector(0,0,0), FreeCAD.Vector(10,0,0)))
doc.recompute()

# Sketch para external geometry
extbox = doc.addObject("Part::Box", "ExtBox")
extbox.Length = 10; extbox.Width = 10; extbox.Height = 10
skext = doc.addObject("Sketcher::SketchObject", "SketchExt")
skext.MapMode = "Deactivated"
skext.Placement = FreeCAD.Placement(FreeCAD.Vector(0,0,0), FreeCAD.Rotation(FreeCAD.Vector(0,0,1), 0))
doc.recompute()

_mcp_result["result"] = {"ok": 1}
`);

  const tests = [
    ['freecad_create_sketch', { name: 'NewSketch', plane: 'XY' }],
    ['freecad_add_sketch_line', { sketchName: 'Sketch', x1: 50, y1: 0, x2: 60, y2: 10 }],
    ['freecad_add_sketch_circle', { sketchName: 'Sketch', centerX: 50, centerY: 20, radius: 3 }],
    ['freecad_add_sketch_arc', { sketchName: 'Sketch', centerX: 50, centerY: 30, radius: 2, startAngle: 0, endAngle: 180 }],
    ['freecad_add_sketch_rectangle', { sketchName: 'Sketch', x1: 50, y1: 40, x2: 60, y2: 50 }],
    ['freecad_add_sketch_constraint', { sketchName: 'Sketch', constraintType: 'radius', index1: 1, value: 2.5 }],
    ['freecad_add_sketch_ellipse', { sketchName: 'Sketch', centerX: 55, centerY: 60, majorRadius: 5, minorRadius: 2 }],
    ['freecad_add_sketch_bspline', { sketchName: 'Sketch', points: [{ x: 0, y: 50 }, { x: 5, y: 55 }, { x: 10, y: 50 }], closed: false }],
    ['freecad_add_sketch_polygon', { sketchName: 'Sketch', centerX: 20, centerY: 60, radius: 4, sides: 5 }],
    ['freecad_add_sketch_slot', { sketchName: 'Sketch', x1: 30, y1: 60, x2: 35, y2: 60, width: 2 }],
    ['freecad_add_sketch_point', { sketchName: 'Sketch', x: 45, y: 65 }],
    ['freecad_add_sketch_external', { sketchName: 'SketchExt', objectName: 'ExtBox', edgeName: 'Edge1' }],
    ['freecad_sketch_fillet', { sketchName: 'SketchFillet', geoIndex: 0, pointPos: 1, radius: 1 }],
    ['freecad_sketch_trim', { sketchName: 'SketchTrim', geoIndex: 0, posX: 5, posY: 1 }],
    ['freecad_sketch_toggle_construction', { sketchName: 'SketchToggle', geoIndex: 0 }],
    ['freecad_close_sketch', { sketchName: 'Sketch' }],
  ];

  const testedNames = new Set(tests.map(([name]) => name));
  const expectedTools = SKETCHER_TOOLS.map(t => t.name);
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

const resPath = path.resolve('scripts/resultados/sketcher.txt');
fs.writeFileSync(resPath, outputLines.join('\n') + '\n', 'utf-8');
console.log(`\nResumen guardado en ${resPath}`);
