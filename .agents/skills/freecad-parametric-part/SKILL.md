---
name: freecad-parametric-part
description: Disena y modela piezas CAD parametrizicas base en FreeCAD utilizando el servidor MCP, siguiendo el flujo canonico con hoja Parametros, sketches fully constrained, operaciones sobre el Tip y validacion numerica por BoundBox y volumen. Usar cuando pidan modelar una pieza, parte, objeto mecanico o print 3D en FreeCAD mediante herramientas MCP. Keywords: pieza, parte, modelar, parametrico, FreeCAD, CAD, pad, pocket, sketch, solido, 3D, STL.
---

> ⚠️ **Dependencia obligatoria**: Esta skill requiere obligatoriamente que esté cargada la skill base **`freecad-core`**, que provee el puente y las herramientas transaccionales de control de estado (`freecad_begin_transaction`, `freecad_snapshot_document`, `freecad_diff_snapshot`, `freecad_commit_transaction`, `freecad_abort_transaction`).

# Skill: Modelado CAD Paramétrico en FreeCAD

Esta skill establece el flujo estricto y determinista para crear piezas mecánicas sólidas, parametrizadas y listas para impresión 3D en FreeCAD mediante las herramientas MCP de `freecad-mcp`, gobernadas por transacciones atómicas y validación numérica rigurosa.

---

## 1. Flujo principal (Mermaid graph TD)

```mermaid
graph TD
    Start([Inicio diseño paramétrico]) --> TxBegin[freecad_begin_transaction]
    TxBegin --> F0[Fase 0: Setup Documento & Spreadsheet]
    F0 --> G0{¿Hoja Parametros con alias maestros?}
    
    G0 -->|No| Fix0[Crear Spreadsheet y alias A1..An] --> G0
    G0 -->|Sí| F1[Fase 1: Sketch Base Maestro]
    
    F1 --> G1{¿Sketch Fully Constrained? [0 GDL]}
    G1 -->|No| Fix1[Agregar constraints / origen fijo] --> G1
    G1 -->|Sí| Snap1[freecad_snapshot_document]
    
    Snap1 --> F2[Fase 2: Extrusión Sólido Base (Pad)]
    F2 --> G2{¿BoundingBox y Volumen coinciden con hoja?}
    G2 -->|No| Abort2[freecad_abort_transaction / Corregir Pad] --> F2
    G2 -->|Sí| F3[Fase 3: Features sobre Caras Planas (Pocket/Hole/Pattern)]
    
    F3 --> G3{¿Es cara plana o agujero pasante lateral?}
    G3 -->|No - Lateral/Curvo| Fallback3[Primitivas cilindro + freecad_boolean_cut + refine_shape] --> Snap3[freecad_snapshot_document]
    G3 -->|Sí - Cara plana| Normal3[freecad_pocket / freecad_hole con expresiones] --> Snap3
    
    Snap3 --> F4[Fase 4: Acabado de Bordes (Dress-up)]
    F4 --> G4{¿Fillet/Chamfer aplicado solo sobre el Tip y bordes explícitos?}
    G4 -->|No - Global o temprano| Fix4[Corregir target al Tip y edgeIndices] --> G4
    G4 -->|Sí| Diff[freecad_diff_snapshot]
    
    Diff --> F5[Fase 5: Validación Numérica & Topológica]
    F5 --> G5{¿Volumen y BBox OK contra cálculo teórico?}
    G5 -->|No| Abort5[freecad_abort_transaction] --> Start
    G5 -->|Sí| F6[Fase 6: Exportación y Cierre]
    
    F6 --> Save[freecad_save_document .FCStd] --> Export[freecad_export_stl]
    Export --> TxCommit[freecad_commit_transaction] --> End([Pieza Paramétrica Lista])
```

---

## 2. Decisiones y ramas (SI/ENTONCES)

| Bifurcación (Gate) | Condición | Acción si Sí (Verdadero) | Acción si No (Falso / Rechazo) |
|---|---|---|---|
| **G0: Spreadsheet** | ¿Existe celda `Parametros` con alias definidos? | Avanzar a Fase 1 (Sketch base). | Crear `Parametros`, asignar celdas y alias maestros (`$W`, `$H`, `$T`). |
| **G1: Sketch GDL** | ¿Grados de libertad == 0 (Fully Constrained)? | Avanzar a Fase 2 (Pad) y snapshot. | Bloquear pad; agregar constraints geométricas y dimensionales faltantes. |
| **G2: Sólido base** | ¿BoundingBox y volumen coinciden con la fórmula teórica? | Avanzar a Fase 3 (Features). | Ejecutar `freecad_abort_transaction`, corregir expresiones de extrusión. |
| **G3: Geometría de corte** | ¿El corte va sobre cara plana normal al eje Z/XY? | Usar `freecad_pocket` o `freecad_hole` directo. | Aplicar workaround de primitivas + `freecad_boolean_cut` + `freecad_refine_shape`. |
| **G4: Dress-up** | ¿Fillet/chamfer se aplica sobre el Tip actual con bordes explícitos? | Avanzar a Fase 5 (Validación). | Corregir target al Tip y restringir `edgeIndices` específicos (evitar global). |
| **G5: Validación final** | ¿Volumen final exacto y BBox dentro de tolerancia FDM? | Avanzar a Fase 6 (Exportación y Commit). | Ejecutar `freecad_abort_transaction` y reiniciar ciclo de diseño. |

---

## 3. Workflow operativo (tool calls concretos)

1. **Gobierno y Setup**:
   - `freecad_begin_transaction()`
   - `freecad_new_document(name="pieza-base")`
   - `freecad_spreadsheet_create(name="Parametros")`
   - `freecad_spreadsheet_set(sheetName="Parametros", cells=[{cell: "A1", value: "Ancho"}, {cell: "B1", value: "100.0"}, {cell: "A2", value: "Largo"}, {cell: "B2", value: "50.0"}, {cell: "A3", value: "Espesor"}, {cell: "B3", value: "5.0"}])`
   - `freecad_spreadsheet_alias(sheetName="Parametros", cell="B1", alias="W")`
   - `freecad_spreadsheet_alias(sheetName="Parametros", cell="B2", alias="L")`
   - `freecad_spreadsheet_alias(sheetName="Parametros", cell="B3", alias="T")`

2. **Sketch y Pad**:
   - `freecad_create_sketch(plane="XY", name="Sk_Base")`
   - `freecad_add_sketch_rectangle(sketchName="Sk_Base", x1=0, y1=0, x2=1, y2=1)`
   - `freecad_add_sketch_constraint(sketchName="Sk_Base", constraintType="coincident", index1=1)`
   - `freecad_add_sketch_constraint(sketchName="Sk_Base", constraintType="distance", index1=1, value=100.0)`
   - `freecad_set_expression(objectName="Sk_Base", property="Constraints[2]", expression="Parametros.W")`
   - `freecad_close_sketch(sketchName="Sk_Base")`
   - `freecad_pad(sketchName="Sk_Base", length=5.0, name="Pad_Base")`
   - `freecad_set_expression(objectName="Pad_Base", property="Length", expression="Parametros.T")`
   - `freecad_snapshot_document()`

3. **Features y Dress-up**:
   - `freecad_create_sketch(plane="XY", name="Sk_Pocket")`
   - `freecad_pocket(sketchName="Sk_Pocket", depth=10.0, name="Pocket_Centro")`
   - `freecad_partdesign_fillet(objectName="Pocket_Centro", radius=2.0, edgeNames=["Edge1", "Edge2"], name="Fillet_Bordes")`

4. **Validación y Exportación**:
   - `freecad_get_object_info(objectName="Fillet_Bordes")`
   - `freecad_get_bounding_box(objectName="Fillet_Bordes")`
   - `freecad_get_volume(objectName="Fillet_Bordes")`
   - `freecad_diff_snapshot()`
   - `freecad_save_document()`
   - `freecad_export_stl(objectNames=["Fillet_Bordes"], filePath="/absolute/path/pieza.stl")`
   - `freecad_commit_transaction()`

---

## 4. Gates de validación (obligatorios)

| Fase | Criterio Objetivo | Tool MCP Verificadora | Acción Correctiva si Falla |
|---|---|---|---|
| **Fase 0** | Celdas maestras con alias válidos | `freecad_spreadsheet_get` | Asignar celdas faltantes y redefinir alias. |
| **Fase 1** | Sketch con 0 grados de libertad (Fully Constrained) | `freecad_close_sketch` / info | Agregar constraints faltantes. PROHIBIDO padear si falla. |
| **Fase 2** | BoundingBox exacto según `Parametros` | `freecad_get_bounding_box` | Corregir expresiones en propiedades de extrusión. |
| **Fase 3** | Corte vinculado a cara plana o boolean correcto | `freecad_get_object_info` | Reanclar sketch a cara plana o aplicar workaround de primitivas. |
| **Fase 4** | Fillet aplicado exclusivamente sobre el Tip activo | `freecad_get_object_info` | Reordenar árbol de features al Tip actual y restringir `edgeNames`. |
| **Fase 5** | Volumen y dimensiones coinciden con cálculo teórico | `freecad_get_volume` + `freecad_diff_snapshot` | Ejecutar `freecad_abort_transaction` y revisar parámetros. |

---

## 5. Tabla de fallas comunes

| Síntoma / Error | Causa Raíz | Mitigación Obligatoria |
|---|---|---|
| **Sketch Under-Constrained** | Faltan restricciones de posición o cotas dimensionales | Bloquear pad; agregar constraints de coincidencia con origen y cotas absolutas hasta obtener 0 GDL. |
| **Fillet falla por aristas (Topology Naming)** | Selección de aristas por índice flotante tras un corte intermedio | Restringir `edgeNames` explícitamente sobre el Tip actual y aplicar al final de la cadena constructiva. |
| **Redondeo global descontrolado** | Aplicar fillet con selector genérico de todas las aristas | Especificar `edgeIndices` o `edgeNames` concretos; prohibido redondear agujeros internos críticos. |
| **Números mágicos en cotas** | Hardcodear valores flotantes directamente en sketches o pads | Centralizar toda cota en la hoja `Parametros` y vincular mediante expresiones (`Parametros.W`). |
| **Validación visual sin datos** | Intentar validar piezas mirando capturas de viewport vacías | Reemplazar validación visual por métricas numéricas estrictas (`freecad_get_volume` + `freecad_get_bounding_box`). |

---

## 6. Anti-patrones (PROHIBIDO)

1. **Sketches flotantes o no restringidos**: Queda prohibido cerrar un sketch sin 0 grados de libertad.
2. **Números mágicos**: Cero dimensiones directas en features; todo debe fluir de la hoja `Parametros`.
3. **Mezclar wrappers MCP con execute_python**: No combinar llamadas MCP con scripts Python arbitrarios en la misma sesión para evitar duplicación de objetos (`Hole001`) y corrupción del feature tree.
4. **Redondeos tempranos**: Aplicar fillet o chamfer antes de terminar los cortes posteriores (rompe referencias topológicas).

---

## 7. Checklist final

- [ ] Transacción iniciada con `freecad_begin_transaction` y cerrada con `freecad_commit_transaction`.
- [ ] Hoja `Parametros` creada con alias maestros y sin números mágicos.
- [ ] Sketch base `fully constrained` (0 GDL).
- [ ] Operaciones de corte y features ancladas a caras planas o resueltas mediante booleans documentados.
- [ ] Dress-up (fillet/chamfer) aplicado sobre el Tip con aristas explícitas.
- [ ] Validación numérica aprobada (`freecad_get_bounding_box` + `freecad_get_volume`).
- [ ] Archivo `.FCStd` guardado y `.stl` exportado correctamente.

---

## 8. References

- `docs/GUIA_BUENAS_PRACTICAS_CAD.md` — Lineamiento maestro de diseño paramétrico e impresión 3D.
- `docs/METODOLOGIA_CAD_FREECAD.md` — Metodología transaccional y escala M1-M5.
- `docs/MCP_EVIDENCIAS_Y_MEJORAS.md` — Registro de workarounds (agujeros laterales y primitivas).
