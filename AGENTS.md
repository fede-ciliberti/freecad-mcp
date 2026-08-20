# AGENTS.md

Servidor MCP de TypeScript (ESM, `type: module`) para modelado CAD paramétrico con FreeCAD. ~165 tools repartidas en 15 módulos.

## Comandos

- `npm run build` — `tsc` (compila `src/` → `dist/`). Es el único paso de verificación; **no hay suite de tests** (`npm test` no existe).
- `npm run dev` — `tsc && node dist/index.js`.
- `npm start` — corre `dist/index.js`.
- No hay linter ni formatter configurado.

## Arquitectura

- `src/index.ts` — entrypoint del server MCP. Registra tools vía 4 lugares: import del módulo, spread en `ALL_TOOLS`, entrada en el mapa `TOOL_HANDLERS` (tool name → módulo), y `case` en el `switch` de `CallToolRequestSchema`.
- `src/freecad-bridge.ts` — `FreeCADBridge`. **Dos modos con auto-detección en la primera llamada**: socket (conecta a la GUI de FreeCAD con el macro corriendo, `127.0.0.1:12345`) o headless (spawn `freecadcmd` + REPL). Si el socket falla a mitad de sesión, baja a headless automáticamente.
- `src/tools/*.ts` — 15 módulos. Cada uno exporta `<MODULO>_TOOLS` (array de schemas) y `handle<Modulo>Tool(name, args, bridge)`. Cada tool inyecta código Python que se ejecuta vía `bridge.run(...)`.
- `src/validation.ts` — helpers obligatorios de validación runtime (`validateNumber`, `validatePositiveNumber`, `validateString`, `validateObjectName`, `validateFilePath`, `validateArray`, `escapePythonString`).
- `src/types.ts` — `FreeCADResult`, `ToolArgs`, `ToolResult`.
- `freecad_server.FCMacro` — servidor socket Python que corre dentro de la GUI de FreeCAD (no es Node).

## Gotchas

- **El path default de `freecadcmd` es macOS**: `/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd`. En Linux, sin `FREECAD_CMD` seteado, el modo headless falla. Para probar/desarrollar en Linux setear `FREECAD_CMD=/path/to/freecadcmd`.
- **GUI mode requiere el macro antes**: `freecad_server.FCMacro` debe estar ejecutándose en FreeCAD GUI antes de que el server se conecte. El puerto socket `12345` está hardcodeado en `freecad-bridge.ts` y en el macro.
- **Seguridad de strings en Python — crítico**: nunca interpolar strings de usuario directamente en el código Python. Usar `JSON.stringify()` (como en `document.ts`) o `escapePythonString`/`escapeString` antes de embeber. `freecad_execute_python` ejecuta código arbitrario por diseño — tool peligrosa, solo entornos confiables.
- **Validación de paths**: todo `filePath` debe pasar por `validateFilePath()` (bloquea path traversal y paths de sistema `/etc/`, `/proc/`, etc.). Imports/exports requieren paths absolutos.
- **Toda tool nueva debe tener validación runtime** para todos sus parámetros numéricos/strings (rango, sanitización).

## Agregar una tool nueva

1. Editá el archivo del módulo en `src/tools/`: definí el schema `inputSchema` y agregá un `case` en el handler.
2. Registrala en `src/index.ts`: import del módulo (si es nuevo), spread en `ALL_TOOLS`, entrada en `TOOL_HANDLERS`, y `case` en el `switch`. Olvidar cualquiera de estos = tool invisible o error "Unknown tool".
3. Validá todos los inputs.
4. `npm run build` para verificar.
