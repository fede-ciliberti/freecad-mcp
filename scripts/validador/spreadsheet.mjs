// Validación del módulo spreadsheet contra FreeCAD 1.1.3 headless.
// Cubre TODAS las tools listadas en SPREADSHEET_TOOLS.
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleSpreadsheetTool, SPREADSHEET_TOOLS } from '../../dist/tools/spreadsheet.js';
import * as fs from 'fs';
import * as path from 'path';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleSpreadsheetTool, name, args);

const results = [];

async function test(name, args) {
  const res = await R(name, args);
  report(res);
  results.push(res);
  return res;
}

// Preparar documento con un objeto para vincular expresiones
await bridge.execute(`
doc = FreeCAD.newDocument("ValSpreadsheet")
b = doc.addObject("Part::Box", "Box")
b.Length = 10; b.Width = 10; b.Height = 10
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);

// Mapa de pruebas: cada tool del array debe tener una entrada aquí.
const tests = [
  { name: 'freecad_spreadsheet_create', args: { name: 'Spreadsheet' } },
  { name: 'freecad_spreadsheet_set', args: {
    sheetName: 'Spreadsheet',
    cells: [
      { cell: 'A1', value: '10' },
      { cell: 'A2', value: '20' },
      { cell: 'A3', value: '=A1+A2' },
    ],
  } },
  { name: 'freecad_spreadsheet_alias', args: { sheetName: 'Spreadsheet', cell: 'A1', alias: 'BoxWidth' } },
  { name: 'freecad_spreadsheet_get', args: { sheetName: 'Spreadsheet', cells: ['A1', 'A2', 'A3'] } },
  { name: 'freecad_set_expression', args: { objectName: 'Box', property: 'Width', expression: 'Spreadsheet.BoxWidth' } },
];

// Verificar cobertura total contra SPREADSHEET_TOOLS
const toolNames = new Set(SPREADSHEET_TOOLS.map(t => t.name));
const testedNames = new Set(tests.map(t => t.name));
const missing = [...toolNames].filter(n => !testedNames.has(n));
if (missing.length > 0) {
  console.error(`[ERROR] Faltan tools en el validador de spreadsheet: ${missing.join(', ')}`);
  process.exitCode = 1;
}

for (const t of tests) {
  await test(t.name, t.args);
}

bridge.destroy();

// Guardar resultados
const outDir = 'scripts/resultados';
fs.mkdirSync(outDir, { recursive: true });
const summaryLines = results.map(r => {
  const status = r.ok ? 'PASS' : 'FAIL';
  return `[${status}] ${r.name}${r.ok ? '' : '\n  Error: ' + r.text}`;
});

fs.writeFileSync(path.join(outDir, 'spreadsheet.txt'), summaryLines.join('\n') + '\n');
console.log('\n--- Resumen guardado en scripts/resultados/spreadsheet.txt ---');
