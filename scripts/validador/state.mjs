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
  // Escenario 1: crear doc + box 10x10x10 -> snapA; modificar box a 20x20x20 -> snapB; diff A/B con expectedChanges: ["Box"]
  await bridge.execute(`
if FreeCAD.ActiveDocument is not None:
    FreeCAD.closeDocument(FreeCAD.ActiveDocument.Name)
doc = FreeCAD.newDocument("StateDocDiff")
b = doc.addObject("Part::Box", "Box")
b.Length = 10
b.Width = 10
b.Height = 10
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);
  const resSnapA = await R('freecad_snapshot_document', { includeTopology: false });
  const snapA = resSnapA.text;

  await bridge.execute(`
doc = FreeCAD.ActiveDocument
b = doc.getObject("Box")
b.Length = 20
b.Width = 20
b.Height = 20
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);
  const resSnapB = await R('freecad_snapshot_document', { includeTopology: false });
  const snapB = resSnapB.text;

  const resDiff1 = await runTest('freecad_diff_snapshot', {
    snapshotA: snapA,
    snapshotB: snapB,
    expectedChanges: ['Box'],
  });

  if (resDiff1.ok) {
    try {
      const diff1 = JSON.parse(resDiff1.text);
      const hasBoxModified = Array.isArray(diff1.modified) && diff1.modified.includes('Box');
      const noRegressions = Array.isArray(diff1.regressions) && diff1.regressions.length === 0;
      if (!hasBoxModified || !noRegressions) {
        resDiff1.ok = false;
        resDiff1.text = `Expected modified: ['Box'] and regressions: [], got ${resDiff1.text}`;
      }
    } catch (e) {
      resDiff1.ok = false;
      resDiff1.text = `Failed to parse diff1 JSON: ${e.message}`;
    }
  }

  // Escenario 2: agregar cylinder -> snapC; diff B/C sin expectedChanges -> regressions: ["Cylinder"]
  await bridge.execute(`
doc = FreeCAD.ActiveDocument
c = doc.addObject("Part::Cylinder", "Cylinder")
c.Radius = 5
c.Height = 20
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);
  const resSnapC = await R('freecad_snapshot_document', { includeTopology: false });
  const snapC = resSnapC.text;

  const resDiff2 = await runTest('freecad_diff_snapshot', {
    snapshotA: snapB,
    snapshotB: snapC,
  });

  if (resDiff2.ok) {
    try {
      const diff2 = JSON.parse(resDiff2.text);
      const hasCylinderRegression = Array.isArray(diff2.regressions) && diff2.regressions.includes('Cylinder');
      if (!hasCylinderRegression) {
        resDiff2.ok = false;
        resDiff2.text = `Expected regressions: ['Cylinder'], got ${resDiff2.text}`;
      }
    } catch (e) {
      resDiff2.ok = false;
      resDiff2.text = `Failed to parse diff2 JSON: ${e.message}`;
    }
  }

  // QA failure: diff con snapshots malformados (JSON inválido)
  const failDiffRes = await R('freecad_diff_snapshot', { snapshotA: 'not json', snapshotB: '{}' });
  if (!failDiffRes.ok && failDiffRes.text.includes('Invalid snapshot JSON')) {
    console.log(`[PASS] QA failure test: freecad_diff_snapshot with invalid JSON returned error: ${failDiffRes.text}`);
  } else {
    console.log(`[FAIL] QA failure test: freecad_diff_snapshot expected error for invalid JSON but got ok=${failDiffRes.ok}, text=${failDiffRes.text}`);
  }

  // QA failure test: abortTransaction sobre documento inexistente
  const failRes = await R('freecad_abort_transaction', { documentName: 'InexistentDoc' });
  if (!failRes.ok) {
    console.log(`[PASS] QA failure test: freecad_abort_transaction captured error: ${failRes.text}`);
  } else {
    console.log(`[FAIL] QA failure test: freecad_abort_transaction expected error but succeeded`);
  }

  // =========================================================================
  // Test End-to-End Pipeline (13 Pasos)
  // =========================================================================
  const resE2E = { name: 'freecad_e2e_pipeline (end-to-end)', ok: true, text: '' };
  const compact = (jsonStr) => JSON.stringify(JSON.parse(jsonStr));

  try {
    // Paso 1: Crear doc + hoja Parametros + W=20, L=30, H=10
    await bridge.execute(`
if FreeCAD.ActiveDocument is not None:
    FreeCAD.closeDocument(FreeCAD.ActiveDocument.Name)
doc = FreeCAD.newDocument("StateDocE2E")
doc.UndoMode = 1

import Part, Sketcher, PartDesign

sheet = doc.addObject("Spreadsheet::Sheet", "Parametros")
sheet.set("A1", "W"); sheet.set("B1", "20"); sheet.setAlias("B1", "Width")
sheet.set("A2", "L"); sheet.set("B2", "30"); sheet.setAlias("B2", "Length")
sheet.set("A3", "H"); sheet.set("B3", "10"); sheet.setAlias("B3", "Height")
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);

    // Paso 2: Crear sketch rectángulo vinculado a W/L
    await bridge.execute(`
doc = FreeCAD.ActiveDocument
import Part, Sketcher, PartDesign

sketch = doc.addObject("Sketcher::SketchObject", "Sketch")
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(0,0,0), FreeCAD.Vector(20,0,0)))
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(20,0,0), FreeCAD.Vector(20,30,0)))
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(20,30,0), FreeCAD.Vector(0,30,0)))
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(0,30,0), FreeCAD.Vector(0,0,0)))
sketch.addConstraint(Sketcher.Constraint("Coincident", 0, 2, 1, 1))
sketch.addConstraint(Sketcher.Constraint("Coincident", 1, 2, 2, 1))
sketch.addConstraint(Sketcher.Constraint("Coincident", 2, 2, 3, 1))
sketch.addConstraint(Sketcher.Constraint("Coincident", 3, 2, 0, 1))
sketch.addConstraint(Sketcher.Constraint("Horizontal", 0))
sketch.addConstraint(Sketcher.Constraint("Vertical", 1))
sketch.addConstraint(Sketcher.Constraint("Horizontal", 2))
sketch.addConstraint(Sketcher.Constraint("Vertical", 3))
sketch.addConstraint(Sketcher.Constraint("Coincident", 0, 1, -1, 1))

idxW = sketch.addConstraint(Sketcher.Constraint("DistanceX", 0, 20))
sketch.setExpression("Constraints[" + str(idxW) + "]", "Parametros.Width")
idxL = sketch.addConstraint(Sketcher.Constraint("DistanceY", 1, 30))
sketch.setExpression("Constraints[" + str(idxL) + "]", "Parametros.Length")
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);

    // Paso 3: Crear pad vinculado a H
    await bridge.execute(`
doc = FreeCAD.ActiveDocument
sketch = doc.getObject("Sketch")

pad = doc.addObject("PartDesign::Pad", "Pad")
pad.Profile = sketch
pad.setExpression("Length", "Parametros.Height")
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);

    // Paso 4: Snapshot A
    const resSnapA_E2E = await R('freecad_snapshot_document', { includeTopology: false });
    if (!resSnapA_E2E.ok) throw new Error(`Paso 4 Snapshot A fallo: ${resSnapA_E2E.text}`);
    const snapA_E2E = compact(resSnapA_E2E.text);

    // Paso 5: Crear pocket en cara superior
    await bridge.execute(`
doc = FreeCAD.ActiveDocument
import Part, Sketcher, PartDesign

sketchPocket = doc.addObject("Sketcher::SketchObject", "SketchPocket")
sketchPocket.addGeometry(Part.Circle(FreeCAD.Vector(10,15,0), FreeCAD.Vector(0,0,1), 5))

pocket = doc.addObject("PartDesign::Pocket", "Pocket")
pocket.Profile = sketchPocket
pocket.Length = 5.0
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);

    // Paso 6: Snapshot B
    const resSnapB_E2E = await R('freecad_snapshot_document', { includeTopology: false });
    if (!resSnapB_E2E.ok) throw new Error(`Paso 6 Snapshot B fallo: ${resSnapB_E2E.text}`);
    const snapB_E2E = compact(resSnapB_E2E.text);

    // Paso 7: Diff A/B con expectedChanges: ["Pocket", "SketchPocket"]
    const resDiffAB_E2E = await R('freecad_diff_snapshot', {
      snapshotA: snapA_E2E,
      snapshotB: snapB_E2E,
      expectedChanges: ['Pocket', 'SketchPocket'],
    });
    if (!resDiffAB_E2E.ok) throw new Error(`Paso 7 Diff A/B fallo: ${resDiffAB_E2E.text}`);
    const diffAB = JSON.parse(resDiffAB_E2E.text);
    if (!diffAB.added?.includes('Pocket') || !diffAB.intact?.includes('Pad') || !diffAB.intact?.includes('Sketch') || diffAB.regressions?.length !== 0) {
      throw new Error(`Paso 7 Diff A/B retornó resultados inesperados: ${resDiffAB_E2E.text}`);
    }

    // Paso 8 & 9: Modificar H=15 en Parametros y recompute
    await bridge.execute(`
doc = FreeCAD.ActiveDocument
sheet = doc.getObject("Parametros")
sheet.set("B3", "15")
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);

    // Paso 10: Snapshot C
    const resSnapC_E2E = await R('freecad_snapshot_document', { includeTopology: false });
    if (!resSnapC_E2E.ok) throw new Error(`Paso 10 Snapshot C fallo: ${resSnapC_E2E.text}`);
    const snapC_E2E = compact(resSnapC_E2E.text);

    // Paso 11: Diff B/C con expectedChanges: ["Pad"]
    const resDiffBC_E2E = await R('freecad_diff_snapshot', {
      snapshotA: snapB_E2E,
      snapshotB: snapC_E2E,
      expectedChanges: ['Pad'],
    });
    if (!resDiffBC_E2E.ok) throw new Error(`Paso 11 Diff B/C fallo: ${resDiffBC_E2E.text}`);
    const diffBC = JSON.parse(resDiffBC_E2E.text);

    // QA failure check: si diff B/C reporta regressions con "Pocket", es un TNP real no mitigado
    if (diffBC.regressions?.includes('Pocket')) {
      throw new Error(`Paso 11 Diff B/C detecto regresion no mitigada en Pocket (TNP real): ${resDiffBC_E2E.text}`);
    }
    if (!diffBC.modified?.includes('Pad') || !diffBC.intact?.includes('Pocket') || diffBC.regressions?.length !== 0) {
      throw new Error(`Paso 11 Diff B/C retornó resultados inesperados: ${resDiffBC_E2E.text}`);
    }

    // Paso 12: Forzar regresión -> abortTransaction restaura C
    await handleStateTool('freecad_begin_transaction', { name: 'TxE2ERegression' }, bridge);
    await bridge.execute(`
doc = FreeCAD.ActiveDocument
sketch = doc.getObject("Sketch")
doc.removeObject(sketch.Name)
doc.recompute()
_mcp_result["result"] = {"ok": 1}
`);
    await handleStateTool('freecad_abort_transaction', {}, bridge);

    // Paso 13: Snapshot D == C (diff D/C vacío)
    const resSnapD_E2E = await R('freecad_snapshot_document', { includeTopology: false });
    if (!resSnapD_E2E.ok) throw new Error(`Paso 13 Snapshot D fallo: ${resSnapD_E2E.text}`);
    const snapD_E2E = compact(resSnapD_E2E.text);

    const resDiffDC_E2E = await R('freecad_diff_snapshot', {
      snapshotA: snapC_E2E,
      snapshotB: snapD_E2E,
    });
    if (!resDiffDC_E2E.ok) throw new Error(`Paso 13 Diff D/C fallo: ${resDiffDC_E2E.text}`);
    const diffDC = JSON.parse(resDiffDC_E2E.text);
    if (diffDC.modified?.length !== 0 || diffDC.added?.length !== 0 || diffDC.removed?.length !== 0 || diffDC.regressions?.length !== 0) {
      throw new Error(`Paso 13 Diff D/C no esta vacio tras rollback: ${resDiffDC_E2E.text}`);
    }

    resE2E.text = 'Pipeline end-to-end de 13 pasos completado exitosamente';
  } catch (err) {
    resE2E.ok = false;
    resE2E.text = err.message;
  }

  report(resE2E);
  results.push(resE2E);

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
