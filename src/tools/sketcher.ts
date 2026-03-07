import { FreeCADBridge } from '../freecad-bridge.js';
import { ToolResult, ToolArgs } from '../types.js';

export const SKETCHER_TOOLS = [
  {
    name: 'freecad_create_sketch',
    description: 'Create a new sketch on a plane (XY, XZ, or YZ)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name for the sketch (default: "Sketch")' },
        plane: {
          type: 'string',
          enum: ['XY', 'XZ', 'YZ'],
          description: 'Plane to create the sketch on (default: "XY")',
        },
      },
      required: [],
    },
  },
  {
    name: 'freecad_add_sketch_line',
    description: 'Add a line segment to a sketch',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sketchName: { type: 'string', description: 'Name of the sketch' },
        x1: { type: 'number', description: 'Start point X coordinate' },
        y1: { type: 'number', description: 'Start point Y coordinate' },
        x2: { type: 'number', description: 'End point X coordinate' },
        y2: { type: 'number', description: 'End point Y coordinate' },
      },
      required: ['sketchName', 'x1', 'y1', 'x2', 'y2'],
    },
  },
  {
    name: 'freecad_add_sketch_circle',
    description: 'Add a circle to a sketch',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sketchName: { type: 'string', description: 'Name of the sketch' },
        centerX: { type: 'number', description: 'Center X coordinate' },
        centerY: { type: 'number', description: 'Center Y coordinate' },
        radius: { type: 'number', description: 'Circle radius' },
      },
      required: ['sketchName', 'centerX', 'centerY', 'radius'],
    },
  },
  {
    name: 'freecad_add_sketch_arc',
    description: 'Add an arc to a sketch',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sketchName: { type: 'string', description: 'Name of the sketch' },
        centerX: { type: 'number', description: 'Center X coordinate' },
        centerY: { type: 'number', description: 'Center Y coordinate' },
        radius: { type: 'number', description: 'Arc radius' },
        startAngle: { type: 'number', description: 'Start angle in degrees' },
        endAngle: { type: 'number', description: 'End angle in degrees' },
      },
      required: ['sketchName', 'centerX', 'centerY', 'radius', 'startAngle', 'endAngle'],
    },
  },
  {
    name: 'freecad_add_sketch_rectangle',
    description: 'Add a rectangle to a sketch (4 lines with coincidence constraints)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sketchName: { type: 'string', description: 'Name of the sketch' },
        x1: { type: 'number', description: 'First corner X coordinate' },
        y1: { type: 'number', description: 'First corner Y coordinate' },
        x2: { type: 'number', description: 'Opposite corner X coordinate' },
        y2: { type: 'number', description: 'Opposite corner Y coordinate' },
      },
      required: ['sketchName', 'x1', 'y1', 'x2', 'y2'],
    },
  },
  {
    name: 'freecad_add_sketch_constraint',
    description: 'Add a constraint to a sketch',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sketchName: { type: 'string', description: 'Name of the sketch' },
        constraintType: {
          type: 'string',
          enum: [
            'coincident',
            'horizontal',
            'vertical',
            'fixed',
            'distance',
            'equal',
            'tangent',
            'perpendicular',
            'parallel',
          ],
          description: 'Type of constraint to add',
        },
        index1: { type: 'number', description: 'Index of the first geometry element' },
        index2: { type: 'number', description: 'Index of the second geometry element (for two-element constraints)' },
        value: { type: 'number', description: 'Value for dimensional constraints (e.g., distance)' },
      },
      required: ['sketchName', 'constraintType', 'index1'],
    },
  },
  {
    name: 'freecad_close_sketch',
    description: 'Close and recompute a sketch',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sketchName: { type: 'string', description: 'Name of the sketch to close/recompute' },
      },
      required: ['sketchName'],
    },
  },
];

export async function handleSketcherTool(
  name: string,
  args: ToolArgs,
  bridge: FreeCADBridge,
): Promise<ToolResult> {
  switch (name) {
    case 'freecad_create_sketch': {
      const sketchName = (args.name as string) || 'Sketch';
      const plane = (args.plane as string) || 'XY';

      const planeMap: Record<string, string> = {
        XY: 'FreeCAD.Vector(0, 0, 1)',
        XZ: 'FreeCAD.Vector(0, 1, 0)',
        YZ: 'FreeCAD.Vector(1, 0, 0)',
      };
      const planeNormal = planeMap[plane] || planeMap['XY'];

      // For XZ plane, rotate -90 degrees around X axis
      // For YZ plane, rotate 90 degrees around Y axis
      const placementMap: Record<string, string> = {
        XY: 'FreeCAD.Placement(FreeCAD.Vector(0,0,0), FreeCAD.Rotation(FreeCAD.Vector(0,0,1), 0))',
        XZ: 'FreeCAD.Placement(FreeCAD.Vector(0,0,0), FreeCAD.Rotation(FreeCAD.Vector(1,0,0), -90))',
        YZ: 'FreeCAD.Placement(FreeCAD.Vector(0,0,0), FreeCAD.Rotation(FreeCAD.Vector(0,1,0), 90))',
      };
      const placement = placementMap[plane] || placementMap['XY'];

      return bridge.run(`
import Sketcher
doc = FreeCAD.ActiveDocument
sketch = doc.addObject("Sketcher::SketchObject", ${JSON.stringify(sketchName)})
sketch.MapMode = "Deactivated"
sketch.Placement = ${placement}
doc.recompute()
_mcp_result["result"] = {"name": sketch.Name, "plane": ${JSON.stringify(plane)}}
`);
    }

    case 'freecad_add_sketch_line': {
      const sketchName = args.sketchName as string;
      const x1 = args.x1 as number;
      const y1 = args.y1 as number;
      const x2 = args.x2 as number;
      const y2 = args.y2 as number;

      return bridge.run(`
doc = FreeCAD.ActiveDocument
sketch = doc.getObject(${JSON.stringify(sketchName)})
idx = sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(${x1}, ${y1}, 0), FreeCAD.Vector(${x2}, ${y2}, 0)))
doc.recompute()
_mcp_result["result"] = {"sketchName": sketch.Name, "geometryIndex": idx}
`);
    }

    case 'freecad_add_sketch_circle': {
      const sketchName = args.sketchName as string;
      const cx = args.centerX as number;
      const cy = args.centerY as number;
      const radius = args.radius as number;

      return bridge.run(`
doc = FreeCAD.ActiveDocument
sketch = doc.getObject(${JSON.stringify(sketchName)})
idx = sketch.addGeometry(Part.Circle(FreeCAD.Vector(${cx}, ${cy}, 0), FreeCAD.Vector(0, 0, 1), ${radius}))
doc.recompute()
_mcp_result["result"] = {"sketchName": sketch.Name, "geometryIndex": idx}
`);
    }

    case 'freecad_add_sketch_arc': {
      const sketchName = args.sketchName as string;
      const cx = args.centerX as number;
      const cy = args.centerY as number;
      const radius = args.radius as number;
      const startAngle = args.startAngle as number;
      const endAngle = args.endAngle as number;

      return bridge.run(`
import math
doc = FreeCAD.ActiveDocument
sketch = doc.getObject(${JSON.stringify(sketchName)})
circle = Part.Circle(FreeCAD.Vector(${cx}, ${cy}, 0), FreeCAD.Vector(0, 0, 1), ${radius})
arc = Part.ArcOfCircle(circle, math.radians(${startAngle}), math.radians(${endAngle}))
idx = sketch.addGeometry(arc)
doc.recompute()
_mcp_result["result"] = {"sketchName": sketch.Name, "geometryIndex": idx}
`);
    }

    case 'freecad_add_sketch_rectangle': {
      const sketchName = args.sketchName as string;
      const x1 = args.x1 as number;
      const y1 = args.y1 as number;
      const x2 = args.x2 as number;
      const y2 = args.y2 as number;

      return bridge.run(`
import Sketcher
doc = FreeCAD.ActiveDocument
sketch = doc.getObject(${JSON.stringify(sketchName)})
# Add 4 line segments: bottom, right, top, left
i0 = sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(${x1}, ${y1}, 0), FreeCAD.Vector(${x2}, ${y1}, 0)))
i1 = sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(${x2}, ${y1}, 0), FreeCAD.Vector(${x2}, ${y2}, 0)))
i2 = sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(${x2}, ${y2}, 0), FreeCAD.Vector(${x1}, ${y2}, 0)))
i3 = sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(${x1}, ${y2}, 0), FreeCAD.Vector(${x1}, ${y1}, 0)))
# Add coincidence constraints to close the rectangle
# bottom-end to right-start
sketch.addConstraint(Sketcher.Constraint("Coincident", i0, 2, i1, 1))
# right-end to top-start
sketch.addConstraint(Sketcher.Constraint("Coincident", i1, 2, i2, 1))
# top-end to left-start
sketch.addConstraint(Sketcher.Constraint("Coincident", i2, 2, i3, 1))
# left-end to bottom-start
sketch.addConstraint(Sketcher.Constraint("Coincident", i3, 2, i0, 1))
doc.recompute()
_mcp_result["result"] = {"sketchName": sketch.Name, "geometryIndices": [i0, i1, i2, i3]}
`);
    }

    case 'freecad_add_sketch_constraint': {
      const sketchName = args.sketchName as string;
      const constraintType = args.constraintType as string;
      const index1 = args.index1 as number;
      const index2 = args.index2 as number | undefined;
      const value = args.value as number | undefined;

      // Map user-friendly names to FreeCAD constraint names
      const constraintNameMap: Record<string, string> = {
        coincident: 'Coincident',
        horizontal: 'Horizontal',
        vertical: 'Vertical',
        fixed: 'Block',
        distance: 'Distance',
        equal: 'Equal',
        tangent: 'Tangent',
        perpendicular: 'Perpendicular',
        parallel: 'Parallel',
      };
      const fcConstraint = constraintNameMap[constraintType] || constraintType;

      // Build constraint arguments based on what's provided
      let constraintArgs: string;
      if (value !== undefined && index2 !== undefined) {
        constraintArgs = `${JSON.stringify(fcConstraint)}, ${index1}, ${index2}, ${value}`;
      } else if (index2 !== undefined) {
        constraintArgs = `${JSON.stringify(fcConstraint)}, ${index1}, ${index2}`;
      } else if (value !== undefined) {
        constraintArgs = `${JSON.stringify(fcConstraint)}, ${index1}, ${value}`;
      } else {
        constraintArgs = `${JSON.stringify(fcConstraint)}, ${index1}`;
      }

      return bridge.run(`
import Sketcher
doc = FreeCAD.ActiveDocument
sketch = doc.getObject(${JSON.stringify(sketchName)})
cid = sketch.addConstraint(Sketcher.Constraint(${constraintArgs}))
doc.recompute()
_mcp_result["result"] = {"sketchName": sketch.Name, "constraintIndex": cid, "type": ${JSON.stringify(constraintType)}}
`);
    }

    case 'freecad_close_sketch': {
      const sketchName = args.sketchName as string;

      return bridge.run(`
doc = FreeCAD.ActiveDocument
sketch = doc.getObject(${JSON.stringify(sketchName)})
doc.recompute()
geo_count = sketch.GeometryCount
constraint_count = sketch.ConstraintCount
_mcp_result["result"] = {"sketchName": sketch.Name, "geometryCount": geo_count, "constraintCount": constraint_count, "status": "closed"}
`);
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown sketcher tool: ${name}` }],
        isError: true,
      };
  }
}
