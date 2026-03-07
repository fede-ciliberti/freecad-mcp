// FreeCAD MCP Server Types

export interface FreeCADResult {
  success: boolean;
  result?: unknown;
  error?: string;
  output?: string;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  xMin: number;
  yMin: number;
  zMin: number;
  xMax: number;
  yMax: number;
  zMax: number;
}

export interface ObjectInfo {
  name: string;
  label: string;
  typeName: string;
  shape?: {
    volume: number;
    area: number;
    boundingBox: BoundingBox;
  };
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export type ToolArgs = Record<string, unknown>;
