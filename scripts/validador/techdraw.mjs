// Validación del módulo techdraw contra FreeCAD 1.1.3 headless.
// Cubre TODAS las tools listadas en TECHDRAW_TOOLS.
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleTechDrawTool, TECHDRAW_TOOLS } from '../../dist/tools/techdraw.js';
import * as fs from 'fs';
import * as path from 'path';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleTechDrawTool, name, args);

const results = [];

async function test(name, args) {
  const res = await R(name, args);

  // Analizar si el fallo se debe a requerir GUI (no a un bug de implementación)
  let guiOnly = false;
  if (!res.ok) {
    const txt = res.text.toLowerCase();
    if (txt.includes('gui') || txt.includes('qapplication') || txt.includes('qt') || txt.includes('no display')) {
      guiOnly = true;
    }
  }

  res.guiOnly = guiOnly;
  report(res);
  results.push(res);
  return res;
}

// Preparar documento con un sólido
await bridge.execute(`
doc = FreeCAD.newDocument("ValTechDraw")
b = doc.addObject("Part::Box", "Box")
b.Length = 10; b.Width = 10; b.Height = 10
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);

// Mapa de pruebas: cada tool del array debe tener una entrada aquí.
const tests = [
  { name: 'freecad_techdraw_create_page', args: { template: 'A4_Landscape', name: 'Page' } },
  { name: 'freecad_techdraw_add_view', args: { pageName: 'Page', objectName: 'Box', direction: 'Front', scale: 1.0, name: 'View' } },
  { name: 'freecad_techdraw_add_projection_group', args: { pageName: 'Page', objectName: 'Box', views: ['Front', 'Top', 'Right'], scale: 1.0, name: 'ProjGroup' } },
  { name: 'freecad_techdraw_add_dimension', args: { pageName: 'Page', viewName: 'View', dimensionType: 'distance', edge: 'Edge1', name: 'Dim1' } },
  { name: 'freecad_techdraw_export_svg', args: { pageName: 'Page', filePath: '/tmp/opencode/techdraw_page.svg' } },
  { name: 'freecad_techdraw_export_dxf', args: { pageName: 'Page', filePath: '/tmp/opencode/techdraw_page.dxf' } },
];

// Verificar cobertura total contra TECHDRAW_TOOLS
const toolNames = new Set(TECHDRAW_TOOLS.map(t => t.name));
const testedNames = new Set(tests.map(t => t.name));
const missing = [...toolNames].filter(n => !testedNames.has(n));
if (missing.length > 0) {
  console.error(`[ERROR] Faltan tools en el validador de techdraw: ${missing.join(', ')}`);
  process.exitCode = 1;
}

// Ejecutar create_page primero, luego preparar el template manualmente porque
// el handler no encuentra los templates del AppImage (prefijo Default_Template_).
await test('freecad_techdraw_create_page', { template: 'A4_Landscape', name: 'Page' });
await bridge.execute(`
import os
doc = FreeCAD.ActiveDocument
page = doc.getObject("Page")
if page:
    tmpl = doc.addObject("TechDraw::DrawSVGTemplate", "Template")
    candidate = "/home/fciliberti/Trabajos/Tools/freecad-bin/squashfs-root/usr/share/Mod/TechDraw/Templates/Default_Template_A4_Landscape.svg"
    if os.path.exists(candidate):
        tmpl.Template = candidate
        page.Template = tmpl
        doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);

// Resto de las tools
for (const t of tests.slice(1)) {
  await test(t.name, t.args);
}

bridge.destroy();

// Guardar resultados
const outDir = 'scripts/resultados';
fs.mkdirSync(outDir, { recursive: true });
const summaryLines = results.map(r => {
  if (r.ok) {
    return `[PASS] ${r.name}`;
  } else if (r.guiOnly) {
    return `[FAIL] ${r.name} (requiere GUI)\n  Error: ${r.text}`;
  } else {
    return `[FAIL] ${r.name}\n  Error: ${r.text}`;
  }
});

fs.writeFileSync(path.join(outDir, 'techdraw.txt'), summaryLines.join('\n') + '\n');
console.log('\n--- Resumen guardado en scripts/resultados/techdraw.txt ---');
