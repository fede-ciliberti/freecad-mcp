import { FreeCADBridge } from '../freecad-bridge.js';
import { ToolResult, ToolArgs } from '../types.js';

export const PART_DESIGN_TOOLS = [
  {
    name: 'freecad_pad',
    description: 'Extrude a sketch into a solid (PartDesign Pad). Creates a PartDesign Body if one does not exist.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sketchName: { type: 'string', description: 'Name of the sketch to extrude' },
        length: { type: 'number', description: 'Extrusion length in mm' },
        symmetric: { type: 'boolean', description: 'Extrude symmetrically in both directions' },
        reversed: { type: 'boolean', description: 'Extrude in the reversed direction' },
        name: { type: 'string', description: 'Optional name for the Pad feature' },
      },
      required: ['sketchName', 'length'],
    },
  },
  {
    name: 'freecad_pocket',
    description: 'Cut into a solid from a sketch (PartDesign Pocket)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sketchName: { type: 'string', description: 'Name of the sketch defining the pocket profile' },
        depth: { type: 'number', description: 'Pocket depth in mm' },
        name: { type: 'string', description: 'Optional name for the Pocket feature' },
      },
      required: ['sketchName', 'depth'],
    },
  },
  {
    name: 'freecad_revolve',
    description: 'Revolve a sketch around an axis (PartDesign Revolution)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sketchName: { type: 'string', description: 'Name of the sketch to revolve' },
        angle: { type: 'number', description: 'Revolution angle in degrees (default 360)' },
        axisX: { type: 'number', description: 'X component of revolution axis (default 0)' },
        axisY: { type: 'number', description: 'Y component of revolution axis (default 1)' },
        axisZ: { type: 'number', description: 'Z component of revolution axis (default 0)' },
        name: { type: 'string', description: 'Optional name for the Revolution feature' },
      },
      required: ['sketchName'],
    },
  },
  {
    name: 'freecad_loft',
    description: 'Loft between two or more sketches/profiles to create a solid',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sketchNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of sketch/profile names to loft between',
        },
        solid: { type: 'boolean', description: 'Create a solid (default true)' },
        name: { type: 'string', description: 'Optional name for the Loft feature' },
      },
      required: ['sketchNames'],
    },
  },
  {
    name: 'freecad_sweep',
    description: 'Sweep a profile along a path to create a solid',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profileName: { type: 'string', description: 'Name of the profile sketch to sweep' },
        pathName: { type: 'string', description: 'Name of the path edge/wire to sweep along' },
        solid: { type: 'boolean', description: 'Create a solid (default true)' },
        name: { type: 'string', description: 'Optional name for the Sweep feature' },
      },
      required: ['profileName', 'pathName'],
    },
  },
  {
    name: 'freecad_partdesign_fillet',
    description: 'Fillet (round) edges on a PartDesign body',
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string', description: 'Name of the object whose edges to fillet' },
        radius: { type: 'number', description: 'Fillet radius in mm' },
        edgeNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of edge names (e.g. ["Edge1","Edge2"]). If omitted, all edges are filleted.',
        },
        name: { type: 'string', description: 'Optional name for the Fillet feature' },
      },
      required: ['objectName', 'radius'],
    },
  },
  {
    name: 'freecad_partdesign_chamfer',
    description: 'Chamfer edges on a PartDesign body',
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectName: { type: 'string', description: 'Name of the object whose edges to chamfer' },
        size: { type: 'number', description: 'Chamfer size in mm' },
        edgeNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of edge names (e.g. ["Edge1","Edge2"]). If omitted, all edges are chamfered.',
        },
        name: { type: 'string', description: 'Optional name for the Chamfer feature' },
      },
      required: ['objectName', 'size'],
    },
  },
];

export async function handlePartDesignTool(
  name: string,
  args: ToolArgs,
  bridge: FreeCADBridge,
): Promise<ToolResult> {
  switch (name) {
    case 'freecad_pad': {
      const sketchName = args.sketchName as string;
      const length = args.length as number;
      const symmetric = (args.symmetric as boolean) ?? false;
      const reversed = (args.reversed as boolean) ?? false;
      const padName = (args.name as string) || 'Pad';
      return bridge.run(`
doc = FreeCAD.ActiveDocument
sketch = doc.getObject(${JSON.stringify(sketchName)})
# Create a PartDesign Body if none exists
body = None
for obj in doc.Objects:
    if obj.TypeId == "PartDesign::Body":
        body = obj
        break
if body is None:
    body = doc.addObject("PartDesign::Body", "Body")
if sketch not in body.Group:
    body.addObject(sketch)
pad = doc.addObject("PartDesign::Pad", ${JSON.stringify(padName)})
pad.Profile = sketch
pad.Length = ${length}
pad.Symmetric = ${symmetric ? 'True' : 'False'}
pad.Reversed = ${reversed ? 'True' : 'False'}
body.addObject(pad)
doc.recompute()
_mcp_result["result"] = {"name": pad.Name, "length": pad.Length, "type": pad.TypeId}
`);
    }

    case 'freecad_pocket': {
      const sketchName = args.sketchName as string;
      const depth = args.depth as number;
      const pocketName = (args.name as string) || 'Pocket';
      return bridge.run(`
doc = FreeCAD.ActiveDocument
sketch = doc.getObject(${JSON.stringify(sketchName)})
body = None
for obj in doc.Objects:
    if obj.TypeId == "PartDesign::Body":
        body = obj
        break
if body is None:
    body = doc.addObject("PartDesign::Body", "Body")
if sketch not in body.Group:
    body.addObject(sketch)
pocket = doc.addObject("PartDesign::Pocket", ${JSON.stringify(pocketName)})
pocket.Profile = sketch
pocket.Length = ${depth}
body.addObject(pocket)
doc.recompute()
_mcp_result["result"] = {"name": pocket.Name, "depth": pocket.Length, "type": pocket.TypeId}
`);
    }

    case 'freecad_revolve': {
      const sketchName = args.sketchName as string;
      const angle = (args.angle as number) ?? 360;
      const axisX = (args.axisX as number) ?? 0;
      const axisY = (args.axisY as number) ?? 1;
      const axisZ = (args.axisZ as number) ?? 0;
      const revName = (args.name as string) || 'Revolution';
      return bridge.run(`
doc = FreeCAD.ActiveDocument
sketch = doc.getObject(${JSON.stringify(sketchName)})
body = None
for obj in doc.Objects:
    if obj.TypeId == "PartDesign::Body":
        body = obj
        break
if body is None:
    body = doc.addObject("PartDesign::Body", "Body")
if sketch not in body.Group:
    body.addObject(sketch)
rev = doc.addObject("PartDesign::Revolution", ${JSON.stringify(revName)})
rev.Profile = sketch
rev.Angle = ${angle}
rev.Axis = FreeCAD.Vector(${axisX}, ${axisY}, ${axisZ})
body.addObject(rev)
doc.recompute()
_mcp_result["result"] = {"name": rev.Name, "angle": rev.Angle, "type": rev.TypeId}
`);
    }

    case 'freecad_loft': {
      const sketchNames = args.sketchNames as string[];
      const solid = (args.solid as boolean) ?? true;
      const loftName = (args.name as string) || 'Loft';
      const sectionsCode = `[doc.getObject(s) for s in ${JSON.stringify(sketchNames)}]`;
      return bridge.run(`
doc = FreeCAD.ActiveDocument
loft = doc.addObject("Part::Loft", ${JSON.stringify(loftName)})
loft.Sections = ${sectionsCode}
loft.Solid = ${solid ? 'True' : 'False'}
doc.recompute()
_mcp_result["result"] = {"name": loft.Name, "sections": ${JSON.stringify(sketchNames)}, "solid": ${solid}, "type": loft.TypeId}
`);
    }

    case 'freecad_sweep': {
      const profileName = args.profileName as string;
      const pathName = args.pathName as string;
      const solid = (args.solid as boolean) ?? true;
      const sweepName = (args.name as string) || 'Sweep';
      return bridge.run(`
doc = FreeCAD.ActiveDocument
sweep = doc.addObject("Part::Sweep", ${JSON.stringify(sweepName)})
sweep.Sections = [doc.getObject(${JSON.stringify(profileName)})]
sweep.Spine = (doc.getObject(${JSON.stringify(pathName)}), [])
sweep.Solid = ${solid ? 'True' : 'False'}
doc.recompute()
_mcp_result["result"] = {"name": sweep.Name, "profile": ${JSON.stringify(profileName)}, "path": ${JSON.stringify(pathName)}, "type": sweep.TypeId}
`);
    }

    case 'freecad_partdesign_fillet': {
      const objectName = args.objectName as string;
      const radius = args.radius as number;
      const edgeNames = args.edgeNames as string[] | undefined;
      const filletName = (args.name as string) || 'Fillet';
      const edgesCode = edgeNames
        ? JSON.stringify(edgeNames)
        : `["Edge" + str(i+1) for i in range(len(obj.Shape.Edges))]`;
      return bridge.run(`
doc = FreeCAD.ActiveDocument
obj = doc.getObject(${JSON.stringify(objectName)})
edges = ${edgesCode}
fillet = doc.addObject("PartDesign::Fillet", ${JSON.stringify(filletName)})
fillet.Base = (obj, edges)
fillet.Radius = ${radius}
doc.recompute()
_mcp_result["result"] = {"name": fillet.Name, "radius": fillet.Radius, "edges": edges, "type": fillet.TypeId}
`);
    }

    case 'freecad_partdesign_chamfer': {
      const objectName = args.objectName as string;
      const size = args.size as number;
      const edgeNames = args.edgeNames as string[] | undefined;
      const chamferName = (args.name as string) || 'Chamfer';
      const edgesCode = edgeNames
        ? JSON.stringify(edgeNames)
        : `["Edge" + str(i+1) for i in range(len(obj.Shape.Edges))]`;
      return bridge.run(`
doc = FreeCAD.ActiveDocument
obj = doc.getObject(${JSON.stringify(objectName)})
edges = ${edgesCode}
cham = doc.addObject("PartDesign::Chamfer", ${JSON.stringify(chamferName)})
cham.Base = (obj, edges)
cham.Size = ${size}
doc.recompute()
_mcp_result["result"] = {"name": cham.Name, "size": cham.Size, "edges": edges, "type": cham.TypeId}
`);
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown part design tool: ${name}` }],
        isError: true,
      };
  }
}
