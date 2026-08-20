// Validación del módulo document contra FreeCAD 1.1.3 headless.
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleDocumentTool } from '../../dist/tools/document.js';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleDocumentTool, name, args);
const TMP = '/tmp/opencode/fc-validate-doc.FCStd';

// 1. new document
report(await R('freecad_new_document', { name: 'valdoc' }));

// 2. add a Box so get_object_info/save have content
await bridge.execute(`doc=FreeCAD.ActiveDocument; b=doc.addObject("Part::Box","Box"); doc.recompute(); _mcp_result["result"]={"ok":1}`);

// 3. list objects
report(await R('freecad_list_objects', {}));

// 4. get_object_info
report(await R('freecad_get_object_info', { objectName: 'Box' }));

// 5. save as
report(await R('freecad_save_document', { filePath: TMP }));

// 6. close
report(await R('freecad_close_document', { name: 'valdoc' }));

// 7. open (re-open saved file)
report(await R('freecad_open_document', { filePath: TMP }));

bridge.destroy();
