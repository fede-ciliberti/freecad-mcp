// Runner aislado para una sola tool del MCP.
// Uso: node run-tool.mjs --module bim --tool freecad_arch_wall --args '{"length":1000}' --setup '...python...'
// Salida: JSON en stdout con {name, ok, text, category}

import { createBridge, runFull } from '../fc-validate.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, arg, i, arr) => {
    if (arg.startsWith('--') && arr[i + 1]) {
      acc.push([arg.slice(2), arr[i + 1]]);
    }
    return acc;
  }, [])
);

const moduleName = args.module;
const toolName = args.tool;
const toolArgs = args.args ? JSON.parse(args.args) : {};
const setupCode = args.setup || '';

const handlers = {
  bim: () => import('../../dist/tools/bim.js').then(m => m.handleBimTool),
  fem: () => import('../../dist/tools/fem.js').then(m => m.handleFemTool),
  surface: () => import('../../dist/tools/surface.js').then(m => m.handleSurfaceTool),
  assembly: () => import('../../dist/tools/assembly.js').then(m => m.handleAssemblyTool),
};

function categorizeError(text) {
  const t = text.toLowerCase();
  if (t.includes('no module named') || t.includes('modulenotfound') || t.includes('cannot import')) {
    return '[requiereMóduloExterno]';
  }
  if (t.includes('is not a document object type') || t.includes('attributeerror') || t.includes('object has no attribute') || t.includes('has no attribute')) {
    return '[API-ROTA]';
  }
  if (t.includes('makeSolverCalculixCcxTools') || t.includes('makesolvercalculixccxtools')) {
    return '[API-ROTA]';
  }
  if (t.includes('calculix') || t.includes('ccx') || t.includes('gmsh') || t.includes('binary') || t.includes('not found') || t.includes('segmentation') || t.includes('sigsegv')) {
    return '[requiereBinarioExterno/entorno]';
  }
  if (t.includes('valueerror') || t.includes('not found') || t.includes('missing') || t.includes('invalid')) {
    return '[validación]';
  }
  return '[API-ROTA]';
}

async function main() {
  const handlerLoader = handlers[moduleName];
  if (!handlerLoader) {
    console.log(JSON.stringify({ name: toolName, ok: false, text: `Unknown module: ${moduleName}`, category: '[validación]' }));
    process.exit(0);
  }

  const handler = await handlerLoader();
  const bridge = createBridge();

  try {
    if (setupCode) {
      const setupResult = await bridge.execute(setupCode);
      if (!setupResult.success) {
        bridge.destroy();
        const text = `SETUP FAILED: ${setupResult.error}`;
        console.log(JSON.stringify({ name: toolName, ok: false, text, category: categorizeError(text) }));
        process.exit(0);
      }
    }

    const result = await runFull(bridge, handler, toolName, toolArgs);
    const category = result.ok ? '[PASS]' : categorizeError(result.text);
    console.log(JSON.stringify({ ...result, category }));
  } catch (e) {
    const text = `RUNNER EXCEPTION: ${e.message}`;
    console.log(JSON.stringify({ name: toolName, ok: false, text, category: categorizeError(text) }));
  } finally {
    bridge.destroy();
  }
}

main();
