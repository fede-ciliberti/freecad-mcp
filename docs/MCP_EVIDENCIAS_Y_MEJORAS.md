# Informe Maestro: Evidencias, Limitaciones y Plan de Mejora para freecad-mcp (FreeCAD 1.1.3)

*Fecha de auditoría: 20 agosto 2026*
*Autor: Fede & Sisyphus*

---

## Índice

1. Resumen Ejecutivo y Estado de Compatibilidad
2. Hallazgos y Limitaciones Arquitectónicas (PartDesign vs Part)
3. Gaps Específicos Identificados (Roscas y Geometría Compleja)
4. Patrones de Diseño Recomendados (Workarounds Validados)
5. Plan de Mejoramiento Propuesto para el Servidor MCP

---

## 1. Resumen Ejecutivo y Estado de Compatibilidad

- **Compatibilidad general**: Validada al **99.4% (168/169 tests PASS)** frente a FreeCAD 1.1.3 headless y en modo GUI por socket (`127.0.0.1:12345`).
- **Bridge de conexión**: Auto-detección robusta (socket GUI si está activo, fallback a headless con `freecadcmd`). Corrección aplicada en la serialización de objetos `Quantity` de FreeCAD hacia JSON (`.Value`).
- **Único FAIL estructural**: `freecad_import_iges` (requiere módulo GUI `ImportGui`, documentado como limitación de entorno).

---

## 2. Hallazgos y Limitaciones Arquitectónicas (PartDesign vs Part)

### A. Adjuntamiento Topológico de Sketches (`create_sketch` + `move_object`)
- **Problema**: Las tools MCP actuales de sketch crean formas en planos cartesianos globales (XY, XZ, YZ). Al intentar moverlos con `move_object` o usarlos para operaciones de PartDesign (`Pocket`, `Hole`), **se rompe el vínculo topológico de adjuntamiento a caras**.
- **Impacto**: PartDesign requiere que los sketches de operaciones como `Pocket` o `Hole` estén atados a una **cara plana** del cuerpo. Un sketch movido geométricamente en el espacio sin soporte de cara genera estados `Invalid` o no ejecuta el corte.
- **Superficies curvas**: PartDesign rechaza adjuntar sketches directamente a caras cilíndricas o curvas (necesitaría un *Datum Plane* tangente, el cual no está expuesto como tool en el MCP actual).

---

## 3. Gaps Específicos Identificados (Roscas y Geometría Compleja)

### B. Fillets que producen Compound inválido (rompen booleanos) — RESUELTO 2026-08-21
- **Estado**: **FIXEADO** (las tools `freecad_fillet` y `freecad_partdesign_fillet` generan sólidos válidos y el workaround por `execute_python` deja de ser necesario).
- **Causa raíz y solución aplicada**:
  - `freecad_fillet` (operations.ts): se reemplazó el feature `Part::Fillet` (que al recomputarse sobreescribía la Shape con un recompute inválido) por un `Part::Feature` limpio con la BRep Shape directa de OpenCASCADE `makeFillet(...)` extrayendo `Solids[0]`. Devuelve un `Part::Solid` válido que soporta cortes booleanos posteriores (`freecad_boolean_cut`).
  - `freecad_partdesign_fillet` (part-design.ts): se vinculó automáticamente el `PartDesign::Body` contenedor y se registró el objeto mediante `body.addObject(fillet)`, asignando `fillet.Base = (obj, edges)` y `fillet.Radius = radius`. Se agregó validación de entrada y chequeo de `isNull()`.
- **Resultado**: Ambas tools retornan sólidos válidos utilizables directamente en booleanos y operaciones posteriores sin recurrir a `execute_python`.

### A. Roscas en Orientaciones Perpendiculares / Horizontales
- **Problema**: Modelar una rosca real 3D (geometría helicoidal) en un agujero lateral o horizontal de un cilindro es impracticable con las tools puras actuales.
- **Detalle de fallos**:
  - `freecad_sweep` (perfil a lo largo de hélice): Genera `shape is invalid` debido a la imposibilidad de controlar u orientar el plano normal del perfil respecto a la hélice en trayectorias no-axiales.
  - `freecad_hole` (threaded): Solo opera en agujeros **axiales** desde una cara plana superior/inferior, y su rosca por defecto es cosmética (no geometría 3D).
  - `freecad_additive_helix` / `subtractive_helix`: Asumen rígidamente **eje Z vertical** y dependen del contexto estricto de PartDesign.

---

## 4. Patrones de Diseño Recomendados (Workarounds Validados)

Para evitar frustraciones y minimizar el uso de código Python arbitrario (`execute_python`), se validaron los siguientes patrones robustos:

1. **Agujeros pasantes laterales (perpendiculares)**:
   - *No usar*: PartDesign Hole / Pocket con sketches flotantes.
   - *Usar*: **Primitivas Part + Boolean Cut**. Crear el cilindro principal (`create_cylinder`), un cilindro fino de corte (`create_cylinder`), rotarlo/posicionarlo para que atraviese el eje, y aplicar `boolean_cut`. Es 100% estable y soporta parametrización por expresiones.
2. **Filetes en aristas circulares**:
   - *Usar*: `freecad_fillet` especificando índices de aristas (`edgeIndices`) sobre el resultado de operaciones booleanas para evitar redondeos no deseados en los bordes internos de agujeros.
3. **Parametrización**:
   - *Usar*: `spreadsheet_create`, `spreadsheet_set`, `spreadsheet_alias` combinados con `set_expression` sobre propiedades numéricas (`Radius`, `Height`, etc.).

---

## 5. Plan de Mejoramiento Propuesto para el Servidor MCP

Para llevar el servidor MCP al siguiente nivel y cubrir estos gaps sin recurrir a scripts de Python manuales, se propone desarrollar las siguientes capacidades:

1. **Soporte de Planos de Referencia (*Datum Planes*)**:
   - Añadir tools para crear planos tangentes o arbitrarios dentro de un Body (`freecad_create_datum_plane`), permitiendo anidar sketches en superficies curvas (como el flanco de un cilindro).
2. **Mejora en el Adjuntamiento de Sketches**:
   - Permitir que `create_sketch` acepte opcionalmente un argumento `faceName` para adjuntar directamente el sketch a una cara del modelo existente.
3. **Robustecimiento del Pipeline de Roscas**:
   - Ampliar `freecad_hole` o `freecad_subtractive_helix` para aceptar vectores de dirección/eje personalizados (no solo eje Z fijo) y permitir la extrusión de roscas en cualquier orientación espacial.
4. **Validación Previa de Sweeps**:
    - Agregar control de normalidad en `freecad_sweep` para evitar que devuelva `shape is invalid` en trayectorias helicoidales o complejas.

---

## 6. Evolución Reciente y Gaps Cerrados (Versión 1.1.0)

1. **Soporte de Transacciones, Undo y Redo (Módulo State)** — **RESUELTO**
   - *Gap previo*: Ausencia de control transaccional estructurado, exponiendo las sesiones de modelado a estados inconsistentes ante fallos en operaciones booleanas o modificaciones complejas.
   - *Solución aplicada*: Implementación del módulo `state.ts` con 7 tools (`freecad_begin_transaction`, `freecad_commit_transaction`, `freecad_abort_transaction`, `freecad_undo`, `freecad_redo`, `freecad_diff_snapshot`, `freecad_snapshot`), permitiendo rollback seguro y control de historial de cambios.

2. **Enumeración Topológica y Control de Diferencias (Módulo State / Snapshot)** — **RESUELTO**
   - *Gap previo*: Falta de visibilidad sobre los cambios estructurales detallados entre estados del documento CAD sin inspección manual.
   - *Solución aplicada*: Incorporación de `freecad_snapshot` y `freecad_diff_snapshot` para comparar objetos, propiedades y conteo de entidades geométricas entre iteraciones.

3. **Validación Visual y Captura de Pantalla (Módulo View)** — **RESUELTO**
   - *Gap previo*: Dependencia exclusiva de inspección por BoundBox y métricas de volumen, sin soporte nativo para verificación visual del viewport.
   - *Solución aplicada*: Creación del módulo `view.ts` con `freecad_take_screenshot` y `freecad_capture_views` (GUI-only) para captura de renders y vistas múltiples de la pieza.

4. **Metodología de Creación Asistida y Modificación M1-M5** — **NUEVA CAPACIDAD**
   - *Implementación*: Integración de un pipeline de creación en 5 capas (hoja de parámetros, sketch fully constrained, pad, operaciones sobre caras, fillet/chamfer final) y clasificación estricta de modificaciones (escala M1 a M5) respaldada por transacciones y diffs para asegurar robustez en manufactura aditiva y diseño paramétrico.
