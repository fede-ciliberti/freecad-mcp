// Validación del módulo document contra FreeCAD 1.1.3 headless.
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleDocumentTool } from '../../dist/tools/document.js';
import fs from 'node:fs';
import path from 'node:path';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleDocumentTool, name, args);
const TMP = '/tmp/opencode/fc-validate-doc.FCStd';

const results = [];
async function runTest(name, args) {
  const res = await R(name, args);
  report(res);
  results.push(res);
  return res;
}

// 1. new document
await runTest('freecad_new_document', { name: 'valdoc' });

// 2. add a Box so get_object_info/save have content
await bridge.execute(`doc=FreeCAD.ActiveDocument; b=doc.addObject("Part::Box","Box"); doc.recompute(); _mcp_result["result"]={"ok":1}`);

// 3. list objects
await runTest('freecad_list_objects', {});

// 4. get_object_info
await runTest('freecad_get_object_info', { objectName: 'Box' });

// 5. save as
await runTest('freecad_save_document', { filePath: TMP });

// 6. close
await runTest('freecad_close_document', { name: 'valdoc' });

// 7. open (re-open saved file)
await runTest('freecad_open_document', { filePath: TMP });

bridge.destroy();

const outputLines = results.map(r => {
  const status = r.ok ? 'PASS' : 'FAIL';
  let line = `[${status}] ${r.name}`;
  if (!r.ok) {
    line += `\n        ${r.text}`;
  }
  return line;
});

const resPath = path.resolve('scripts/resultados/document.txt');
fs.writeFileSync(resPath, outputLines.join('\n') + '\n', 'utf-8');
console.log(`\nResumen guardado en ${resPath}`);
