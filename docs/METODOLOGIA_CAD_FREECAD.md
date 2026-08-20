# Metodología de Ingeniería CAD y Modelado Paramétrico en FreeCAD

**Versión:** 1.0 · **Fecha:** 20 agosto 2026  
**Target:** FreeCAD 1.1.3+ (mínimo 1.0) · **Propósito:** Manual técnico para agentes de desarrollo y sistemas automatizados de diseño paramétrico con `freecad-mcp`.

---

## Sección 0: Índice Navegacional del Conocimiento Completo

0. [Índice Navegacional](#sección-0-índice-navegacional-del-conocimiento-completo)
1. [Metodología de Industria (ISO, VDI, Shigley)](#sección-1-metodología-de-industria--iso-vdi-shigley)
2. [Filosofía Paramétrica y Estrategias de Modelado](#sección-2-filosofía-paramétrica-y-estrategias-de-modelado)
3. [Workflow Canónico Ampliado (FreeCAD 1.1.x)](#sección-3-workflow-canónico-ampliado-freecad-11x)
4. [Análisis de Múltiples Caminos y Tabla Comparativa](#sección-4-análisis-de-múltiples-caminos-y-tabla-comparativa)
5. [Anti-Patrones Avanzados y Mitigación de TNP](#sección-5-anti-patrones-avanzados-y-mitigación-de-tnp)
6. [Diseño para Manufactura Aditiva (DfAM)](#sección-6-diseño-para-manufactura-aditiva-dfam)
7. [Tolerancias, Ajustes y Retracción en Impresión 3D](#sección-7-tolerancias-ajustes-y-retracción-en-impresión-3d)
8. [Fórmulas de Cálculo Mecánico y Geométrico](#sección-8-fórmulas-de-cálculo-mecánico-y-geométrico)
9. [Propiedades Mecánicas de Materiales FDM](#sección-9-propiedades-mecánicas-de-materiales-fdm)
10. [Referencia Completa de Tools MCP por Módulo](#sección-10-referencia-completa-de-tools-mcp-por-módulo)
11. [Referencias Cruzadas a Documentación del Repositorio](#sección-11-referencias-cruzadas-a-documentación-del-repositorio)

---

## Sección 1: Metodología de Industria (ISO, VDI, Shigley)

El diseño automatizado de piezas mecánicas no puede basarse en intuición visual ni en coordenadas arbitrarias. Este manual adopta rigurosamente los estándares internacionales de ingeniería para garantizar que cada componente generado por el agente sea funcional, intercambiable y fabricable.

- **ISO 8015 (Principios de Tolerancias Geométricas y Dimensionales - GPS)**: Establece los principios fundamentales de especificación de productos geométricos. Cada cota en el modelo paramétrico define una condición inequívoca de tamaño y forma.
- **ISO 1101 y ISO 5459 (Tolerancias Geométricas y Datums)**: Proveen el marco para definir relaciones de orientación, localización y excentricidad relativas a sistemas de referencia (Datums), vital para ensambles mecánicos precisos.
- **ISO 286 (Sistema ISO de Límites y Ajustes)**: Define las tolerancias para agujeros y ejes, permitiendo calcular automáticamente las holguras para ajustes con juego (slip fit) o con interferencia (press fit) adaptados a fabricación por deposición fundida (FDM).
- **VDI 2221 (Metodología para el Desarrollo y Diseño de Sistemas y Productos Técnicos)**: Guía el proceso sistemático de diseño: clarificación de la tarea, diseño conceptual (búsqueda de principios de solución), diseño preliminar (estructuración y dimensionamiento analítico), y diseño detallado (modelado CAD y validación).
- **Shigley's Mechanical Engineering Design (Biblia de Diseño Mecánico)**: Proporciona las bases analíticas para el cálculo de tensiones estáticas y dinámicas, factores de seguridad (FS), teoría de fallas por energía de distorsión (Von Mises) y dimensionamiento de elementos de máquinas (engranajes, ejes, uniones).

---

## Sección 2: Filosofía Paramétrica y Estrategias de Modelado

### 2.1 El Modelo Mental del Árbol de Operaciones
Una pieza CAD no es una escultura digital sino una secuencia lógica y cronológica de operaciones geométricas (Feature Tree). Cada paso depende del anterior. Modificar un parámetro en la fuente de origen recalcula toda la cadena sin romper la topología, siempre que se respeten las reglas de dependencia.

### 2.2 Estrategias de Modelado: Top-Down vs Bottom-Up vs Middle-Out
- **Bottom-Up (De abajo hacia arriba)**: Se diseñan todas las piezas de forma aislada y luego se ensamblan mediante restricciones geométricas. Útil para componentes estandarizados o catálogos existentes.
- **Top-Down (De arriba hacia abajo)**: Se parte del volumen general o un esqueleto maestro (Skeleton Modeling) y se derivan las piezas hijas en su contexto. Excelente para sistemas complejos donde las interfaces cambian conjuntamente.
- **Middle-Out (Híbrido - Recomendado)**: Se combinan componentes estándar de catálogo (bottom-up) con un núcleo paramétrico centralizador (top-down) mediante la hoja de cálculo y esqueletos de referencia. Es la estrategia estándar adoptada en este repositorio para equilibrar flexibilidad y robustez.

---

## Sección 3: Workflow Canónico Ampliado (FreeCAD 1.1.x)

Este flujo complementa la `docs/GUIA_BUENAS_PRACTICAS_CAD.md` con un enfoque estricto en la trazabilidad de datos y validación de ingeniería.

1. **Inicialización de Parámetros**: Crear documento con `freecad_new_document`, instanciar la hoja de cálculo con `freecad_spreadsheet_create`, asignar valores con `freecad_spreadsheet_set` y establecer nombres simbólicos mediante `freecad_spreadsheet_alias`.
2. **Definición del Esqueleto 2D**: Crear el croquis base mediante `freecad_create_sketch` sobre el plano ortogonal adecuado (habitualmente XY). Agregar geometrías primitivas usando `freecad_add_sketch_rectangle`, `freecad_add_sketch_circle`, `freecad_add_sketch_line` o `freecad_add_sketch_arc`.
3. **Restricción y Vínculo**: Aplicar restricciones geométricas con `freecad_add_sketch_constraint` (coincident, horizontal, vertical, parallel, tangent, symmetric). Vincular cotas a la hoja de cálculo mediante expresiones con `freecad_set_expression` (ejemplo: `Parametros.$W`). Verificar que el croquis quede totalmente restringido (0 grados de libertad) antes de llamar a `freecad_close_sketch`.
4. **Generación de Sólidos Principales**: Extruir el croquis con `freecad_pad`. Para operaciones internas o vaciados, utilizar `freecad_pocket` o `freecad_hole` (restringido a caras planas).
5. **Aplicación de Modificadores en el Tip**: Agregar redondeos o chaflanes exclusivamente sobre la última operación (Tip) utilizando `freecad_partdesign_fillet` o `freecad_partdesign_chamfer` con índices de aristas explícitos.
6. **Validación Numérica**: Consultar el volumen y la caja contenedora mediante `freecad_get_object_info` y `freecad_get_bounding_box`.
7. **Exportación**: Generar la malla para fabricación con `freecad_export_stl` o conservar el modelo analítico con `freecad_export_step` y `freecad_save_document`.

---

## Sección 4: Análisis de Múltiples Caminos y Tabla Comparativa

Ante cualquier problema de modelado en FreeCAD, existen caminos alternativos con diferentes implicancias arquitectónicas. La siguiente tabla resume las opciones evaluadas, abarcando Part vs PartDesign, Sketcher vs Draft, Built-in, A2plus y Assembly4:

| Dimensión | Opción A (Recomendada) | Opción B (Alternativa) | Criterio de Selección / Cuándo Usar |
|---|---|---|---|
| **Modelado Sólido** | **PartDesign Workbench** (Historial paramétrico, Body container, features dependientes) | **Part Workbench** (CSG booleanas directas sin historial) | Comparación Part vs PartDesign: Usar PartDesign para ingeniería paramétrica editable. Usar Part solo para booleanas directas. |
| **Dibujo 2D / Perfiles** | **Sketcher Workbench** (Perfiles acotados con constraints paramétricos) | **Draft Workbench** (Dibujo técnico 2D plano libre sin solver) | Comparación Sketcher vs Draft: Usar Sketcher para alimentar extrusiones con solver. Draft para wireframes. |
| **Sistemas de Ensamble** | **Built-in Assembly** (Módulo nativo 1.0/1.1 con motor Ondsel solver) | **A2plus** (Bottom-up clásico) o **Assembly4** (LCS jerárquico) | Comparando Built-in frente a A2plus y Assembly4, Built-in es el recomendado por defecto en FreeCAD 1.1.3 por soporte nativo. |

---

## Sección 5: Anti-Patrones Avanzados y Mitigación de TNP

Los anti-patrones representan fallas arquitectónicas que destruyen la paramétricidad del modelo. Además de los diez puntos básicos descritos en la guía principal, se deben evitar estrictamente los siguientes:

- **Topological Naming Problem (TNP)**: Ocurre cuando una operación posterior referencia una arista o cara cuyo identificador interno cambia al modificar un parámetro previo (ejemplo: Face6 pasa a ser Face8). **Mitigación**: Nunca referenciar caras intermedias para croquis de corte; anclar siempre a planos de referencia (Datum Planes) o utilizar la estrategia de acumular modificaciones sobre el Tip final.
- **Referencias Circulares en Expresiones**: Vincular la celda A de la hoja de cálculo a una propiedad del sólido, y esa propiedad a su vez a otra celda B que alimenta la celda A. El motor de cálculo colapsará en un bucle infinito.
- **Mezcla Indiscriminada de Motores**: Invocar comandos de Python arbitrarios mediante `freecad_execute_python` intercalados con herramientas MCP especializadas. Esto corrompe el árbol de operaciones y duplica objetos fantasma en la jerarquía del documento.
- **Sketches Flotantes sin Datum**: Posicionar croquis de corte trasladándolos manualmente con `freecad_move_object` en lugar de proyectar geometría externa con `freecad_add_sketch_external` o vincularlos a un plano de referencia formal.

---

## Sección 6: Diseño para Manufactura Aditiva (DfAM)

Para que un modelo paramétrico pueda ser impreso en 3D sin fallas estructurales, el agente debe incorporar reglas de diseño aditivo desde la concepción geométrica:

- **Espesores de Pared**: Todo espesor estructural debe ser múltiplo exacto del ancho de extrusión del nozzle (por ejemplo, con boquilla de 0.4mm, usar paredes de 0.8mm, 1.2mm o 1.6mm para asegurar un número entero de perímetros).
- **Orientación de Capas y Anisotropía**: La resistencia mecánica en el eje Z (intercapa) es entre 40% y 70% inferior a los ejes X e Y. Las cargas principales de tracción y flexión jamás deben actuar perpendiculares al plano de laminación.
- **Geometrías Autoportantes (Overhangs)**: Evitar voladizos superiores a 45 grados respecto de la vertical sin incorporar chaflanes o transiciones graduales (fillets).
- **Agujeros Horizontales**: Para evitar el colapso de las capas superiores en agujeros pasantes impresos sin soporte, utilizar perfiles en forma de gota de agua (**teardrop holes**) en lugar de círculos perfectos.
- **Grabados y Relieves (Embossing)**: Las inscripciones bajo relieve (gravado) deben tener una profundidad mínima de 0.6mm y un ancho de trazo de al menos 0.8mm. Relleno y retracción controlados.

---

## Sección 7: Tolerancias, Ajustes y Retracción en Impresión 3D

El cumplimiento de la norma **ISO 286** debe adaptarse a las desviaciones físicas inherentes al proceso de extrusión térmica de polímeros:

- **Shrinkage (Contracción del Material)**: Los polímeros contraen al enfriarse. Aplicar factores de escala compensatorios en la hoja de parámetros. Shrinkage del PLA (~0.2%), shrinkage de ABS (~0.5% a ~0.8%), shrinkage de Nylon (~1.0% a ~1.5%).
- **Ajuste con Juego (Slip Fit / Huelgo Libre)**: Para piezas que deben deslizar o encajar libremente sin fricción excesiva, configurar un slip fit con holgura diametral de 0.3mm a 0.5mm.
- **Ajuste con Interferencia (Press Fit / Press Encastre)**: Para uniones a presión que no requieren tornillos, configurar un press fit con bache dimensional de 0.05mm a 0.1mm según la rigidez del material.
- **Alojamientos para Insertos de Bronce (Heat-Set)**: Para roscas métricas M3 en piezas plásticas utilizando un inserto heat-set, el diámetro nominal del taladro de alojamiento se calcula mediante heat-set con D_taladro = D_nominal - 0.8mm.

---

## Sección 8: Fórmulas de Cálculo Mecánico y Geométrico

El agente debe validar analíticamente las dimensiones críticas antes de generar el código CAD mediante las siguientes ecuaciones de referencia (notación plana Unicode):

- **Engranajes Cilíndricos de Dientes Rectos**:
  - Relación módulo y diámetro: `m=d/z`
  - Diámetro primitivo fundamental: `d=m*z` (o bien `d=m·z`)
  - Diámetro de cabeza (addendum): `dₐ = m · (z + 2)`
  - Relación de contacto mínima: `ε > 1.2`
  - Holgura de flanco o backlash: `backlash` o `j ≈ 0.1 + 0.05 · m` (en mm)
- **Resistencia de Materiales y Flexión**:
  - Tensión normal por carga axial: `σ = F / A`
  - Tensión de corte por torsión: `τ = (T · r) / J`
  - Flecha máxima en viga simple con carga central: `y_max = (F · L³) / (48 · E · I)`
  - Factor de seguridad estático (Von Mises): `FS = σ_yield / σ_applied` (debe ser FS ≥ 2.0 para aplicaciones industriales generales).

---

## Sección 9: Propiedades Mecánicas de Materiales FDM

Para estimar el comportamiento de las piezas bajo carga analítica o simulación FEM preliminar, se utilizan las siguientes propiedades nominales promedio para filamentos termoplásticos impresos por FDM con 100% de relleno sólido:

| Material | Resistencia a Tracción (σ_t) | Módulo de Elasticidad (E) | Densidad (ρ) | Aplicación Típicamente Recomendada |
|---|---|---|---|---|
| **PLA** | 50 - 60 MPa | 3.5 GPa | 1.24 g/cm³ | Prototipos visuales, piezas generales de baja exigencia térmica. |
| **PETG** | 45 - 50 MPa | 2.1 GPa | 1.27 g/cm³ | Soportes mecánicos, resistencia al impacto, uso general en interiores. |
| **ABS** | 30 - 40 MPa | 2.0 GPa | 1.04 g/cm³ | Encastres flexibles, piezas sujetas a post-procesado con acetona. |
| **Nylon** | 55 - 75 MPa | 1.2 - 1.8 GPa | 1.14 g/cm³ | Engranajes de alta fricción, bisagras vivas, componentes de desgaste. |

---

## Sección 10: Referencia Completa de Tools MCP por Módulo

Para ejecutar los workflows descritos, el agente utilizará exclusivamente las siguientes herramientas del servidor MCP de FreeCAD, invocándolas con los parámetros estrictos definidos en sus esquemas:

- **Gestión Documental**: `freecad_new_document`, `freecad_open_document`, `freecad_save_document`, `freecad_close_document`, `freecad_list_objects`, `freecad_get_object_info`.
- **Hoja de Parámetros**: `freecad_spreadsheet_create`, `freecad_spreadsheet_set`, `freecad_spreadsheet_get`, `freecad_spreadsheet_alias`, `freecad_set_expression`.
- **Croquizado (Sketcher)**: `freecad_create_sketch`, `freecad_add_sketch_line`, `freecad_add_sketch_circle`, `freecad_add_sketch_arc`, `freecad_add_sketch_rectangle`, `freecad_add_sketch_constraint`, `freecad_close_sketch`.
- **Modelado Paramétrico (PartDesign)**: `freecad_pad`, `freecad_pocket`, `freecad_hole`, `freecad_revolve`, `freecad_groove`, `freecad_partdesign_fillet`, `freecad_partdesign_chamfer`, `freecad_linear_pattern`, `freecad_polar_pattern`, `freecad_partdesign_mirrored`.
- **Operaciones Geométricas y Booleanas**: `freecad_boolean_fuse`, `freecad_boolean_cut`, `freecad_boolean_intersect`, `freecad_refine_shape`, `freecad_create_box`, `freecad_create_cylinder`, `freecad_move_object`, `freecad_rotate_object`.
- **Ensambles (Assembly)**: `freecad_assembly_create`, `freecad_assembly_insert_component`, `freecad_assembly_toggle_grounded`, `freecad_assembly_fixed_joint`, `freecad_assembly_revolute_joint`, `freecad_assembly_slider_joint`, `freecad_assembly_solve`.
- **Validación y Exportación**: `freecad_get_bounding_box`, `freecad_get_volume`, `freecad_export_stl`, `freecad_export_step`.

---

## Sección 11: Referencias Cruzadas a Documentación del Repositorio

Este documento se integra orgánicamente con los siguientes artefactos de conocimiento del proyecto:

1. **`docs/GUIA_BUENAS_PRACTICAS_CAD.md`**: Documento base operativo que detalla el flujo canónico paso a paso para la creación de partes individuales en PartDesign. La presente metodología amplía dicho documento incorporando estándares formales de la industria (ISO, VDI, Shigley), análisis comparativo de múltiples caminos y fórmulas analíticas de diseño.
2. **`docs/MCP_EVIDENCIAS_Y_MEJORAS.md`**: Registro vivo de limitaciones estructurales detectadas en las herramientas MCP y sus workarounds validados (agujeros laterales, restricciones de Datum Planes, manejo de colisiones de features).
3. **`docs/UPDATE_SESION_2026-08-20.md`**: Bitácora histórica de errores corregidos en la API de FreeCAD 1.1.3 (eliminación de propiedades obsoletas como `Symmetric` directo en Pad, manejo de contenedores de Body y restricciones de índices de aristas en chaflanes).
