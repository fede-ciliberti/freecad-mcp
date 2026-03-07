import { FreeCADBridge } from '../freecad-bridge.js';
import { ToolResult, ToolArgs } from '../types.js';

export const PRIMITIVE_TOOLS = [
  {
    name: 'freecad_create_box',
    description: 'Create a Part::Box primitive in the active document.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        length: { type: 'number', description: 'Box length (X dimension)' },
        width: { type: 'number', description: 'Box width (Y dimension)' },
        height: { type: 'number', description: 'Box height (Z dimension)' },
        name: { type: 'string', description: 'Optional object name' },
      },
      required: ['length', 'width', 'height'],
    },
  },
  {
    name: 'freecad_create_cylinder',
    description: 'Create a Part::Cylinder primitive in the active document.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        radius: { type: 'number', description: 'Cylinder radius' },
        height: { type: 'number', description: 'Cylinder height' },
        name: { type: 'string', description: 'Optional object name' },
      },
      required: ['radius', 'height'],
    },
  },
  {
    name: 'freecad_create_sphere',
    description: 'Create a Part::Sphere primitive in the active document.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        radius: { type: 'number', description: 'Sphere radius' },
        name: { type: 'string', description: 'Optional object name' },
      },
      required: ['radius'],
    },
  },
  {
    name: 'freecad_create_cone',
    description: 'Create a Part::Cone primitive in the active document.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        radius1: { type: 'number', description: 'Bottom radius' },
        radius2: { type: 'number', description: 'Top radius' },
        height: { type: 'number', description: 'Cone height' },
        name: { type: 'string', description: 'Optional object name' },
      },
      required: ['radius1', 'radius2', 'height'],
    },
  },
  {
    name: 'freecad_create_torus',
    description: 'Create a Part::Torus primitive in the active document.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        radius1: { type: 'number', description: 'Major radius (center to tube center)' },
        radius2: { type: 'number', description: 'Minor radius (tube radius)' },
        name: { type: 'string', description: 'Optional object name' },
      },
      required: ['radius1', 'radius2'],
    },
  },
  {
    name: 'freecad_create_wedge',
    description: 'Create a Part wedge (tapered box) in the active document.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        xmin: { type: 'number', description: 'X minimum' },
        ymin: { type: 'number', description: 'Y minimum' },
        zmin: { type: 'number', description: 'Z minimum' },
        x2min: { type: 'number', description: 'X2 minimum (top face)' },
        z2min: { type: 'number', description: 'Z2 minimum (top face)' },
        xmax: { type: 'number', description: 'X maximum' },
        ymax: { type: 'number', description: 'Y maximum' },
        zmax: { type: 'number', description: 'Z maximum' },
        x2max: { type: 'number', description: 'X2 maximum (top face)' },
        z2max: { type: 'number', description: 'Z2 maximum (top face)' },
        name: { type: 'string', description: 'Optional object name' },
      },
      required: ['xmin', 'ymin', 'zmin', 'x2min', 'z2min', 'xmax', 'ymax', 'zmax', 'x2max', 'z2max'],
    },
  },
];

const DOC_PREAMBLE = `doc = FreeCAD.ActiveDocument
if doc is None:
    doc = FreeCAD.newDocument("Unnamed")`;

export async function handlePrimitiveTool(
  name: string,
  args: ToolArgs,
  bridge: FreeCADBridge,
): Promise<ToolResult> {
  switch (name) {
    case 'freecad_create_box': {
      const objName = (args.name as string) || 'Box';
      const code = `
${DOC_PREAMBLE}
box = doc.addObject("Part::Box", "${objName}")
box.Length = ${args.length}
box.Width = ${args.width}
box.Height = ${args.height}
doc.recompute()
_mcp_result["result"] = {"name": box.Name, "label": box.Label}
`;
      return bridge.run(code);
    }

    case 'freecad_create_cylinder': {
      const objName = (args.name as string) || 'Cylinder';
      const code = `
${DOC_PREAMBLE}
cyl = doc.addObject("Part::Cylinder", "${objName}")
cyl.Radius = ${args.radius}
cyl.Height = ${args.height}
doc.recompute()
_mcp_result["result"] = {"name": cyl.Name, "label": cyl.Label}
`;
      return bridge.run(code);
    }

    case 'freecad_create_sphere': {
      const objName = (args.name as string) || 'Sphere';
      const code = `
${DOC_PREAMBLE}
sph = doc.addObject("Part::Sphere", "${objName}")
sph.Radius = ${args.radius}
doc.recompute()
_mcp_result["result"] = {"name": sph.Name, "label": sph.Label}
`;
      return bridge.run(code);
    }

    case 'freecad_create_cone': {
      const objName = (args.name as string) || 'Cone';
      const code = `
${DOC_PREAMBLE}
cone = doc.addObject("Part::Cone", "${objName}")
cone.Radius1 = ${args.radius1}
cone.Radius2 = ${args.radius2}
cone.Height = ${args.height}
doc.recompute()
_mcp_result["result"] = {"name": cone.Name, "label": cone.Label}
`;
      return bridge.run(code);
    }

    case 'freecad_create_torus': {
      const objName = (args.name as string) || 'Torus';
      const code = `
${DOC_PREAMBLE}
tor = doc.addObject("Part::Torus", "${objName}")
tor.Radius1 = ${args.radius1}
tor.Radius2 = ${args.radius2}
doc.recompute()
_mcp_result["result"] = {"name": tor.Name, "label": tor.Label}
`;
      return bridge.run(code);
    }

    case 'freecad_create_wedge': {
      const objName = (args.name as string) || 'Wedge';
      const code = `
${DOC_PREAMBLE}
wedge_shape = Part.makeWedge(${args.xmin}, ${args.ymin}, ${args.zmin}, ${args.x2min}, ${args.z2min}, ${args.xmax}, ${args.ymax}, ${args.zmax}, ${args.x2max}, ${args.z2max})
wedge_obj = doc.addObject("Part::Feature", "${objName}")
wedge_obj.Shape = wedge_shape
doc.recompute()
_mcp_result["result"] = {"name": wedge_obj.Name, "label": wedge_obj.Label}
`;
      return bridge.run(code);
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown primitive tool: ${name}` }],
        isError: true,
      };
  }
}
