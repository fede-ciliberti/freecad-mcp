import { FreeCADBridge } from '../../dist/freecad-bridge.js';
import { writeFile } from 'node:fs/promises';

const FREECAD_CMD =
  process.env.FREECAD_CMD ||
  '/home/fciliberti/Trabajos/Tools/freecad-bin/squashfs-root/usr/bin/freecadcmd';

async function runQA() {
  const outputs = [];
  const log = (msg) => {
    console.log(msg);
    outputs.push(msg);
  };

  log('=== Starting FreeCAD Bridge Serialization QA ===');
  log(`FREECAD_CMD: ${FREECAD_CMD}`);

  const bridge = new FreeCADBridge(FREECAD_CMD);
  bridge.useSocket = false; // Fuerce headless

  // Test Case (b): Quantity object conversion
  log('\n--- Test (b): FreeCAD.Units.Quantity conversion ---');
  const codeB = `_mcp_result["result"] = {"len": FreeCAD.Units.Quantity("10 mm")}`;
  log(`Executing code: ${codeB}`);
  const resB = await bridge.execute(codeB);
  log(`Result (b): ${JSON.stringify(resB)}`);

  const passB =
    resB.success === true &&
    resB.result &&
    resB.result.len === 10.0 &&
    resB.error === undefined;
  log(`Test (b) PASS: ${passB}`);

  // Test Case (c): Non-serializable object handling
  log('\n--- Test (c): Non-serializable object error handling ---');
  const codeC = `class X: pass\n_mcp_result["result"] = {"x": X()}`;
  log(`Executing code: ${codeC}`);
  const resC = await bridge.execute(codeC);
  log(`Result (c): ${JSON.stringify(resC)}`);

  const passC =
    resC.success === false &&
    typeof resC.error === 'string' &&
    resC.error.includes('JSON serialization error:');
  log(`Test (c) PASS: ${passC}`);

  const overallPass = passB && passC;
  log(`\n=== OVERALL QA RESULT: ${overallPass ? 'PASS' : 'FAIL'} ===`);

  await writeFile('scripts/resultados/bridge-qa.txt', outputs.join('\n') + '\n', 'utf-8');

  // Terminate headless process if running
  if (bridge['process']) {
    try {
      bridge['process'].kill();
    } catch (e) {}
  }

  process.exit(overallPass ? 0 : 1);
}

runQA().catch((err) => {
  console.error('QA script error:', err);
  process.exit(1);
});
