---
name: mcp-freecad-automejora
description: Orquesta la automejora continua del servidor MCP de FreeCAD (freecad-mcp). Usar SIEMPRE que una tool del MCP falle, falte o se comporte de forma inesperada, o cuando haya que implementar un gap de cobertura propuesto, planificar una mejora del MCP, o actualizar el conocimiento que la skill tiene del estado del MCP. Keywords: automejora, mejorar MCP, falla MCP, tool no existe, gap, cobertura, freecad-mcp, fix MCP, registrar evidencia, mejora continua.
---

# Skill: Automejora continua del MCP de FreeCAD

Esta skill es el **punto de entrada único** para el ciclo de mejora del servidor `freecad-mcp`. Contiene todo lo que un equipo de subagentes necesita para arrancar a trabajar sin re-descubrir nada: dónde vive el código, cómo se levanta, cuál es el ciclo de mejora, qué hacer tras modificar el MCP, y cómo la skill se mantiene sincronizada con el estado real del MCP.

> Principio rector: **cada falla o gap es una oportunidad de mejora que se lleva a cabo, no una excusa para estancarse.** Y cada interacción debe dejar el entorno mejor preparado que como lo encontró.

---

## 1. Dónde vive el MCP (rutas absolutas)

| Qué | Ruta |
|-----|------|
| **Repo del MCP** | `/home/fciliberti/Trabajos/Tools/freecad-mcp` |
| Entrypoint compilado | `/home/fciliberti/Trabajos/Tools/freecad-mcp/dist/index.js` |
| Binary de FreeCAD (headless) | `/home/fciliberti/Trabajos/Tools/freecad-bin/squashfs-root/usr/bin/freecadcmd` |
| Macro socket (modo GUI) | `/home/fciliberti/Trabajos/Tools/freecad-mcp/freecad_server.FCMacro` |

> **El repo está bajo nuestro control** (fork/instancia propia). Toda falla es corregible y toda tool faltante es implementable.

---

## 2. Cómo se levanta el MCP

El MCP **no es un servidor siempre activo**. Se levanta al cargar una skill de FreeCAD. Cada skill de FreeCAD trae su propio `mcp.json` que apunta al mismo entrypoint:

- Ejemplo: `/home/fciliberti/.agents/skills/freecad-parametric-part/mcp.json`
  - `command: node`, `args: ["/home/fciliberti/Trabajos/Tools/freecad-mcp/dist/index.js"]`
  - `env: FREECAD_CMD=/home/fciliberti/Trabajos/Tools/freecad-bin/squashfs-root/usr/bin/freecadcmd`

**Antes de operar:** si el MCP no está disponible en el entorno, cargar la skill de FreeCAD correspondiente al dominio (`freecad-parametric-part`, `freecad-assembly`, etc.) antes de cualquier tool call. No asumir que está corriendo.

---

## 3. Anatomía del MCP (para que el equipo de fix no pierda tiempo)

Extraído del `AGENTS.md` del propio repo. Resumen operativo:

- **Stack**: TypeScript ESM (`type: module`), ~169 tools en 15 módulos. Target FreeCAD 1.1.3+ (mínimo 1.0).
- **Comandos**:
  - `npm run build` — `tsc` compila `src/` → `dist/`.
  - `npm test` — suite de validación (`node scripts/test-runner.mjs`).
  - `npm run dev` — `tsc && node dist/index.js`.
  - No hay linter ni formatter.
- **Arquitectura**:
  - `src/index.ts` — entrypoint. Registra cada tool en 4 lugares: import del módulo, spread en `ALL_TOOLS`, entrada en `TOOL_HANDLERS`, y `case` en el `switch` de `CallToolRequestSchema`. **Olvidar cualquiera = tool invisible o error "Unknown tool".**
  - `src/freecad-bridge.ts` — `FreeCADBridge`, dos modos con auto-detección: socket GUI (`127.0.0.1:12345`) o headless (`freecadcmd` + REPL). Si el socket falla, baja a headless automáticamente.
  - `src/tools/*.ts` — 15 módulos, cada uno exporta `<MODULO>_TOOLS` y `handle<Modulo>Tool`. Cada tool inyecta Python vía `bridge.run(...)`.
  - `src/validation.ts` — helpers obligatorios (`validateNumber`, `validatePositiveNumber`, `validateString`, `validateObjectName`, `validateFilePath`, `validateArray`, `escapePythonString`).
  - `freecad_server.FCMacro` — servidor socket Python que corre dentro de la GUI de FreeCAD.
- **Gotchas críticos**:
  - Toda tool nueva debe tener **validación runtime** para todos sus parámetros.
  - **Seguridad de strings en Python**: nunca interpolar input de usuario directo; usar `JSON.stringify()` o `escapePythonString` antes de embeber.
  - Todo `filePath` debe pasar por `validateFilePath()` (bloquea path traversal y rutas de sistema).
  - `freecad_execute_python` ejecuta código arbitrario por diseño — tool peligrosa, solo entornos confiables.
  - Tools GUI-only (`freecad_import_iges`) devuelven error claro en headless.

---

## 4. Dónde se registra el conocimiento del MCP (docs maestros)

- `docs/MCP_EVIDENCIAS_Y_MEJORAS.md` — **registro vivo y obligatorio** de gaps, limitaciones, workarounds validados y plan de mejora. Todo gap o comportamiento inesperado identificado debe quedar acá (si no está ya documentado).
- `docs/METODOLOGIA_CAD_FREECAD.md` — doc maestro de metodología CAD FreeCAD + industria.
- `docs/GUIA_BUENAS_PRACTICAS_CAD.md` — lineamiento maestro de modelado paramétrico (flujo canónico + anti-patrones).
- `CHANGELOG.md` — registro de versiones/cambios del MCP.

**Plan de mejora ya propuesto en `MCP_EVIDENCIAS_Y_MEJORAS.md`** (candidatos a implementar):
1. Soporte de Datum Planes (`freecad_create_datum_plane`) para anidar sketches en superficies curvas.
2. Adjuntamiento de sketches a caras (`create_sketch` con `faceName`).
3. Robustecer pipeline de roscas (eje/dirección personalizados, no solo Z).
4. Validación previa de sweeps (control de normalidad en trayectorias helicoidales).

---

## 5. El ciclo de automejora y Living Docs (paso a paso)

Cuando una tool del MCP **falla**, **no existe**, o **se comporta de forma inesperada**:

1. **Diagnosticar y clasificar** la dificultad concreta:
   - ¿Tool inexistente (gap de cobertura)?
   - ¿Error recurrente o comportamiento inesperado en una tool existente?
   - ¿Limitación estructural (ej. adjuntamiento topológico, roscas no-axiales)?
2. **Regla de no improvisación**: si una tool referenciada no existe o falla estructuralmente, no improvisar con scripts arbitrarios. Gatillar la automejora inmediatamente.
3. **Registrar el gap** en `docs/MCP_EVIDENCIAS_Y_MEJORAS.md` si no está documentado. Si el agente debió improvisar fuera de flujo por una urgencia, registrarlo como "caso de uso no cubierto" (cobertura viva que alimenta la próxima iteración del eval set y las failure tables).
4. **Lanzar el equipo de resolución en BACKGROUND (asincrónico)** - ver regla de async abajo.
5. **El agente principal continúa** con su tarea del usuario sin esperar al equipo de automejora.
6. **El equipo de resolución implementa el fix** en el código del MCP siguiendo la sección 6.
7. **El equipo verifica**: `npm run build` + `npm test`. Si aplica, probar contra FreeCAD real y dejar evidencia (BoundBox, volumen, renders).
8. **El equipo persiste y aplica Living Docs (§4.4)**:
   - Actualizar los skills de FreeCAD afectados.
   - **Evaluación de failure tables**: cuando se documenta un gap o falla nuevo en `docs/MCP_EVIDENCIAS_Y_MEJORAS.md`, evaluar obligatoriamente si corresponde agregar una nueva fila en la failure table de la skill afectada.
   - Actualizar `CHANGELOG.md` y `docs/MCP_EVIDENCIAS_Y_MEJORAS.md`.
9. **Cerrar el bucle meta**: ver sección 7 (la skill debe enterarse de qué cambió).

### Regla de asincronía (CRÍTICA)

La sub-tarea de automejora es **SIEMPRE asincrónica**. No debe bloquear al agente principal ni al usuario:

- **Lanzar con `run_in_background=true`** (o el mecanismo async equivalente del host). El agente principal recibe un ID de tarea en background y **no espera** su resultado.
- **Motivo**: para cuando el equipo de automejora resuelva el fix, el agente principal probablemente ya haya resuelto el problema de otro modo (workaround, otra vía), y el usuario necesita continuar su trabajo sin esperar.
- **El flujo principal nunca depende del resultado** del equipo de automejora. Si el problema bloqueaba la tarea del usuario, el agente lo resuelve por la vía más rápida disponible (workaround documentado, tool alternativa, etc.) y deja la mejora del MCP para el ciclo en background.
- **Registrar el ID/estado** de la tarea background para poder consultarla o continuarla si hace falta, sin bloquear la interacción actual.
- **Recolección diferida**: el resultado del equipo se recoge cuando el host lo notifica (system-reminder de completado), nunca por polling bloqueante.

---

## 6. Qué hacer después de una modificación al MCP

Checklist obligatorio post-cambio:

- [ ] `npm run build` — compila `src/` → `dist/` sin errores.
- [ ] `npm test` — suite de validación pasa (o falla sólo lo documentado como limitación de entorno, ej. `import_iges` GUI-only).
- [ ] Si se agregó una tool: registrada en los **4 lugares** de `src/index.ts` (import, `ALL_TOOLS`, `TOOL_HANDLERS`, `switch`).
- [ ] Validación runtime para todos los parámetros de la tool nueva.
- [ ] Strings de Python escapados (`JSON.stringify` / `escapePythonString`), nunca interpolados crudos.
- [ ] `filePath` validado con `validateFilePath()`.
- [ ] Gap/mejora reflejado en `docs/MCP_EVIDENCIAS_Y_MEJORAS.md`.
- [ ] `CHANGELOG.md` actualizado.
- [ ] Si afecta skills de FreeCAD: actualizar la skill correspondiente (rutas, tools, anti-patrones).
- [ ] Si la skill de automejora debe saberlo: registrar el cambio en `docs/AUTOMEJORA_ESTADO_MCP.md` (ver sección 7).
- [ ] Commit del MCP si corresponde (mensaje claro, sin archivos generados: `node_modules/`, `dist/` según `.gitignore`).

> **No "parchear" solo para la sesión actual.** El fix debe quedar persistente, reutilizable y documentado.

---

## 7. Automejora de la propia herramienta de automejora (bucle meta)

Esta skill **también se automejora**. La skill no es estática: debe estar al tanto de los cambios del MCP para que la próxima camada de agentes trabaje con información fresca.

**Archivo de estado**: `docs/AUTOMEJORA_ESTADO_MCP.md` (dentro del repo del MCP). Es el "libro de bitácora" de la automejora.

**Reglas del bucle meta:**
1. **Cuando el MCP cambia** (tool nueva, firma modificada, gap resuelto, módulo agregado, comportamiento corregido), **actualizar este archivo de estado** con: qué cambió, cuándo, en qué módulo, qué tools afectadas, y qué impacto tiene para futuras mejoras.
2. **Antes de arrancar cualquier ciclo de automejora**, el equipo debe **leer `AUTOMEJORA_ESTADO_MCP.md` primero** para no re-trabajar sobre información obsoleta ni re-descubrir lo ya resuelto.
3. **Si la skill misma queda desactualizada** (por ejemplo: la skill referencia tools, rutas o flujos que el MCP ya cambió), corregir esta `SKILL.md` en el mismo ciclo de mejora.
4. **Registrar aprendizajes reutilizables** en `docs/MCP_EVIDENCIAS_Y_MEJORAS.md` para que próximas interacciones no re-descubran lo mismo.

**Flujo de lectura obligatorio al abrir un ciclo (lo ejecuta el equipo de resolución en background):**
1. Leer esta `SKILL.md`.
2. Leer `docs/AUTOMEJORA_ESTADO_MCP.md` (estado fresco del MCP).
3. Leer `docs/MCP_EVIDENCIAS_Y_MEJORAS.md` (gaps y plan vigente).
4. Recién entonces diagnosticar el problema actual.

---

## 8. Referencias rápidas

- Repo MCP: `/home/fciliberti/Trabajos/Tools/freecad-mcp`
- AGENTS.md del MCP: `/home/fciliberti/Trabajos/Tools/freecad-mcp/AGENTS.md`
- Evidencias/mejoras: `/home/fciliberti/Trabajos/Tools/freecad-mcp/docs/MCP_EVIDENCIAS_Y_MEJORAS.md`
- Estado de automejora: `/home/fciliberti/Trabajos/Tools/freecad-mcp/docs/AUTOMEJORA_ESTADO_MCP.md`
- Metodología: `/home/fciliberti/Trabajos/Tools/freecad-mcp/docs/METODOLOGIA_CAD_FREECAD.md`
- Buenas prácticas CAD: `/home/fciliberti/Trabajos/Tools/freecad-mcp/docs/GUIA_BUENAS_PRACTICAS_CAD.md`
- Skills de FreeCAD: `/home/fciliberti/.agents/skills/freecad-*`
