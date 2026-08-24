import { FreeCADBridge } from '../freecad-bridge.js';
import { ToolResult, ToolArgs } from '../types.js';
import { validateArray, validateNumber, validateObjectName, validateString } from '../validation.js';

export const STATE_TOOLS = [
  {
    name: 'freecad_begin_transaction',
    description: 'Begin a new transaction in the active or specified FreeCAD document',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name or description of the transaction' },
        documentName: { type: 'string', description: 'Document name (uses active document if omitted)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'freecad_commit_transaction',
    description: 'Commit the currently open transaction in the active or specified FreeCAD document',
    inputSchema: {
      type: 'object' as const,
      properties: {
        documentName: { type: 'string', description: 'Document name (uses active document if omitted)' },
      },
      required: [],
    },
  },
  {
    name: 'freecad_abort_transaction',
    description: 'Abort (rollback) the currently open transaction in the active or specified FreeCAD document',
    inputSchema: {
      type: 'object' as const,
      properties: {
        documentName: { type: 'string', description: 'Document name (uses active document if omitted)' },
      },
      required: [],
    },
  },
  {
    name: 'freecad_undo',
    description: 'Undo the last operation in the active or specified FreeCAD document',
    inputSchema: {
      type: 'object' as const,
      properties: {
        documentName: { type: 'string', description: 'Document name (uses active document if omitted)' },
      },
      required: [],
    },
  },
  {
    name: 'freecad_redo',
    description: 'Redo the last undone operation in the active or specified FreeCAD document',
    inputSchema: {
      type: 'object' as const,
      properties: {
        documentName: { type: 'string', description: 'Document name (uses active document if omitted)' },
      },
      required: [],
    },
  },
  {
    name: 'freecad_snapshot_document',
    description: 'Capture a structural snapshot of a FreeCAD document (feature tree + topology JSON)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        documentName: { type: 'string', description: 'Document name (uses active document if omitted)' },
        objectName: { type: 'string', description: 'Optional: snapshot only this object' },
        includeTopology: { type: 'boolean', description: 'Include detailed topology (faces/edges) and spreadsheet. Default true' },
      },
      required: [],
    },
  },
  {
    name: 'freecad_diff_snapshot',
    description: 'Compute a structural A/B diff between two snapshots with regression detection',
    inputSchema: {
      type: 'object' as const,
      properties: {
        snapshotA: { type: 'string', description: 'First snapshot JSON (from freecad_snapshot_document)' },
        snapshotB: { type: 'string', description: 'Second snapshot JSON (from freecad_snapshot_document)' },
        expectedChanges: { type: 'array', items: { type: 'string' }, description: 'Object names the agent declared it would change' },
        tolerance: { type: 'number', description: 'Volume/boundBox tolerance as fraction (default 0.001 = 0.1%)' },
      },
      required: ['snapshotA', 'snapshotB'],
    },
  },
];

async function runScript(bridge: FreeCADBridge, script: string): Promise<ToolResult> {
  const result = await bridge.run(script);
  if ((result as any).isError) {
    return result;
  }
  if ((result as any).success === false) {
    return {
      content: [{ type: 'text', text: (result as any).error || 'Execution failed' }],
      isError: true,
    };
  }
  return result;
}

export async function handleStateTool(
  name: string,
  args: ToolArgs,
  bridge: FreeCADBridge,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'freecad_begin_transaction': {
        const txName = validateString(args.name ?? 'Transaction', 'name');
        const docName = args.documentName ? validateObjectName(args.documentName, 'documentName') : undefined;
        const docSelection = docName
          ? `doc = FreeCAD.getDocument(${JSON.stringify(docName)})\nif doc is None:\n    raise Exception("Document not found: " + ${JSON.stringify(docName)})`
          : `doc = FreeCAD.ActiveDocument\nif doc is None:\n    raise Exception("No active document")`;

        return await runScript(
          bridge,
          `
${docSelection}
doc.openTransaction(${JSON.stringify(txName)})
_mcp_result["result"] = {"transaction": ${JSON.stringify(txName)}, "document": doc.Name}
`,
        );
      }

      case 'freecad_commit_transaction': {
        const docName = args.documentName ? validateObjectName(args.documentName, 'documentName') : undefined;
        const docSelection = docName
          ? `doc = FreeCAD.getDocument(${JSON.stringify(docName)})\nif doc is None:\n    raise Exception("Document not found: " + ${JSON.stringify(docName)})`
          : `doc = FreeCAD.ActiveDocument\nif doc is None:\n    raise Exception("No active document")`;

        return await runScript(
          bridge,
          `
${docSelection}
doc.commitTransaction()
doc.recompute()
_mcp_result["result"] = {"committed": True, "document": doc.Name}
`,
        );
      }

      case 'freecad_abort_transaction': {
        const docName = args.documentName ? validateObjectName(args.documentName, 'documentName') : undefined;
        const docSelection = docName
          ? `doc = FreeCAD.getDocument(${JSON.stringify(docName)})\nif doc is None:\n    raise Exception("Document not found: " + ${JSON.stringify(docName)})`
          : `doc = FreeCAD.ActiveDocument\nif doc is None:\n    raise Exception("No active document")`;

        return await runScript(
          bridge,
          `
${docSelection}
doc.abortTransaction()
_mcp_result["result"] = {"aborted": True, "document": doc.Name}
`,
        );
      }

      case 'freecad_undo': {
        const docName = args.documentName ? validateObjectName(args.documentName, 'documentName') : undefined;
        const docSelection = docName
          ? `doc = FreeCAD.getDocument(${JSON.stringify(docName)})\nif doc is None:\n    raise Exception("Document not found: " + ${JSON.stringify(docName)})`
          : `doc = FreeCAD.ActiveDocument\nif doc is None:\n    raise Exception("No active document")`;

        return await runScript(
          bridge,
          `
${docSelection}
doc.undo()
doc.recompute()
_mcp_result["result"] = {"undone": True, "document": doc.Name}
`,
        );
      }

      case 'freecad_redo': {
        const docName = args.documentName ? validateObjectName(args.documentName, 'documentName') : undefined;
        const docSelection = docName
          ? `doc = FreeCAD.getDocument(${JSON.stringify(docName)})\nif doc is None:\n    raise Exception("Document not found: " + ${JSON.stringify(docName)})`
          : `doc = FreeCAD.ActiveDocument\nif doc is None:\n    raise Exception("No active document")`;

        return await runScript(
          bridge,
          `
${docSelection}
doc.redo()
doc.recompute()
_mcp_result["result"] = {"redone": True, "document": doc.Name}
`,
        );
      }

      case 'freecad_snapshot_document': {
        const docName = args.documentName ? validateObjectName(args.documentName, 'documentName') : undefined;
        const objName = args.objectName ? validateObjectName(args.objectName, 'objectName') : undefined;
        const includeTopology = args.includeTopology === undefined ? true : args.includeTopology;
        if (typeof includeTopology !== 'boolean') {
          throw new Error('Invalid includeTopology: must be a boolean');
        }

        const docSelection = docName
          ? `doc = FreeCAD.getDocument(${JSON.stringify(docName)})\nif doc is None:\n    raise Exception("Document not found: " + ${JSON.stringify(docName)})`
          : `doc = FreeCAD.ActiveDocument\nif doc is None:\n    raise Exception("No active document")`;

        const objectFilter = objName
          ? `target = doc.getObject(${JSON.stringify(objName)})\nif target is None:\n    raise Exception("Object not found: " + ${JSON.stringify(objName)})\nobjects = [target]`
          : `objects = doc.Objects`;

        const includeTopologyFlag = includeTopology ? 'True' : 'False';

        return await runScript(
          bridge,
          `
${docSelection}
${objectFilter}

def _vec(v):
    return {"x": v.x, "y": v.y, "z": v.z}

def _snapshot_object(obj, with_topology):
    entry = {
        "name": obj.Name,
        "label": obj.Label,
        "typeId": obj.TypeId,
    }
    if hasattr(obj, "Shape") and obj.Shape is not None and not obj.Shape.isNull():
        bb = obj.Shape.BoundBox
        entry["volume"] = obj.Shape.Volume
        entry["boundBox"] = {
            "XMin": bb.XMin, "YMin": bb.YMin, "ZMin": bb.ZMin,
            "XMax": bb.XMax, "YMax": bb.YMax, "ZMax": bb.ZMax,
        }
        if with_topology:
            faces = []
            for i, f in enumerate(obj.Shape.Faces):
                faces.append({
                    "index": i,
                    "center": _vec(f.CenterOfMass),
                    "area": f.Area,
                    "normal": _vec(f.normalAt(0, 0)),
                })
            edges = []
            for i, e in enumerate(obj.Shape.Edges):
                v0 = e.Vertexes[0].Point if len(e.Vertexes) > 0 else None
                v1 = e.Vertexes[1].Point if len(e.Vertexes) > 1 else None
                edges.append({
                    "index": i,
                    "length": e.Length,
                    "startVertex": _vec(v0) if v0 is not None else None,
                    "endVertex": _vec(v1) if v1 is not None else None,
                })
            entry["topology"] = {"faces": faces, "edges": edges}
    else:
        entry["volume"] = None

    if obj.TypeId == "Spreadsheet::Sheet":
        cells = {}
        try:
            for c in obj.Cells:
                content = obj.get(c).Content
                expr = obj.get(c).Expression
                cells[c] = {
                    "value": content,
                    "expression": expr if expr is not None else None,
                }
        except Exception:
            cells = {}
        entry["spreadsheet"] = cells

    return entry

snapshot_objects = [_snapshot_object(o, ${includeTopologyFlag}) for o in objects]
_mcp_result["result"] = {
    "document": doc.Name,
    "objects": snapshot_objects,
}
`,
        );
      }

      case 'freecad_diff_snapshot': {
        const snapshotA = validateString(args.snapshotA, 'snapshotA');
        const snapshotB = validateString(args.snapshotB, 'snapshotB');

        let expectedChanges: string[] | undefined;
        if (args.expectedChanges !== undefined) {
          const arr = validateArray(args.expectedChanges, 'expectedChanges');
          expectedChanges = arr.map((item, idx) => validateString(item, `expectedChanges[${idx}]`));
        }

        let tolerance = 0.001;
        if (args.tolerance !== undefined) {
          tolerance = validateNumber(args.tolerance, 'tolerance', { min: 0 });
        }

        let parsedA: any;
        let parsedB: any;

        try {
          parsedA = JSON.parse(snapshotA);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text', text: `Invalid snapshot JSON: ${msg}` }],
            isError: true,
          };
        }

        try {
          parsedB = JSON.parse(snapshotB);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text', text: `Invalid snapshot JSON: ${msg}` }],
            isError: true,
          };
        }

        function extractObjects(parsed: any): any[] {
          if (!parsed || typeof parsed !== 'object') return [];
          if (Array.isArray(parsed.objects)) return parsed.objects;
          if (parsed.result && Array.isArray(parsed.result.objects)) return parsed.result.objects;
          return [];
        }

        const objectsA = extractObjects(parsedA);
        const objectsB = extractObjects(parsedB);

        const mapA = new Map<string, any>();
        for (const obj of objectsA) {
          if (obj && typeof obj.name === 'string') {
            mapA.set(obj.name, obj);
          }
        }

        const mapB = new Map<string, any>();
        for (const obj of objectsB) {
          if (obj && typeof obj.name === 'string') {
            mapB.set(obj.name, obj);
          }
        }

        const intact: string[] = [];
        const modified: string[] = [];
        const added: string[] = [];
        const removed: string[] = [];

        for (const name of mapA.keys()) {
          if (!mapB.has(name)) {
            removed.push(name);
          }
        }

        for (const name of mapB.keys()) {
          if (!mapA.has(name)) {
            added.push(name);
          }
        }

        for (const [name, objA] of mapA.entries()) {
          if (!mapB.has(name)) continue;
          const objB = mapB.get(name);

          let isModified = false;

          const volA = typeof objA.volume === 'number' && Number.isFinite(objA.volume) ? objA.volume : null;
          const volB = typeof objB.volume === 'number' && Number.isFinite(objB.volume) ? objB.volume : null;

          if (volA !== null || volB !== null) {
            if (volA === null || volB === null) {
              isModified = true;
            } else {
              const refVol = Math.abs(volA) > 0 ? Math.abs(volA) : 1;
              const volDiffFrac = Math.abs(volA - volB) / refVol;
              if (volDiffFrac > tolerance) {
                isModified = true;
              }
            }
          }

          if (!isModified) {
            const bbA = objA.boundBox;
            const bbB = objB.boundBox;
            if ((bbA && !bbB) || (!bbA && bbB)) {
              isModified = true;
            } else if (bbA && bbB) {
              const keys = ['XMin', 'YMin', 'ZMin', 'XMax', 'YMax', 'ZMax'] as const;
              for (const k of keys) {
                const valA = typeof bbA[k] === 'number' ? bbA[k] : 0;
                const valB = typeof bbB[k] === 'number' ? bbB[k] : 0;
                const refVal = Math.abs(valA) > 0 ? Math.abs(valA) : 1;
                if (Math.abs(valA - valB) / refVal > tolerance) {
                  isModified = true;
                  break;
                }
              }
            }
          }

          if (!isModified) {
            const facesA = Array.isArray(objA.topology?.faces) ? objA.topology.faces.length : 0;
            const facesB = Array.isArray(objB.topology?.faces) ? objB.topology.faces.length : 0;
            if (facesA !== facesB) {
              isModified = true;
            }
          }

          if (isModified) {
            modified.push(name);
          } else {
            intact.push(name);
          }
        }

        const expectedSet = new Set(expectedChanges ?? []);
        const changedNames = new Set([...modified, ...added, ...removed]);
        const regressions = Array.from(changedNames).filter((name) => !expectedSet.has(name));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                intact,
                modified,
                added,
                removed,
                regressions,
              }),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown state tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: errorMessage }],
      isError: true,
    };
  }
}
