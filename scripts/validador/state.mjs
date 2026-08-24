// Validación del módulo state contra FreeCAD 1.1.3 headless.
import fs from 'node:fs';
import path from 'node:path';
import { createBridge, runFull, report } from '../fc-validate.mjs';
import { handleStateTool, STATE_TOOLS } from '../../dist/tools/state.js';

const bridge = createBridge();
const R = (name, args) => runFull(bridge, handleStateTool, name, args);

const results = [];

async function runTest(name, args) {
  const res = await R(name, args);
  report(res);
  results.push(res);
  return res;
}

try {
  // Configurar documento base para transacciones.
  // Habilitar UndoMode = 1 en FreeCAD para soportar Undo/Redo/Transactions en headless.
  await bridge.execute(`
if FreeCAD.ActiveDocument is not None:
    FreeCAD.closeDocument(FreeCAD.ActiveDocument.Name)
doc = FreeCAD.newDocument("StateDocA")
doc.UndoMode = 1
_mcp_result["result"] = {"ok": 1}
`);

  // (a) begin + box + commit -> OK
  await runTest('freecad_begin_transaction', { name: 'TxCommit' });
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
b = doc.addObject("Part::Box", "BoxCommit")
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);
  const resCommit = await runTest('freecad_commit_transaction', {});
  const checkA = await bridge.execute(`
doc = FreeCAD.ActiveDocument
_mcp_result["result"] = {"count": len(doc.Objects), "hasBox": doc.getObject("BoxCommit") is not None}
`);
  if (!checkA.result?.hasBox || checkA.result?.count !== 1) {
    resCommit.ok = false;
    resCommit.text = `Expected 1 object (BoxCommit), got count=${checkA.result?.count}`;
  }

  // (b) begin + box + abort -> Objects vacío
  await bridge.execute(`
if FreeCAD.ActiveDocument is not None:
    FreeCAD.closeDocument(FreeCAD.ActiveDocument.Name)
doc = FreeCAD.newDocument("StateDocB")
doc.UndoMode = 1
_mcp_result["result"] = {"ok": 1}
`);
  await runTest('freecad_begin_transaction', { name: 'TxAbort' });
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
b = doc.addObject("Part::Box", "BoxAbort")
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);
  const resAbort = await runTest('freecad_abort_transaction', {});
  const checkB = await bridge.execute(`
doc = FreeCAD.ActiveDocument
_mcp_result["result"] = {"count": len(doc.Objects)}
`);
  if (checkB.result?.count !== 0) {
    resAbort.ok = false;
    resAbort.text = `Expected 0 objects after abort, got count=${checkB.result?.count}`;
  }

  // (c) y (d) undo después de commit -> box desaparece; redo -> box reaparece
  await bridge.execute(`
if FreeCAD.ActiveDocument is not None:
    FreeCAD.closeDocument(FreeCAD.ActiveDocument.Name)
doc = FreeCAD.newDocument("StateDocCD")
doc.UndoMode = 1
_mcp_result["result"] = {"ok": 1}
`);
  await handleStateTool('freecad_begin_transaction', { name: 'TxUndoRedo' }, bridge);
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
b = doc.addObject("Part::Box", "BoxUndoRedo")
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);
  await handleStateTool('freecad_commit_transaction', {}, bridge);

  // Test (c): undo
  const resUndo = await runTest('freecad_undo', {});
  const checkC = await bridge.execute(`
doc = FreeCAD.ActiveDocument
_mcp_result["result"] = {"count": len(doc.Objects)}
`);
  if (checkC.result?.count !== 0) {
    resUndo.ok = false;
    resUndo.text = `Expected 0 objects after undo, got count=${checkC.result?.count}`;
  }

  // Test (d): redo
  const resRedo = await runTest('freecad_redo', {});
  const checkD = await bridge.execute(`
doc = FreeCAD.ActiveDocument
_mcp_result["result"] = {"count": len(doc.Objects)}
`);
  if (checkD.result?.count !== 1) {
    resRedo.ok = false;
    resRedo.text = `Expected 1 object after redo, got count=${checkD.result?.count}`;
  }

  // Test (e): snapshot_document
  await bridge.execute(`
if FreeCAD.ActiveDocument is not None:
    FreeCAD.closeDocument(FreeCAD.ActiveDocument.Name)
doc = FreeCAD.newDocument("StateDocSnap")
b = doc.addObject("Part::Box", "BoxSnap")
b.Length = 10
b.Width = 10
b.Height = 10
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);
  const resSnap = await runTest('freecad_snapshot_document', {});
  if (resSnap.ok) {
    try {
      const snapData = JSON.parse(resSnap.text);
      const snap = snapData.result ?? snapData;
      if (!snap.objects || snap.objects.length !== 1) {
        resSnap.ok = false;
        resSnap.text = `Expected 1 object in snapshot, got ${snap.objects?.length}`;
      } else {
        const obj = snap.objects[0];
        const vol = obj.volume;
        const facesCount = obj.topology?.faces?.length;
        if (typeof vol !== 'number' || Math.abs(vol - 1000) >= 1) {
          resSnap.ok = false;
          resSnap.text = `Expected volume ~1000, got ${vol}`;
        } else if (facesCount !== 6) {
          resSnap.ok = false;
          resSnap.text = `Expected 6 faces in topology, got ${facesCount}`;
        }
      }
    } catch (e) {
      resSnap.ok = false;
      resSnap.text = `Failed to parse snapshot JSON: ${e.message}`;
    }
  }

  // QA failure / option test: snapshot con includeTopology: false
  const resNoTopo = await R('freecad_snapshot_document', { includeTopology: false });
  if (resNoTopo.ok) {
    try {
      const parsedNoTopo = JSON.parse(resNoTopo.text);
      const snapNoTopo = parsedNoTopo.result ?? parsedNoTopo;
      const objNoTopo = snapNoTopo.objects?.[0];
      if (objNoTopo && (objNoTopo.topology === undefined || objNoTopo.topology === null)) {
        console.log(`[PASS] QA failure test: freecad_snapshot_document with includeTopology: false has no topology`);
      } else {
        console.log(`[FAIL] QA failure test: freecad_snapshot_document expected topology to be undefined/null, got ${JSON.stringify(objNoTopo?.topology)}`);
      }
    } catch (e) {
      console.log(`[FAIL] QA failure test: freecad_snapshot_document parse error: ${e.message}`);
    }
  } else {
    console.log(`[FAIL] QA failure test: freecad_snapshot_document with includeTopology: false returned error: ${resNoTopo.text}`);
  }

  // Test (f): diff_snapshot
  const snapA = JSON.stringify({ objects: [{ name: "BoxSnap", volume: 1000, boundBox: { XMin: 0, YMin: 0, ZMin: 0, XMax: 10, YMax: 10, ZMax: 10 } }] });
  const snapB = JSON.stringify({ objects: [{ name: "BoxSnap", volume: 1000, boundBox: { XMin: 0, YMin: 0, ZMin: 0, XMax: 10, YMax: 10, ZMax: 10 } }] });
  await runTest('freecad_diff_snapshot', { snapshotA: snapA, snapshotB: snapB });

  // QA failure test: abortTransaction sobre documento inexistente
  const failRes = await R('freecad_abort_transaction', { documentName: 'InexistentDoc' });
  if (!failRes.ok) {
    console.log(`[PASS] QA failure test: freecad_abort_transaction captured error: ${failRes.text}`);
  } else {
    console.log(`[FAIL] QA failure test: freecad_abort_transaction expected error but succeeded`);
  }

  // Verificar cobertura de STATE_TOOLS
  const testedNames = new Set(results.map(r => r.name));
  const expectedTools = STATE_TOOLS.map(t => t.name);
  for (const toolName of expectedTools) {
    if (!testedNames.has(toolName)) {
      throw new Error(`Falta test para la tool: ${toolName}`);
    }
  }

} finally {
  bridge.destroy();
}

// Guardar resultados en scripts/resultados/state.txt
const outputLines = results.map(r => {
  const status = r.ok ? 'PASS' : 'FAIL';
  let line = `[${status}] ${r.name}`;
  if (!r.ok) {
    line += `\n        ${r.text}`;
  }
  return line;
});

const resPath = path.resolve('scripts/resultados/state.txt');
fs.writeFileSync(resPath, outputLines.join('\n') + '\n', 'utf-8');
console.log(`\nResumen guardado en ${resPath}`);
