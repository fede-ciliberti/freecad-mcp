import { FreeCADBridge } from '../freecad-bridge.js';
import { ToolResult, ToolArgs } from '../types.js';

export const OPERATION_TOOLS = [
  {
    name: 'freecad_boolean_fuse',
    description: 'Boolean union (fuse) of two objects into one',
    inputSchema: {
      type: 'object' as const,
      properties: {
        object1: { type: 'string', description: 'Name of the first object' },
        object2: { type: 'string', description: 'Name of the second object' },
        name: { type: 'string', description: 'Name for the resulting fused object' },
      },
      required: ['object1', 'object2'],
    },
  },
  {
    name: 'freecad_boolean_cut',
    description: 'Boolean subtraction: cut object2 from object1',
    inputSchema: {
      type: 'object' as const,
      properties: {
        object1: { type: 'string', description: 'Base object to cut from' },
        object2: { type: 'string', description: 'Tool object to subtract' },
        name: { type: 'string', description: 'Name for the resulting cut object' },
      },
      required: ['object1', 'object2'],
    },
  },
  {
    name: 'freecad_boolean_intersect',
    description: 'Boolean intersection of two objects (common volume)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        object1: { type: 'string', description: 'Name of the first object' },
        object2: { type: 'string', description: 'Name of the second object' },
        name: { type: 'string', description: 'Name for the resulting intersection object' },
      },
      required: ['object1', 'object2'],
    },
  },
  {
    name: 'freecad_fillet',
    description: 'Apply fillet (rounded edges) to an object',
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string', description: 'Name of the object to fillet' },
        radius: { type: 'number', description: 'Fillet radius' },
        edgeIndices: {
          type: 'array',
          items: { type: 'number' },
          description: 'Edge indices to fillet (1-based). All edges if omitted.',
        },
      },
      required: ['objectName', 'radius'],
    },
  },
  {
    name: 'freecad_chamfer',
    description: 'Apply chamfer (beveled edges) to an object',
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string', description: 'Name of the object to chamfer' },
        distance: { type: 'number', description: 'Chamfer distance' },
        edgeIndices: {
          type: 'array',
          items: { type: 'number' },
          description: 'Edge indices to chamfer (1-based). All edges if omitted.',
        },
      },
      required: ['objectName', 'distance'],
    },
  },
  {
    name: 'freecad_move_object',
    description: 'Translate (move) an object to a new position',
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string', description: 'Name of the object to move' },
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        z: { type: 'number', description: 'Z position' },
      },
      required: ['objectName', 'x', 'y', 'z'],
    },
  },
  {
    name: 'freecad_rotate_object',
    description: 'Rotate an object around an axis',
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string', description: 'Name of the object to rotate' },
        axis: { type: 'string', enum: ['x', 'y', 'z'], description: 'Rotation axis' },
        angle: { type: 'number', description: 'Rotation angle in degrees' },
      },
      required: ['objectName', 'axis', 'angle'],
    },
  },
  {
    name: 'freecad_copy_object',
    description: 'Duplicate an object in the document',
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string', description: 'Name of the object to copy' },
        newName: { type: 'string', description: 'Name for the copy' },
      },
      required: ['objectName'],
    },
  },
  {
    name: 'freecad_delete_object',
    description: 'Remove an object from the document',
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string', description: 'Name of the object to delete' },
      },
      required: ['objectName'],
    },
  },
  {
    name: 'freecad_mirror_object',
    description: 'Mirror an object across a plane',
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string', description: 'Name of the object to mirror' },
        plane: { type: 'string', enum: ['XY', 'XZ', 'YZ'], description: 'Mirror plane' },
        name: { type: 'string', description: 'Name for the mirrored object' },
      },
      required: ['objectName', 'plane'],
    },
  },
];

export async function handleOperationTool(
  name: string,
  args: ToolArgs,
  bridge: FreeCADBridge,
): Promise<ToolResult> {
  switch (name) {
    case 'freecad_boolean_fuse': {
      const obj1 = args.object1 as string;
      const obj2 = args.object2 as string;
      const fuseName = (args.name as string) || 'Fuse';
      return bridge.run(`
doc = FreeCAD.ActiveDocument
o1 = doc.getObject(${JSON.stringify(obj1)})
o2 = doc.getObject(${JSON.stringify(obj2)})
if o1 is None:
    raise ValueError("Object not found: ${obj1}")
if o2 is None:
    raise ValueError("Object not found: ${obj2}")
fuse = doc.addObject("Part::Fuse", ${JSON.stringify(fuseName)})
fuse.Shape1 = o1
fuse.Shape2 = o2
doc.recompute()
_mcp_result["result"] = {"name": fuse.Name, "volume": fuse.Shape.Volume}
`);
    }

    case 'freecad_boolean_cut': {
      const obj1 = args.object1 as string;
      const obj2 = args.object2 as string;
      const cutName = (args.name as string) || 'Cut';
      return bridge.run(`
doc = FreeCAD.ActiveDocument
o1 = doc.getObject(${JSON.stringify(obj1)})
o2 = doc.getObject(${JSON.stringify(obj2)})
if o1 is None:
    raise ValueError("Object not found: ${obj1}")
if o2 is None:
    raise ValueError("Object not found: ${obj2}")
cut = doc.addObject("Part::Cut", ${JSON.stringify(cutName)})
cut.Base = o1
cut.Tool = o2
doc.recompute()
_mcp_result["result"] = {"name": cut.Name, "volume": cut.Shape.Volume}
`);
    }

    case 'freecad_boolean_intersect': {
      const obj1 = args.object1 as string;
      const obj2 = args.object2 as string;
      const intName = (args.name as string) || 'Common';
      return bridge.run(`
doc = FreeCAD.ActiveDocument
o1 = doc.getObject(${JSON.stringify(obj1)})
o2 = doc.getObject(${JSON.stringify(obj2)})
if o1 is None:
    raise ValueError("Object not found: ${obj1}")
if o2 is None:
    raise ValueError("Object not found: ${obj2}")
common = doc.addObject("Part::Common", ${JSON.stringify(intName)})
common.Shape1 = o1
common.Shape2 = o2
doc.recompute()
_mcp_result["result"] = {"name": common.Name, "volume": common.Shape.Volume}
`);
    }

    case 'freecad_fillet': {
      const objectName = args.objectName as string;
      const radius = args.radius as number;
      const edgeIndices = args.edgeIndices as number[] | undefined;
      const edgesPython = edgeIndices
        ? `[${edgeIndices.map(i => `(${i}, ${radius}, ${radius})`).join(', ')}]`
        : `[(i, ${radius}, ${radius}) for i in range(1, len(obj.Shape.Edges) + 1)]`;
      return bridge.run(`
doc = FreeCAD.ActiveDocument
obj = doc.getObject(${JSON.stringify(objectName)})
if obj is None:
    raise ValueError("Object not found: ${objectName}")
edges = ${edgesPython}
fillet = doc.addObject("Part::Fillet", "Fillet")
fillet.Base = obj
fillet.Shape = obj.Shape.makeFillet(${radius}, [obj.Shape.Edges[e[0]-1] for e in edges])
doc.recompute()
_mcp_result["result"] = {"name": fillet.Name, "edges": len(edges)}
`);
    }

    case 'freecad_chamfer': {
      const objectName = args.objectName as string;
      const distance = args.distance as number;
      const edgeIndices = args.edgeIndices as number[] | undefined;
      const edgesPython = edgeIndices
        ? `[${edgeIndices.map(i => `(${i}, ${distance}, ${distance})`).join(', ')}]`
        : `[(i, ${distance}, ${distance}) for i in range(1, len(obj.Shape.Edges) + 1)]`;
      return bridge.run(`
doc = FreeCAD.ActiveDocument
obj = doc.getObject(${JSON.stringify(objectName)})
if obj is None:
    raise ValueError("Object not found: ${objectName}")
edges = ${edgesPython}
chamfer = doc.addObject("Part::Chamfer", "Chamfer")
chamfer.Base = obj
chamfer.Shape = obj.Shape.makeChamfer(${distance}, [obj.Shape.Edges[e[0]-1] for e in edges])
doc.recompute()
_mcp_result["result"] = {"name": chamfer.Name, "edges": len(edges)}
`);
    }

    case 'freecad_move_object': {
      const objectName = args.objectName as string;
      const x = args.x as number;
      const y = args.y as number;
      const z = args.z as number;
      return bridge.run(`
doc = FreeCAD.ActiveDocument
obj = doc.getObject(${JSON.stringify(objectName)})
if obj is None:
    raise ValueError("Object not found: ${objectName}")
obj.Placement.Base = FreeCAD.Vector(${x}, ${y}, ${z})
doc.recompute()
_mcp_result["result"] = {"name": obj.Name, "position": {"x": ${x}, "y": ${y}, "z": ${z}}}
`);
    }

    case 'freecad_rotate_object': {
      const objectName = args.objectName as string;
      const axis = args.axis as string;
      const angle = args.angle as number;
      const axisMap: Record<string, string> = {
        x: 'FreeCAD.Vector(1, 0, 0)',
        y: 'FreeCAD.Vector(0, 1, 0)',
        z: 'FreeCAD.Vector(0, 0, 1)',
      };
      const axisVec = axisMap[axis] || 'FreeCAD.Vector(0, 0, 1)';
      return bridge.run(`
doc = FreeCAD.ActiveDocument
obj = doc.getObject(${JSON.stringify(objectName)})
if obj is None:
    raise ValueError("Object not found: ${objectName}")
rot = FreeCAD.Rotation(${axisVec}, ${angle})
obj.Placement.Rotation = rot
doc.recompute()
_mcp_result["result"] = {"name": obj.Name, "axis": ${JSON.stringify(axis)}, "angle": ${angle}}
`);
    }

    case 'freecad_copy_object': {
      const objectName = args.objectName as string;
      const newName = args.newName as string | undefined;
      return bridge.run(`
doc = FreeCAD.ActiveDocument
obj = doc.getObject(${JSON.stringify(objectName)})
if obj is None:
    raise ValueError("Object not found: ${objectName}")
copy = doc.copyObject(obj)
${newName ? `copy.Label = ${JSON.stringify(newName)}` : ''}
doc.recompute()
_mcp_result["result"] = {"name": copy.Name, "label": copy.Label}
`);
    }

    case 'freecad_delete_object': {
      const objectName = args.objectName as string;
      return bridge.run(`
doc = FreeCAD.ActiveDocument
obj = doc.getObject(${JSON.stringify(objectName)})
if obj is None:
    raise ValueError("Object not found: ${objectName}")
doc.removeObject(${JSON.stringify(objectName)})
doc.recompute()
_mcp_result["result"] = {"deleted": ${JSON.stringify(objectName)}}
`);
    }

    case 'freecad_mirror_object': {
      const objectName = args.objectName as string;
      const plane = args.plane as string;
      const mirrorName = (args.name as string) || 'Mirror';
      const planeMap: Record<string, { point: string; normal: string }> = {
        XY: { point: 'FreeCAD.Vector(0, 0, 0)', normal: 'FreeCAD.Vector(0, 0, 1)' },
        XZ: { point: 'FreeCAD.Vector(0, 0, 0)', normal: 'FreeCAD.Vector(0, 1, 0)' },
        YZ: { point: 'FreeCAD.Vector(0, 0, 0)', normal: 'FreeCAD.Vector(1, 0, 0)' },
      };
      const { point, normal } = planeMap[plane] || planeMap.XY;
      return bridge.run(`
doc = FreeCAD.ActiveDocument
obj = doc.getObject(${JSON.stringify(objectName)})
if obj is None:
    raise ValueError("Object not found: ${objectName}")
mirrored_shape = obj.Shape.mirror(${point}, ${normal})
mirror_obj = doc.addObject("Part::Feature", ${JSON.stringify(mirrorName)})
mirror_obj.Shape = mirrored_shape
doc.recompute()
_mcp_result["result"] = {"name": mirror_obj.Name, "plane": ${JSON.stringify(plane)}}
`);
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown operation tool: ${name}` }],
        isError: true,
      };
  }
}
