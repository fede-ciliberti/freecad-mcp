// Validación del módulo Surface contra FreeCAD 1.1.3 headless.
// Cada tool corre en un proceso aislado (run-tool.mjs) para no contaminar el estado.

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(__dirname, 'run-tool.mjs');
const RESULTS_FILE = join(__dirname, '..', 'resultados', 'surface.txt');

const SKETCH_SETUP = `
import FreeCAD, Part, Sketcher
doc = FreeCAD.newDocument("surf_val")
sketch = doc.addObject("Sketcher::SketchObject", "Sketch")
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(0,0,0), FreeCAD.Vector(100,0,0)), False)
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(100,0,0), FreeCAD.Vector(100,100,0)), False)
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(100,100,0), FreeCAD.Vector(0,100,0)), False)
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(0,100,0), FreeCAD.Vector(0,0,0)), False)
doc.recompute()
`;

const TWO_SKETCHES_SETUP = `
import FreeCAD, Part, Sketcher
doc = FreeCAD.newDocument("surf_sections_val")
sketch1 = doc.addObject("Sketcher::SketchObject", "Sketch1")
sketch1.addGeometry(Part.LineSegment(FreeCAD.Vector(0,0,0), FreeCAD.Vector(100,0,0)), False)
sketch1.addGeometry(Part.LineSegment(FreeCAD.Vector(100,0,0), FreeCAD.Vector(100,100,0)), False)
sketch1.addGeometry(Part.LineSegment(FreeCAD.Vector(100,100,0), FreeCAD.Vector(0,100,0)), False)
sketch1.addGeometry(Part.LineSegment(FreeCAD.Vector(0,100,0), FreeCAD.Vector(0,0,0)), False)
sketch2 = doc.addObject("Sketcher::SketchObject", "Sketch2")
sketch2.addGeometry(Part.LineSegment(FreeCAD.Vector(0,0,100), FreeCAD.Vector(100,0,100)), False)
sketch2.addGeometry(Part.LineSegment(FreeCAD.Vector(100,0,100), FreeCAD.Vector(100,100,100)), False)
sketch2.addGeometry(Part.LineSegment(FreeCAD.Vector(100,100,100), FreeCAD.Vector(0,100,100)), False)
sketch2.addGeometry(Part.LineSegment(FreeCAD.Vector(0,100,100), FreeCAD.Vector(0,0,100)), False)
doc.recompute()
`;

const EXTEND_SETUP = `
import FreeCAD, Part, Sketcher
doc = FreeCAD.newDocument("surf_extend_val")
sketch = doc.addObject("Sketcher::SketchObject", "Sketch")
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(0,0,0), FreeCAD.Vector(100,0,0)), False)
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(100,0,0), FreeCAD.Vector(100,100,0)), False)
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(100,100,0), FreeCAD.Vector(0,100,0)), False)
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(0,100,0), FreeCAD.Vector(0,0,0)), False)
doc.recompute()
fill = doc.addObject("Surface::Filling", "Filling")
fill.BoundaryEdges = [(sketch, "Edge1"), (sketch, "Edge2"), (sketch, "Edge3"), (sketch, "Edge4")]
doc.recompute()
`;

const RULED_SETUP = `
import FreeCAD, Part
doc = FreeCAD.newDocument("surf_ruled_val")
wire1 = doc.addObject("Part::Feature", "Wire1")
wire1.Shape = Part.makePolygon([FreeCAD.Vector(0,0,0), FreeCAD.Vector(100,0,0), FreeCAD.Vector(100,100,0), FreeCAD.Vector(0,100,0), FreeCAD.Vector(0,0,0)])
wire2 = doc.addObject("Part::Feature", "Wire2")
wire2.Shape = Part.makePolygon([FreeCAD.Vector(0,0,100), FreeCAD.Vector(100,0,100), FreeCAD.Vector(100,100,100), FreeCAD.Vector(0,100,100), FreeCAD.Vector(0,0,100)])
doc.recompute()
`;

const TOOLS = [
  {
    name: 'freecad_surface_filling',
    args: { objectName: 'Sketch', edgeNames: ['Edge1', 'Edge2', 'Edge3', 'Edge4'], name: 'Filling' },
    setup: SKETCH_SETUP,
  },
  {
    name: 'freecad_surface_geomfill',
    args: {
      edges: [
        { objectName: 'Sketch', edgeName: 'Edge1' },
        { objectName: 'Sketch', edgeName: 'Edge2' },
        { objectName: 'Sketch', edgeName: 'Edge3' },
        { objectName: 'Sketch', edgeName: 'Edge4' },
      ],
      name: 'GeomFill',
    },
    setup: SKETCH_SETUP,
  },
  {
    name: 'freecad_surface_sections',
    args: { sectionNames: ['Sketch1', 'Sketch2'], name: 'Sections' },
    setup: TWO_SKETCHES_SETUP,
  },
  {
    name: 'freecad_surface_extend',
    args: { objectName: 'Filling', faceName: 'Face1', extensionLength: 10, name: 'Extend' },
    setup: EXTEND_SETUP,
  },
  {
    name: 'freecad_surface_ruled',
    args: { edge1ObjectName: 'Wire1', edge1Name: 'Edge1', edge2ObjectName: 'Wire2', edge2Name: 'Edge1', name: 'Ruled' },
    setup: RULED_SETUP,
  },
];

function runTool(tool) {
  return new Promise((resolve) => {
    const child = spawn('node', [
      RUNNER,
      '--module', 'surface',
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
    `Surface validation results (${new Date().toISOString()})`,
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
