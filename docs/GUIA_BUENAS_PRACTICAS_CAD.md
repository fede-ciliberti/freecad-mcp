# Guía Maestra de Buenas Prácticas CAD — Lineamiento General

*Partes paramétricas de ingeniería para impresión 3D con freecad-mcp*

**Versión:** 1.0 · **Fecha:** 20 agosto 2026
**Autores:** Fede & Sisyphus · **Target:** FreeCAD 1.1.3 (mínimo 1.0)

---

## 1. Propósito y Alcance

Este documento define **cómo se hacen las partes** en este proyecto. No es un manual de FreeCAD: es el contrato de trabajo que garantiza que cualquier parte creada por cualquier agente siga **siempre el mismo método**, de modo que el resultado sea:

- **Paramétrico**: editable cambiando números, no redibujando.
- **Ensamblable**: encaja con las demás partes de la ingeniería.
- **Imprimible**: funciona en una impresora 3D real.

### 1.1 Alcance de esta versión

- **En foco**: flujo PartDesign paramétrico (sketch → constrain → pad/pocket → features → assembly). Es el ~80% del uso real.
- **Mencionado pero no profundizado**: BIM, FEM, Surface, Mesh, TechDraw (existen tools pero su guía detallada es un trabajo separado).

### 1.2 Cómo leer este documento

- **Secciones 2–6** = lineamiento obligatorio (el "modo correcto").
- **Sección 7** = workarounds validados (cuando la herramienta no alcanza).
- **Sección 8** = anti-patrones prohibidos (qué NO hacer y por qué).
- **Sección 9** = validación numérica (cómo comprobar que está bien).
- **Sección 10** = checklists rápidos.

---

## 2. Filosofía: el Modelo Mental

### 2.1 La pieza es un *árbol de features paramétrico*, no una escultura

Un modelo se construye como una **historia cronológica de operaciones** sobre sketches 2D. Cada operación se apoya en la anterior. Si eso se respeta:

- Cambiás un número de un sketch → toda la cadena se recalcula sola.
- Podés volver atrás y editar cualquier paso sin romper el resto.

```
Spreadsheet (parámetros maestros)
   └─ Sketch base (XY) — fully constrained
        └─ Pad → Cuerpo 3D
              └─ Sketch 2 (sobre cara) → Pocket/Hole
              └─ Fillet/Chamfer/Pattern
                    └─ Tip (sólido final)
```

### 2.2 Los 4 mandamientos paramétricos

1. **Toda dimensión nace de un parámetro** (hoja de cálculo o expresión), jamás de un número flotando en la geometría.
2. **Todo sketch queda `fully constrained`** antes de cerrarlo. Un sketch suelto es una bomba: mueve un parámetro y se deforma.
3. **Una fuente de verdad** por dimensión. Si el ancho vive en `$W`, no lo repitas como número en otro lado: referencialo.
4. **La cara es el ancla**. Las operaciones de corte (Pocket/Hole) se fijan a una **cara plana** del sólido, no a coordenadas globales sueltas.

### 1.3 Prioridades en conflicto

| Cuando choque... | Gana | Por qué |
|---|---|---|
| Rápido vs. Paramétrico | Paramétrico | La pieza va a cambiar; el tiempo se recupera editando |
| Simple vs. "pro" | Simple | Menos features = menos romper; complejidad solo cuando hace falta |
| Estética vs. Fabricación | Fabricación | Imprime primero, embellece después |
| Conveniencia vs. Consistencia | Consistencia | Es el propósito de esta guía |

---

## 3. Convenciones Generales

### 3.1 Unidades

- **Milímetros (mm)** para todo lo geométrico. LibreCAD y la mayoría de slicers trabajan en mm.
- **Grados** para ángulos.
- **Newton** y **MPa** en FEM.

### 3.2 Naming de objetos

Consistente y descriptivo para que el tree se lea de un vistazo.

| Tipo | Convención | Ejemplo |
|---|---|---|
| Documento | `kebab-case` | `soporte-brazo-izq` |
| Sketch | `Sk_Nombre_Funcion` | `Sk_base`, `Sk_hole_bracket` |
| Body/Part | Nombre de la parte | `Soporte`, `PlacaBase` |
| Feature | `<verbo>_<que>` | `Pad_Base`, `Pocket_Agujeros`, `Fillet_Bordes` |
| Spreadsheet | `Parametros` (fijo) | `Parametros` |

### 3.3 Estructura de parámetros en la hoja

Usá **una sola hoja `Parametros`** por documento como fuente de verdad.

- Cada dimensión crítica → una celda con **alias** (`$W`, `$H`, `$D_agujero`, `$t_pared`).
- Nombres de alias: prefijo por grupo (`d_` diámetros, `t_` espesores, `l_` largos, `n_` cantidad).

### 3.4 Sketch: reglas de construcción

- **Siempre geomatría totalmente restringida** (constraints, nunca "a ojo").
- Empezá anclando **2 constraints fijos** (punto de origen + horizontal/vertical) antes de dimensionar.
- Preferí constraints de **simetría y coincidencia** sobre valores absolutos cuando haya relaciones lógicas entre features.
- **Geometry de construcción** (líneas auxiliares) marcadas como `construction` — nunca participan en el solido.

---

## 4. Flujo Canónico Paso a Paso

Este es el **único** flujo permitido para crear una pieza sólida de impresión 3D. Usá estos pasos en este orden.

### Fase 0 — Setup del documento

1. `freecad_new_document` con nombre según §3.2.
2. `freecad_spreadsheet_create` → nombrar `Parametros`.
3. `freecad_spreadsheet_set` con las dimensiones maestras.
4. `freecad_spreadsheet_alias` para cada celda relevante (`$W`, `$H`, `$D`...).

> Los alias de la hoja son la **única** fuente de verdad. Todo lo que siga referencia a estos nombres.

### Fase 1 — Sketch base (plano maestro)

5. `freecad_create_sketch` sobre el plano correcto:
   - **XY**: base horizontal (la más común, es la cara de impresión). ✅
   - **XZ / YZ**: para piezas que se paran o que se fresan de costado.
6. Dibujá el contorno con las tools del módulo Sketcher:
   - `freecad_add_sketch_rectangle` / `line` / `circle` / `arc` / `polygon` / `bspline` / `slot` / `ellipse`.
7. Agregá constraints:
   - `freecad_add_sketch_constraint` con `constraintType`:
     - `coincident`, `horizontal`, `vertical`, `distance`, `distanceX`, `distanceY`, `radius`, `diameter`, `angle`, `equal`, `symmetric`, `tangent`, `perpendicular`, `parallel`, `pointOnObject`, `fixed`.
   - Vinculá las dimensiones a la hoja con `freecad_set_expression` (p.ej. `Parametros.$W`).
8. Verificá que quedó `fully constrained` antes de cerrar (debe tener 0 grados de libertad).
9. `freecad_close_sketch` (recalcula y valida).

### Fase 2 — Solidificar (Pad)

10. `freecad_pad` sobre el sketch base, `length` = espesor (idealmente desde `Parametros.$t_espesor`).
    - **Importante**: `symmetric` / `reversed` si el espesor debe repartirse. No uses la property `Symmetric` directamente en 1.1.3 (ver §8.2).
11. Chequear con `freecad_get_object_info` / `freecad_get_bounding_box` que el sólido existe y dimensiones correctas.

### Fase 3 — Features sobre el sólido (cortes y agujeros)

> **Regla de oro**: estas operaciones se anclan a una **cara plana** del sólido existente, no a coordenadas sueltas.

12. Creá un sketch sobre la **cara plana** donde va el corte:
    - Si la tool `create_sketch` no acepta `faceName` todavía (ver evidencias §2A), creá el sketch en el plano y usá `freecad_add_sketch_external` para referenciar la cara, o posicionalo sobre la cara plana con las coordenadas correctas.
13. Dibujá el agujero/proaile y constrain.
14. Operación:
    - `freecad_pocket` (corte profundo) con `depth`.
    - `freecad_hole` para agujeros roscados/cilíndricos desde cara (axial). ⚠️ Requiere Body container válido (bug conocido, ver §5/§7).
    - `freecad_pad` nuevamente para agregar volumen (feature).
15. Patrones / espejos:
    - `freecad_linear_pattern` (n en línea), `freecad_polar_pattern` (en círculo), `freecad_partdesign_mirrored` (espejo).
    - Siempre sobre la feature, no sobre el sólido final.

### Fase 4 — Acabado de bordes (opcional)

16. `freecad_partdesign_fillet` / `freecad_partdesign_chamfer` sobre el **Tip** (última feature sólida). Ver §5.5 y §8.
    - Aplicá sobre **bordes específicos** (`edgeNames`/`edgeIndices`), no "todos" salvo que sea intencional.

### Fase 5 — Validación numérica

17. `freecad_get_object_info` → volumen y BoundBox esperados.
18. Compará contra valores teóricos (fórmula en §9). Si no cierra → revisá, no sigas.

### Fase 6 — Export para impresión

19. `freecad_export_stl` (mesh) con `freecad_mesh_from_shape` si querés control de resolución.
20. `freecad_save_document` (`.FCStd`) para conservar el modelo paramétrico.

---

## 5. Pipeline de Creación Asistida por Agente

Este pipeline define la capa de control y trazabilidad mediante la cual el agente planifica, ejecuta y valida la construcción de piezas paramétricas antes de realizar cambios estructurales en FreeCAD. Se compone de un modelo de 5 capas:

### 5.1 Las 5 Capas del Pipeline

1. **Normalización L2/L3**: El agente produce una especificación geométrica estructurada (definición de formas, features, parámetros y relaciones) antes de invocar ninguna herramienta MCP.
2. **Plan JSON point-based**: Se genera un árbol de features ordenado de forma determinista, evitando la ejecución de código Python libre o desestructurado.
3. **Ejecución incremental**: Cada feature se aplica en una única tool call independiente, nunca en lotes (batch), asegurando control de errores por paso.
4. **Snapshot de estado**: Después de cada feature, se captura el estado del documento mediante `freecad_snapshot_document`, generando un render visual, un JSON topológico, la caja contenedora (bbox) y el volumen exacto.
5. **Auto-Q&A con criterios CADFusion**: El agente evalúa la calidad de la forma, la cantidad de features y la distribución espacial comparando los renders obtenidos a través de `freecad_capture_views`, `freecad_take_screenshot` y `freecad_diff_snapshot`. Las transacciones se gestionan de forma segura utilizando `freecad_begin_transaction` y `freecad_abort_transaction` en caso de fallo.

### 5.2 Evidencia Científica y Referencias
- **CAD-Assistant**: Demostró que la serialización de modelos basada en puntos mediante JSON estructurado supera significativamente a la representación implícita tradicional (0.748 frente a 0.674 en SGPBench).
- **CADCodeVerify**: Validó una reducción del 7.3% en la distancia de nubes de puntos (point cloud distance) mediante el ciclo continuo de auto-Q&A e inspección visual automatizada.

---

## 6. Workarounds Validados (herramientas que no alcanzan)

Cuando una tool no cubre el caso con el flujo puro, usá **estos patrones probados** en vez de inventar Python ad-hoc:

### 5.1 Agujeros pasantes laterales / perpendiculares

- ❌ `freecad_hole` (solo axial desde cara plana).
- ❌ Sketches flotantes para Pocket.
- ✅ **Primitivas Part + Boolean Cut**:
  1. `freecad_create_cylinder` (el agujero, radio = D/2, largo = atraviese).
  2. `freecad_rotate_object` / `freecad_move_object` para atravesar el eje.
  3. `freecad_boolean_cut` (cuerpo − cilindro).
  4. `freecad_refine_shape` para limpiar aristas huérfanas.

### 5.2 Roscas reales (geometría helicoidal 3D)

- ❌ `freecad_hole` roscado (es cosmético en orientación axial).
- ❌ `freecad_sweep` sobre hélice (devuelve `shape is invalid` en trayectorias no-axiales).
- ✅ Para uso real: modelar el **agujero pasante + rosca cosmética**, o usar `execute_python` con API directa controlada (ver §8.2) respetando enums (`ThreadType='ISOMetricProfile'`, `ThreadSize='M10x1.5'`, `DepthType='ThroughAll'`).
- Para rosca física: considerá agregar inserts roscados (HeatSet) — más confiable que roscar la plástico.

### 5.3 Fillet/Chamfer en resultados de boolean

- Usá `freecad_fillet` con `edgeIndices` explícitos sobre el resultado booleano, **no** fillet "todos", para no redondear los bordes internos del agujero.

### 5.4 Parametrización post-hoc

- Ligá propiedades a la hoja con `freecad_set_expression` sobre propiedades numéricas (`Radius`, `Height`, `Length`...) para que todo siga a la hoja `Parametros`.

### 5.5 Chamfer/Fillet en FreeCAD 1.1.3

- La property cambió a `Base = (feature, subelements)` o `UseAllEdges`.
- **Nunca** chamferee/redondee sobre una feature temprana tomando el sólido base: reordena la cadena y **pierde los cortes posteriores**. Siempre sobre el **Tip**.

---

## 6. Reglas por Módulo

| Módulo | Tools clave | Regla |
|---|---|---|
| **Document** | `new_document`, `save_document` | Guardá el `.FCStd` siempre al terminar. El STL es una exportación, no el modelo. |
| **Spreadsheet** | `spreadsheet_create/set/alias` | Única fuente de verdad de dimensiones. Todo lo crítico pasa por acá. |
| **Sketcher** | `create_sketch`, `add_sketch_*`, `add_sketch_constraint` | Todo sketch `fully constrained`. Origen + horizontal fijo primero. Construction nunca en el sólido. |
| **Part Design** | `pad`, `pocket`, `hole`, `revolve`, `groove` | Operaciones ancladas a cara plana. Hole solo axial. Revolve/groove respetan eje. |
| **Primitives** | `create_box`, `create_cylinder`, `create_tube`... | Para cuerpos de geometría pura o como tool de booleano (cortes). |
| **Operations (Boolean)** | `boolean_cut/fuse/intersect`, `slice`, `refine_shape` | El boolean es para unir/restar primitivas o piezas. Siempre `refine_shape` después. |
| **Part Design Features** | `fillet`, `chamfer`, `linear_pattern`, `polar_pattern`, `mirrored` | Se aplican al Tip. Patrones a la feature, no al sólido completo. |
| **Assembly** | `assembly_create`, `assembly_insert_component`, `assembly_*_joint`, `assembly_solve` | El ensamblado es un paso separado post-diseño. Ground una pieza, junta las demás. |
| **Mesh** | `mesh_from_shape` | Solo para exportar/validar impresión. No es el modelo fuente. |
| **Import/Export** | `export_stl`, `import_step` | STL para slicer; STEP para intercambio CAD; FCStd como autoridad. |

---

## 7. Anti-Patrones (NO hacer)

Estos generan modelos rotos, no paramétricos, o piezas que fallan en la impresora.

### 7.1 🚫 Geometría flotante

**NO**: dibujar con coordenadas arbitrarias y dejar el sketch sin restringir.
**SÍ**: restringir todo, anclar al origen, dimensiones desde la hoja.

### 7.2 🚫 Números mágicos en el modelo

**NO**: escribir `5.2` directo en la feature. **SÍ**: `Parametros.$t_pared` referenciado.

### 7.3 🚫 Mezclar wrappers MCP con `execute_python` en la misma sesión

El peor de todos. Genera **objetos duplicados y renombrados** (`Hole001`) y corrompe el feature tree.
**Regla**: o todo por tools MCP, o todo por script directo. Una sesión, una estrategia.

### 7.4 🚫 Sketches movidos en el espacio para cortes

NO mover un sketch con `move_object` para usarlo en Pocket/Hole → **rompe el vínculo topológico** a la cara. A los cuts, anclarlos a la cara.

### 7.5 🚫 `hole` roscada en flanco lateral / superficie curva

NO funcionar. NO adjuntar sketch a cara cilíndrica/curva directo (necesitarías Datum Plane, no expuesto). Usar §5.1 o §5.2.

### 7.6 🚫 Redondeo/chamfer global "todas las aristas" sin pensar

Quema bordes internos de agujeros. `edgeIndices` explícito.

### 7.7 🚫 Redondeo sobre feature temprana (no el Tip)

Pierde los cortes posteriores (Hole desaparece). Siempre último sólido.

### 7.8 🚫 Validar mirando el viewport (captura)

El `capture_freecad_viewport` devuelve PNG en blanco en este entorno. La validación es **numérica** (§9).

### 7.9 🚫 Adivinar enums de FreeCAD

`ThreadType`, `ThreadSize`, `DepthType` no se adivinan. Consultá `getEnumerationsOfProperty('Prop')` (con `execute_python`) antes de setear.

### 7.10 🚫 Diseño para impresión 3D sin reglas de fabricación

Ver §9.

---

## 8. Diseño para Impresión 3D (reglas de fabricación)

La pieza no es solo geométrica, se imprime con capas.

- **Espesor mínimo de pared** ≥ 0.8 mm (3 perímetros de 0.4mm). Paredes finas = capas frágiles.
- **Orientación de impresión**: plana donde queda mejor capas; la cara con mayor área sobre la cama. Los agujeros pequeños a 45° sufren; orientá para que el eje de impresión no tenga capas sueltas.
- **Fillets y chamfers en bordes para evitar warping / bridging** en zonas con mucha tensión.
- **Tolerancia de ajuste** en partes que ensamblan: macho vs hembra ≈ 0.2–0.3 mm (depende de la impresora). Define desde la hoja `Parametros.$tolerancia`.
- **Bridges y overhangs** >45° necesitan soporte → rediseñá (split, mejor orientación).
- **Inserts roscados / heat-set** para uniones que se aprietan; no imprimas la rosca.
- **Packado de material**: evita paredes muy gruesas (usa fill bajo) salvo que sea funcional.

---

## 9. Validación Numérica (la fuente de verdad)

Nunca visual. Siempre métricas.

| Qué validar | Cómo | Valor de referencia |
|---|---|---|
| Dimensiones externas | `freecad_get_bounding_box` → XLength/YLength/ZLength | = a hoja `Parametros` |
| Volumen | `freecad_get_volume` / `get_center_of_mass` | Comparado al sólido teórico |
| Agujero pasante | contar aristas circulares en el shape (2 para pasante) | 2 aristas |
| Chamfer/fillet removió material | volumen final < volumen sin acabado | estricto < |
| Roscada | `hole.ThreadSize`, `ThreadType`, `DepthType` | enums correctos |

**Fórmula de ejemplo**: planchuela 60×40×10 llena = 24000 mm³. Con agujero Ø8.5×10 ≈ 23433 mm³. Con chamfer 1mm ≈ 23218 mm³.

Si el valor real no cierra dentro de tolerancia numérica razonable → **corregí el modelo**, no lo des por bueno.

---

## 10. Checklist Rápido

### Al crear una pieza

- [ ] Documento con nombre kebab-case.
- [ ] Hoja `Parametros` con alias de TODAS las dimensiones clave.
- [ ] Sketch base fully constrained, anclado al origen.
- [ ] Nada de números mágicos; todo de la hoja.
- [ ] Cortes sobre cara plana, no geometría flotante.
- [ ] Fillet/chamfer sobre el Tip, bordes explícitos.
- [ ] Validación numérica (BoundBox + volumen) OK.
- [ ] Guardado `.FCStd` + export STL si aplica.

### Antes de imprimir

- [ ] Espesor de pared ≥ 0.8mm.
- [ ] Tolerancias de ajuste definidas.
- [ ] Sin bridges/overhangs problemáticos (u orientación correcta).
- [ ] Agujeros modelados con la orientación de capas correcta.
- [ ] Parte orientada sobre la cama para mínimo soporte.

### Antes de ensamblar

- [ ] Una pieza anclada (grounded).
- [ ] Joints que respetan grados de libertad reales.
- [ ] Se corrió `assembly_solve`.

---

## 11. Referencia Rápida de Herramientas (mapa mental)

```
Documento  → spreadsheet (parametros) → sketch → pad → solid
                                                └─ pocket / hole → cuts
                                                └─ fillet / chamfer → acabado
                                                └─ patterns / mirror → repetición
Sólido final → validate (boundbox + volume) → export STL → printer
   └─ assembly_create → insert_component → joints → solve
```

---

*Este documento es parte del estándar de trabajo de freecad-mcp. El código y las evidencias de soporte viven en `docs/MCP_EVIDENCIAS_Y_MEJORAS.md` y `docs/UPDATE_SESION_2026-08-20.md`.*
