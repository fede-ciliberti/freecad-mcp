import { FreeCADBridge } from '../freecad-bridge.js';
import { ToolResult, ToolArgs } from '../types.js';
import { validateObjectName, validateString } from '../validation.js';

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
