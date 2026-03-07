#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { FreeCADBridge } from './freecad-bridge.js';

import { DOCUMENT_TOOLS, handleDocumentTool } from './tools/document.js';
import { PRIMITIVE_TOOLS, handlePrimitiveTool } from './tools/primitives.js';
import { OPERATION_TOOLS, handleOperationTool } from './tools/operations.js';
import { SKETCHER_TOOLS, handleSketcherTool } from './tools/sketcher.js';
import { PART_DESIGN_TOOLS, handlePartDesignTool } from './tools/part-design.js';
import { IMPORT_EXPORT_TOOLS, handleImportExportTool } from './tools/import-export.js';

const FREECAD_CMD = process.env.FREECAD_CMD || '/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd';

const ALL_TOOLS = [
  ...DOCUMENT_TOOLS,
  ...PRIMITIVE_TOOLS,
  ...OPERATION_TOOLS,
  ...SKETCHER_TOOLS,
  ...PART_DESIGN_TOOLS,
  ...IMPORT_EXPORT_TOOLS,
];

const TOOL_HANDLERS: Record<string, string> = {};
for (const tool of DOCUMENT_TOOLS) TOOL_HANDLERS[tool.name] = 'document';
for (const tool of PRIMITIVE_TOOLS) TOOL_HANDLERS[tool.name] = 'primitives';
for (const tool of OPERATION_TOOLS) TOOL_HANDLERS[tool.name] = 'operations';
for (const tool of SKETCHER_TOOLS) TOOL_HANDLERS[tool.name] = 'sketcher';
for (const tool of PART_DESIGN_TOOLS) TOOL_HANDLERS[tool.name] = 'part-design';
for (const tool of IMPORT_EXPORT_TOOLS) TOOL_HANDLERS[tool.name] = 'import-export';

class FreeCADMCPServer {
  private server: Server;
  private bridge: FreeCADBridge;

  constructor() {
    this.bridge = new FreeCADBridge(FREECAD_CMD);

    this.server = new Server(
      {
        name: 'freecad-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: ALL_TOOLS,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const safeArgs = (args || {}) as Record<string, unknown>;
      const module = TOOL_HANDLERS[name];

      if (!module) {
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
      }

      try {
        switch (module) {
          case 'document':
            return await handleDocumentTool(name, safeArgs, this.bridge);
          case 'primitives':
            return await handlePrimitiveTool(name, safeArgs, this.bridge);
          case 'operations':
            return await handleOperationTool(name, safeArgs, this.bridge);
          case 'sketcher':
            return await handleSketcherTool(name, safeArgs, this.bridge);
          case 'part-design':
            return await handlePartDesignTool(name, safeArgs, this.bridge);
          case 'import-export':
            return await handleImportExportTool(name, safeArgs, this.bridge);
          default:
            return {
              content: [{ type: 'text', text: `No handler for module: ${module}` }],
              isError: true,
            };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[FreeCAD MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(
      `FreeCAD MCP Server v1.0.0 running (cmd: ${FREECAD_CMD}, tools: ${ALL_TOOLS.length})`
    );
  }
}

const server = new FreeCADMCPServer();
server.run().catch((error) => {
  console.error('Failed to start FreeCAD MCP server:', error);
  process.exit(1);
});
