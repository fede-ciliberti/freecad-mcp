# Sesión de actualización — Diagnóstico y plan (2026-08-20)

Documento maestro para arrancar la sesión de actualización de `freecad-mcp` contra **FreeCAD 1.1.3**. Registra los problemas encontrados en una sesión real de modelado, su causa raíz y el plan de fix propuesto.

---

## 1. Índice

1. [Contexto y estado del repo](#2-contexto-y-estado-del-repo)
2. [Problemas encontrados](#3-problemas-encontrados)
3. [Causa raíz](#4-causa-raíz)
4. [Cómo reproducir](#5-cómo-reproducir)
5. [Plan de fix](#6-plan-de-fix)
6. [Validación](#7-validación)
7. [Lecciones aprendidas](#8-lecciones-aprendidas)
8. [Referencia de archivos](#9-referencia-de-archivos)

---

## 1. Contexto y estado del repo

| Ítem | Valor |
|---|---|
| Repo | `sergiudanstan/freecad-mcp` (upstream, inactivo desde 2026-03-08) |
| Fork | `fede-ciliberti/freecad-mcp` |
| Versión del server | 1.0.0 (package.json) |
| FreeCAD objetivo | **1.1.3** (AppImage) |
| Remotes locales | `origin` → fork de Fede · `upstream` → autor |
| Branch | `main` (tracking `origin/main`) |

**Estado de actualizaciones**: el upstream no tiene releases ni tags y su último commit es del 2026-03-08. El repo local ya estaba al día con `main` upstream. **No hay updates disponibles** — el fix debe ser propio (fork).

> Nota: `package-lock.json` tenía modificaciones locales sin commitear al momento de conectar el fork. No fueron tocadas.

---

## 2. Problemas encontrados

Durante el modelado de una planchuela 60×40×10 mm con agujero roscado M10 se detectaron **herramientas del MCP que fallan contra FreeCAD 1.1.3**:

| Tool | Síntoma | Referencia |
|---|---|---|
| `freecad_pad` | Error `'PartDesign.Feature' object has no attribute 'Symmetric'` | `src/tools/part-design.ts:370` |
| `freecad_hole` | Error `Missing container body` | `src/tools/part-design.ts:117` |
| chamfer/fillet | Property `Edges` inexistente (en 1.1.3 cambió la API) | `src/tools/part-design.ts:470,490` |
| `capture_freecad_viewport` | El viewport se captura en blanco | plugin `freecad-view` (repo freeCadAI) |

**Detalle por tool:**

### `freecad_pad`
- El handler genera código Python que setea `pad.Symmetric = True/False`.
- En FreeCAD 1.1.3 la feature `PartDesign::Pad` **ya no expone la propiedad `Symmetric`** → crash al ejecutar el código generado.

### `freecad_hole`
- Falla con `Missing container body`: el handler no ubica/cuega el `Hole` dentro del `Body` de PartDesign como se espera en 1.1.3.

### chamfer / fillet
- El handler genera `["Edge"+str(i+1) for i in range(len(obj.Shape.Edges))]` y setea una property de bordes que en 1.1.3 no es `Edges`.
- En FreeCAD 1.1.3 la selección de bordes del Chamfer/Fillet va por `Base = (feature, (subelements))` o `UseAllEdges`.

### `capture_freecad_viewport`
- Devuelve un PNG en blanco (problema del plugin `freecad-view` de OpenCode, no del MCP en sí). No confiar en él para validación.

---

## 3. Causa raíz

**Incompatibilidad de versión de API.** El server fue escrito contra una API de PartDesign más vieja. FreeCAD 1.1.3 refactorizó varias firmas:

- `Pad.Symmetric` → eliminado (se maneja con `Length2` + dirección).
- Chamfer/Fillet: property `Edges` → `Base` con subelementos + `UseAllEdges`.
- El `Hole` requiere una referencia explícita y válida al `Body` contenedor.

Los bugs son **puntuales y localizables** — no son defectos de arquitectura. La mayoría de las 165 tools (documento, sketcher, booleans, mesh, BIM, FEM…) funcionan correctamente.

---

## 4. Cómo reproducir

Pieza de test: **planchuela 60×40×10 mm con agujero roscado M10 central**.

Workflow canónico (que expone los bugs):
1. `freecad_new_document` → OK
2. `freecad_create_sketch` (plano XY) → OK
3. `freecad_add_sketch_rectangle` → OK
4. `freecad_close_sketch` → OK
5. `freecad_pad` (length 10) → **BUG** (Symmetric)
6. Sketch en cara superior + círculo Ø8.5 → OK (vía API directa)
7. `freecad_hole` (M10) → **BUG** (Missing container body)
8. Chamfer → **BUG** (Edges)

> Workaround probado en la sesión: usar `execute_python` con API directa de FreeCAD para pad/hole/chamfer. Funciona pero es ad-hoc y no escala.

---

## 5. Plan de fix

| # | Tool | Archivo | Cambio propuesto |
|---|---|---|---|
| 1 | `freecad_pad` | `src/tools/part-design.ts` (l. 370) | Quitar `pad.Symmetric`; usar `Length`/`Length2` y `Reversed` según la API 1.1.3 |
| 2 | `freecad_hole` | `src/tools/part-design.ts` (l. 117) | Asegurar que el `Hole` se agregue al `Body` contenedor correcto antes de setear `Profile` |
| 3 | chamfer/fillet | `src/tools/part-design.ts` (l. 470,490) | Migrar a `Base = (feature, subelements)` o `UseAllEdges`; validar los `EdgeN` sobre el **Tip** (no sobre features tempranas) |
| 4 | `capture_freecad_viewport` | plugin `freecad-view` | Corregir el PNG en blanco (revisar `ActiveView.saveImage` / encuadre de cámara) |

**Reglas importantes del fix:**
- El chamfer/fillet siempre debe tomar como base la **última feature sólida** (el Tip con todos los features previos), nunca una feature temprana — si se toma el pad base, la cadena de features se reordena y **el agujero desaparece** del sólido final.
- No mezclar llamadas a los wrappers del MCP con API directa en la misma sesión (genera objetos duplicados y renombrados `Hole001`, corrompiendo el árbol).

---

## 6. Validación

La validación **no** debe apoyarse en el viewport (roto). Usar métricas numéricas 100% confiables:

| Check | Método |
|---|---|
| Dimensiones | `shape.BoundBox` (XLength/YLength/ZLength) |
| Agujero presente | contar aristas circulares en `body.Shape` (deben ser 2 para un agujero pasante) |
| Chamfer removió material | `volume` del cuerpo final < volumen del cuerpo sin chamfer |
| Roca correcta | `hole.ThreadSize`, `ThreadType`, `DepthType`, `Threaded` |

**Fórmula de referencia:** planchuela 60×40×10 llena = 24000 mm³. Con agujero Ø8.5×10 ≈ 23433 mm³. Con chamfer 1 mm completo ≈ 23218 mm³.

---

## 8. Lecciones aprendidas (checklist para la sesión)

- **Estrategia única**: o todo con wrappers del MCP o todo con `execute_python` directo. Mezclarlos corrompe el feature tree.
- **`execute_python`**: retornar con `_mcp_result["result"] = {...}` (asignación), NO `_mcp_result = {...}` (dict literal → devuelve `undefined`). Los objetos `Quantity` no son JSON-serializables; usar `.Value`.
- **Enums de FreeCAD**: no se adivinan. Consultar con `getEnumerationsOfProperty('Prop')` antes de setear. Ej: `ThreadType='ISOMetricProfile'`, `ThreadSize='M10x1.5'`, `DepthType='ThroughAll'`.
- **API FreeCAD 1.1.3**:
  - Chamfer/Fillet: bordes via `Base` con subelements o `UseAllEdges`.
  - Hole: `Profile` + agregar al `Body`.
  - Pad: sin `Symmetric`.
- **Artefacto topológico**: el Hole deja una arista vertical "extra" (costura) — esperable, no es error.
- **Volumen y topología** como única fuente de verdad de validación.

---

## 9. Referencia de archivos

| Archivo | Rol |
|---|---|
| `src/tools/part-design.ts` | Handlers de `freecad_pad`, `freecad_hole`, chamfer, fillet |
| `src/freecad-bridge.ts` | Bridge / comunicación con la macro del socket |
| `freecad_server.FCMacro` | Macro dentro de FreeCAD que levanta el socket 127.0.0.1:12345 |
| `freecad-view` plugin | `capture_freecad_viewport` (en repo `freeCadAI`, `.opencode/plugin/`) |
| `package.json` | Version y build (script `build`) |

---

*Sesión documentada por Sisyphus el 2026-08-20. Próximo paso: feature branch de fix en el fork.*
