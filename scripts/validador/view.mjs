// Validación del módulo view contra FreeCAD (GUI o Headless).
import fs from 'node:fs';
import path from 'node:path';
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleViewTool, VIEW_TOOLS } from '../../dist/tools/view.js';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleViewTool, name, args);

const results = [];

try {
  // Crear directorio temporal para los PNGs
  const tmpDir = path.resolve('/tmp/freecad_mcp_view_tests');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Detectar si FreeCAD está en GUI mode o headless
  const guiCheck = await bridge.execute(`
import FreeCAD
_mcp_result["result"] = {"guiUp": bool(getattr(FreeCAD, "GuiUp", False))}
`);
  const isGuiMode = Boolean(guiCheck.result?.guiUp);

  // Test (a) freecad_take_screenshot
  const screenshotPath = path.join(tmpDir, 'test_screenshot.png');
  if (fs.existsSync(screenshotPath)) {
    fs.unlinkSync(screenshotPath);
  }

  if (isGuiMode) {
    // Asegurar documento activo con un objeto
    await bridge.execute(`
if FreeCAD.ActiveDocument is None:
    FreeCAD.newDocument("ViewTestDoc")
doc = FreeCAD.ActiveDocument
if not doc.getObject("Box"):
    doc.addObject("Part::Box", "Box")
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);
    const resA = await R('freecad_take_screenshot', { filePath: screenshotPath, width: 800, height: 600 });
    if (resA.ok) {
      if (!fs.existsSync(screenshotPath) || fs.statSync(screenshotPath).size === 0) {
        resA.ok = false;
        resA.text = `Screenshot file does not exist or is empty at ${screenshotPath}`;
      }
    }
    report(resA);
    results.push(resA);
  } else {
    // En headless: invocar y verificar error claro "requires FreeCAD GUI"
    const resA = await R('freecad_take_screenshot', { filePath: screenshotPath });
    if (!resA.ok && resA.text.includes('requires FreeCAD GUI')) {
      resA.ok = true;
      resA.text = 'Correctly returned GUI-only error in headless mode';
    } else {
      resA.ok = false;
      resA.text = `Expected "requires FreeCAD GUI" error in headless, got ok=${resA.ok}, text=${resA.text}`;
    }
    report(resA);
    results.push(resA);
  }

  // Test (c) freecad_capture_views
  const captureDir = path.join(tmpDir, 'capture_views_out');
  if (!fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir, { recursive: true });
  }

  if (isGuiMode) {
    const resC = await R('freecad_capture_views', { outputDir: captureDir, width: 400, height: 300 });
    if (resC.ok) {
      const expectedViews = ['view_0.png', 'view_90.png', 'view_180.png', 'view_270.png'];
      const missingOrEmpty = [];
      for (const viewFile of expectedViews) {
        const fullPath = path.join(captureDir, viewFile);
        if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size === 0) {
          missingOrEmpty.push(viewFile);
        }
      }
      if (missingOrEmpty.length > 0) {
        resC.ok = false;
        resC.text = `Missing or empty view files in ${captureDir}: ${missingOrEmpty.join(', ')}`;
      }
    }
    report(resC);
    results.push(resC);
  } else {
    // En headless: invocar y verificar error claro "requires FreeCAD GUI"
    const resC = await R('freecad_capture_views', { outputDir: captureDir });
    if (!resC.ok && resC.text.includes('requires FreeCAD GUI')) {
      resC.ok = true;
      resC.text = 'Correctly returned GUI-only error in headless mode';
    } else {
      resC.ok = false;
      resC.text = `Expected "requires FreeCAD GUI" error in headless, got ok=${resC.ok}, text=${resC.text}`;
    }
    report(resC);
    results.push(resC);
  }

  // QA failure test: Path traversal (../../../etc/passwd.png) -> validateFilePath bloquea antes de ejecutar Python
  const resQA = await R('freecad_take_screenshot', { filePath: '../../../etc/passwd.png' });
  if (!resQA.ok && (resQA.text.includes('Invalid filePath') || resQA.text.includes('path') || resQA.text.includes('absolute'))) {
    console.log(`[PASS] QA failure test: Path traversal blocked by validateFilePath: ${resQA.text}`);
  } else {
    console.log(`[FAIL] QA failure test: Path traversal was not blocked as expected: ${resQA.text}`);
  }

  // QA failure test 2: Explicit path traversal (/tmp/../../../etc/passwd.png)
  const resQA2 = await R('freecad_take_screenshot', { filePath: '/tmp/../../../etc/passwd.png' });
  if (!resQA2.ok && (resQA2.text.includes('path traversal detected') || resQA2.text.includes('access to /etc/ is not allowed') || resQA2.text.includes('Invalid filePath'))) {
    console.log(`[PASS] QA failure test 2: Explicit path traversal blocked by validateFilePath: ${resQA2.text}`);
  } else {
    console.log(`[FAIL] QA failure test 2: Explicit path traversal was not blocked: ${resQA2.text}`);
  }

  // Cobertura de VIEW_TOOLS
  const testedNames = new Set(results.map(r => r.name));
  const expectedTools = VIEW_TOOLS.map(t => t.name);
  for (const toolName of expectedTools) {
    if (!testedNames.has(toolName)) {
      throw new Error(`Falta test para la tool: ${toolName}`);
    }
  }

} finally {
  bridge.destroy();
}

// Guardar resultados en scripts/resultados/view.txt
const outputLines = results.map(r => {
  const status = r.ok ? 'PASS' : 'FAIL';
  let line = `[${status}] ${r.name}`;
  if (!r.ok) {
    line += `\n        ${r.text}`;
  }
  return line;
});

const resPath = path.resolve('scripts/resultados/view.txt');
fs.writeFileSync(resPath, outputLines.join('\n') + '\n', 'utf-8');
console.log(`\nResumen guardado en ${resPath}`);
