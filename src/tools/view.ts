import { FreeCADBridge } from '../freecad-bridge.js';
import { ToolResult, ToolArgs } from '../types.js';
import {
  validateFilePath,
  validatePositiveNumber,
  validateObjectName,
} from '../validation.js';

export const VIEW_TOOLS = [
  {
    name: 'freecad_take_screenshot',
    description: 'Capture a screenshot of the active FreeCAD viewport to a PNG file (GUI-only)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filePath: { type: 'string', description: 'Absolute path to save the PNG' },
        width: { type: 'number', description: 'Image width in pixels (default 800)' },
        height: { type: 'number', description: 'Image height in pixels (default 600)' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'freecad_capture_views',
    description: 'Capture 4 views (0/90/180/270 degrees) of the active viewport to PNG files (GUI-only)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        outputDir: { type: 'string', description: 'Absolute path to directory for the 4 PNGs' },
        objectName: { type: 'string', description: 'Optional: focus on this object' },
        width: { type: 'number', description: 'Image width in pixels (default 800)' },
        height: { type: 'number', description: 'Image height in pixels (default 600)' },
      },
      required: ['outputDir'],
    },
  },
];

export async function handleViewTool(
  name: string,
  args: ToolArgs,
  bridge: FreeCADBridge,
): Promise<ToolResult> {
  switch (name) {
    case 'freecad_take_screenshot': {
      const filePath = validateFilePath(args.filePath, 'filePath');
      const width = args.width !== undefined ? validatePositiveNumber(args.width, 'width') : 800;
      const height = args.height !== undefined ? validatePositiveNumber(args.height, 'height') : 600;

      return bridge.run(`
import FreeCAD
if not FreeCAD.GuiUp:
    raise ValueError("take_screenshot requires FreeCAD GUI. Use GUI mode.")

import FreeCADGui as Gui
doc = Gui.ActiveDocument
if not doc or not doc.ActiveView:
    raise ValueError("No active document or active view found.")

view = doc.ActiveView
path = ${JSON.stringify(filePath)}
w = ${width}
h = ${height}

view.saveImage(path, w, h)
_mcp_result["result"] = f"Saved screenshot to {path}"
`);
    }

    case 'freecad_capture_views': {
      const outputDir = validateFilePath(args.outputDir, 'outputDir');
      const objectName = args.objectName !== undefined ? validateObjectName(args.objectName, 'objectName') : undefined;
      const width = args.width !== undefined ? validatePositiveNumber(args.width, 'width') : 800;
      const height = args.height !== undefined ? validatePositiveNumber(args.height, 'height') : 600;

      return bridge.run(`
import math
import os
import FreeCAD

if not FreeCAD.GuiUp:
    raise ValueError("capture_views requires FreeCAD GUI. Use GUI mode.")

import FreeCADGui as Gui
doc = Gui.ActiveDocument
if not doc or not doc.ActiveView:
    raise ValueError("No active document or active view found.")

view = doc.ActiveView
out_dir = ${JSON.stringify(outputDir)}
w = ${width}
h = ${height}
obj_name = ${objectName !== undefined ? JSON.stringify(objectName) : 'None'}

if obj_name:
    obj = doc.getObject(obj_name)
    if not obj:
        raise ValueError(f"Object not found: {obj_name}")
    Gui.Selection.clearSelection()
    Gui.Selection.addSelection(obj)
    view.fitAll()

saved_files = []
angles = [0, 90, 180, 270]
for angle in angles:
    rad = math.radians(angle)
    dir_v = FreeCAD.Vector(math.sin(rad), 0, -math.cos(rad))
    view.setCameraDirection(dir_v)
    view.fitAll()
    filename = f"view_{angle}.png"
    filepath = os.path.join(out_dir, filename)
    view.saveImage(filepath, w, h)
    saved_files.append(filepath)

_mcp_result["result"] = f"Saved {len(saved_files)} views to {out_dir}"
`);
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown view tool: ${name}` }],
        isError: true,
      };
  }
}
