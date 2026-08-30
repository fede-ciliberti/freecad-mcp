# Matriz de Cobertura de Skills FreeCAD — COBERTURA_SKILLS.md

**Versión:** 1.0 · **Fecha:** 24 agosto 2026  
**Proyecto:** `freecad-mcp` · **Target:** FreeCAD 1.1.3+ (mínimo 1.0)  
**Autor:** Fede & Sisyphus · **Estado:** Documento Maestro Activo (Entregable 1 del Plan de Rediseño)

---

## 1. Resumen Ejecutivo y Métricas de Cobertura

El presente documento establece la **Matriz de Cobertura Universal de Skills** para el servidor MCP de FreeCAD (`freecad-mcp`). Su objetivo es garantizar que **las 174 herramientas (tools)** expuestas en los 17 módulos del servidor tengan una asignación clara, explícita y determinista a flujos de trabajo de ingeniería, eliminando la improvisación y el uso a ciegas de comandos.

### 1.1 Métrica Dura de Cobertura

- **Herramientas totales en `src/index.ts`**: 174 tools distribuídas en 17 módulos.
- **Cobertura previa (skills legadas)**: ~23% de las tools mapeadas explícitamente (predominio exclusivo de PartDesign básico). Módulos enteros como `state.ts` (7 tools) y `view.ts` (2 tools) contaban con 0 referencias formales.
- **Cobertura objetivo alcanzada por esta matriz**: **100% de contabilidad de herramientas (174/174)**.
  - **Asignadas a flujos de skills activas**: 155 tools (89.1%).
  - **Exclusiones explícitas documentadas y justificadas**: 19 tools (10.9%) — abarca el módulo BIM completo (9 tools), el módulo Surface (5 tools), e integraciones restringidas/condicionales (5 tools).

### 1.2 Mapa General de Skills (Ecosistema de 12 Skills)

El sistema se articula a través de 9 skills existentes y 3 skills nuevas introducidas por el plan de rediseño:

| Skill | Tipo | Ámbito / Módulo Principal | Estado |
|---|---|---|---|
| `freecad-core` | Base / Infraestructura | Protocolo socket, transacciones, snapshot/diff, automejora, inspección | Existente (refactor) |
| `freecad-parametric-part` | Dominio / CAD Base | PartDesign canónico, Spreadsheet, Sketcher fully constrained, Pad/Pocket/Hole, Fillet/Chamfer en Tip | Existente (refactor) |
| `freecad-assembly` | Dominio / Ensambles | Módulo Assembly (Ondsel solver), Joints (Fixed, Revolute, Slider, Ball), Grounded | Existente (refactor) |
| `freecad-gears` | Dominio / Transmisiones | FCGear, engranajes evolventes, cálculo de módulo, backlash para FDM | Existente (refactor) |
| `freecad-tolerances` | Dominio / Ajustes | ISO 286, slip fit, press fit, contracción (shrinkage), alojamientos heat-set M3-M6 | Existente (refactor) |
| `freecad-dfam` | Dominio / Impresión 3D | Reglas FDM, orientaciones, voladizos, teardrops, espesor de pared, embossing | Existente (refactor) |
| `freecad-robotic-joints` | Dominio / Cinemática | Articulaciones robóticas, pivotes, linkages, eslabones, alojamientos de servos | Existente (refactor) |
| `freecad-stress-analysis` | Dominio / Simulación | FEM analysis, materiales FDM, restricciones de fuerza/presión, solver, Von Mises | Existente (refactor) |
| `mcp-freecad-automejora` | Meta / Diagnóstico | Registro de gaps, evidencias, auto-mejora continua del servidor MCP | Existente |
| `freecad-modification` | Dominio / Mantenimiento | Escala de modificación M1 a M5, refactorización transaccional, deuda paramétrica | **Nueva (Plan §8.1)** |
| `freecad-techdraw` | Dominio / Planos 2D | Hojas TechDraw, proyección ortogonal, acotado 2D, exportación SVG/DXF | **Nueva (Plan §8.1)** |
| `freecad-mesh-repair` | Dominio / Mallas | Reparación de mallas STL, Mesh-to-Shape, refinado BRep, simplificación/decimado | **Nueva (Plan §8.1)** |

---

## 2. Fuente 1: Matriz Bottom-Up (Tools MCP → Caso de Uso → Skill)

Revisión exhaustiva de las **174 tools** extraídas directamente de `src/index.ts` y sus módulos en `src/tools/`, mapeadas a sus casos de uso específicos y a la skill responsable de su gobierno.

### 2.1 Módulo Document (`document.ts` — 6 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_new_document` | Inicializar documento CAD limpio con naming `kebab-case`. | `freecad-core`, `freecad-parametric-part` |
| `freecad_open_document` | Cargar modelos paramétricos existentes `.FCStd` para modificación. | `freecad-core`, `freecad-modification` |
| `freecad_save_document` | Guardar el estado maestro del modelo en disco (`.FCStd`). | `freecad-core`, `freecad-parametric-part`, `freecad-assembly` |
| `freecad_close_document` | Cerrar documentos activos liberando memoria del bridge. | `freecad-core` |
| `freecad_list_objects` | Inspeccionar el árbol de objetos y detectar dependencias topológicas. | `freecad-core`, `freecad-modification` |
| `freecad_get_object_info` | Obtener propiedades, tipos y estado de recálculo de un objeto. | `freecad-core`, `freecad-parametric-part`, `freecad-modification` |

### 2.2 Módulo Primitives (`primitives.ts` — 11 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_create_box` | Generar bloque primitivo para CSG o herramientas de corte booleano. | `freecad-parametric-part`, `freecad-robotic-joints` |
| `freecad_create_cylinder` | Generar cilindro primitivo para pasadores, ejes o booleans de corte lateral. | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_create_sphere` | Generar esfera primitiva para uniones esféricas o alojamientos. | `freecad-parametric-part`, `freecad-assembly` |
| `freecad_create_cone` | Generar cono primitivo para avellanados o acoplamientos cónicos. | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_create_torus` | Generar toroide para asientos de O-rings o anillos de retención. | `freecad-parametric-part` |
| `freecad_create_wedge` | Generar cuña primitiva para chavetas o guías inclinadas. | `freecad-parametric-part` |
| `freecad_create_helix` | Generar hélice 3D para resortes, roscas o trayectorias de barrido. | `freecad-gears`, `freecad-parametric-part` |
| `freecad_create_spiral` | Generar espiral plana para mecanismos de caracol o resortes planos. | `freecad-gears`, `freecad-robotic-joints` |
| `freecad_create_ellipsoid` | Generar elipsoide primitivo para domos o superficies aerodinámicas. | `freecad-parametric-part` |
| `freecad_create_tube` | Generar tubo cilíndrico de pared fina para bujes o casquillos. | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_create_prism` | Generar prisma poligonal para cabezas hexagonales de pernos o tuercas. | `freecad-parametric-part`, `freecad-tolerances` |

### 2.3 Módulo Operations (`operations.ts` — 17 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_boolean_fuse` | Unión booleana sólida de cuerpos independientes (Part). | `freecad-parametric-part`, `freecad-robotic-joints` |
| `freecad_boolean_cut` | Resta booleana sólida (ej. agujeros laterales perpendiculares). | `freecad-parametric-part`, `freecad-dfam` |
| `freecad_boolean_intersect` | Intersección booleana para obtener volúmenes comunes. | `freecad-parametric-part` |
| `freecad_fillet` | Redondeo BRep directo de aristas sobre formas Part (OpenCASCADE). | `freecad-parametric-part`, `freecad-dfam` |
| `freecad_chamfer` | Chaflán BRep directo de aristas sobre formas Part. | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_move_object` | Traslación espacial de sólidos independientes o primitivas. | `freecad-parametric-part`, `freecad-assembly` |
| `freecad_rotate_object` | Rotación angular espacial sobre ejes ortogonales. | `freecad-parametric-part`, `freecad-assembly` |
| `freecad_copy_object` | Duplicar objetos dentro del documento. | `freecad-parametric-part`, `freecad-modification` |
| `freecad_delete_object` | Eliminar objetos obsoletos en flujos M4 de modificación. | `freecad-modification` |
| `freecad_mirror_object` | Espejar sólidos Part respecto a planos cartesianos. | `freecad-parametric-part` |
| `freecad_check_geometry` | Validar validez BRep de un sólido antes de booleanos complejos. | `freecad-core`, `freecad-mesh-repair` |
| `freecad_refine_shape` | Limpiar aristas redundantes y simplificar caras tras booleano. | `freecad-parametric-part` |
| `freecad_boolean_fragments` | Particionar sólidos por superficies de contacto o planos de corte. | `freecad-robotic-joints`, `freecad-parametric-part` |
| `freecad_slice` | Rebanar un sólido en múltiples piezas independientes. | `freecad-dfam`, `freecad-parametric-part` |
| `freecad_boolean_xor` | Operación OR exclusiva booleana entre dos sólidos. | `freecad-parametric-part` |
| `freecad_join_connect` | Conectar tubos o perfiles huecos respetando paredes internas. | `freecad-robotic-joints`, `freecad-parametric-part` |
| `freecad_join_cutout` | Realizar recorte de ajuste entre perfiles que se cruzan. | `freecad-robotic-joints`, `freecad-tolerances` |

### 2.4 Módulo Sketcher (`sketcher.ts` — 16 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_create_sketch` | Crear un croquis 2D anclado a plano cartesiano o cara plana. | `freecad-parametric-part`, `freecad-gears` |
| `freecad_add_sketch_line` | Agregar segmento de línea recta al croquis activo. | `freecad-parametric-part` |
| `freecad_add_sketch_circle` | Agregar circunferencia para agujeros, pinos o aristas curvas. | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_add_sketch_arc` | Agregar arco de circunferencia para transiciones o ranuras. | `freecad-parametric-part` |
| `freecad_add_sketch_rectangle` | Agregar rectángulo base para perfiles prismáticos. | `freecad-parametric-part` |
| `freecad_add_sketch_constraint` | Aplicar restricciones geométricas (coincidencia, tangencia, simetría, cotas). | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_add_sketch_ellipse` | Agregar elipse para perfiles aerodinámicos o camones. | `freecad-parametric-part` |
| `freecad_add_sketch_bspline` | Agregar curva BSpline paramétrica para perfiles orgánicos/aerodinámicos. | `freecad-parametric-part` |
| `freecad_add_sketch_polygon` | Agregar polígono regular (hexágonos para tuercas, chaveteros). | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_add_sketch_slot` | Agregar ranura/oblongo para ajustes colineales o corredderas. | `freecad-parametric-part`, `freecad-robotic-joints` |
| `freecad_add_sketch_point` | Agregar punto de referencia o centros para patrones de agujeros. | `freecad-parametric-part` |
| `freecad_add_sketch_external` | Proyectar geometría externa sobre el croquis para mitigar TNP. | `freecad-parametric-part`, `freecad-modification` |
| `freecad_sketch_fillet` | Redondear esquinas 2D dentro del croquis antes de extruir. | `freecad-parametric-part` |
| `freecad_sketch_trim` | Recortar segmentos sobrantes de geometrías que se cruzan. | `freecad-parametric-part` |
| `freecad_sketch_toggle_construction` | Convertir líneas de geometría activa a líneas axiliares de construcción. | `freecad-parametric-part` |
| `freecad_close_sketch` | Validar solver, calcular grados de libertad y cerrar croquis. | `freecad-parametric-part` |

### 2.5 Módulo PartDesign (`part-design.ts` — 20 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_pad` | Extrusión sólida de un croquis cerrado para formar un cuerpo. | `freecad-parametric-part`, `freecad-robotic-joints` |
| `freecad_pocket` | Vaciamiento/corte extruído hacia el interior del sólido. | `freecad-parametric-part`, `freecad-dfam` |
| `freecad_revolve` | Revolución de un croquis alrededor de un eje para sólidos rotacionales. | `freecad-parametric-part` |
| `freecad_loft` | Extrusión de transición suave entre múltiples croquis en planos paralelos. | `freecad-parametric-part` |
| `freecad_sweep` | Barrido de un croquis de perfil a lo largo de una trayectoria de guía. | `freecad-parametric-part`, `freecad-robotic-joints` |
| `freecad_partdesign_fillet` | Redondeo de aristas en PartDesign vinculado al Body contenedor. | `freecad-parametric-part`, `freecad-dfam` |
| `freecad_partdesign_chamfer` | Chaflán de aristas en PartDesign vinculado al Tip final. | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_hole` | Generar agujero estandarizado cilíndrico/roscado en cara axial de Body. | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_partdesign_thickness` | Ahuecar sólido dejando un espesor de pared uniforme (vaciado tipo carcasa). | `freecad-dfam`, `freecad-parametric-part` |
| `freecad_linear_pattern` | Repetición lineal de una feature (Pocket/Pad) a lo largo de una dirección. | `freecad-parametric-part` |
| `freecad_polar_pattern` | Repetición circular de una feature alrededor de un eje central. | `freecad-parametric-part`, `freecad-gears` |
| `freecad_partdesign_mirrored` | Espejar una feature respecto a un plano de simetría de PartDesign. | `freecad-parametric-part` |
| `freecad_additive_helix` | Extrusión helicoidal aditiva para roscas externas o tornillos sin fin. | `freecad-gears`, `freecad-parametric-part` |
| `freecad_subtractive_helix` | Extrusión helicoidal sustractiva para roscas internas métricas. | `freecad-gears`, `freecad-tolerances` |
| `freecad_additive_pipe` | Barrido aditivo de perfiles a lo largo de trayectorias complejas. | `freecad-robotic-joints`, `freecad-parametric-part` |
| `freecad_subtractive_pipe` | Barrido sustractivo para canales internos o conductos vaciados. | `freecad-parametric-part` |
| `freecad_groove` | Corte por revolución alrededor de un eje (canales para O-rings, seeger). | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_draft_angle` | Aplicar ángulos de desmolde a caras para procesos de moldeo/impresión. | `freecad-dfam` |
| `freecad_multi_transform` | Combinar patrones lineales, polares y espejos en una sola operación. | `freecad-parametric-part` |
| `freecad_shape_binder` | Crear referencia asociativa a geometría de otro Body para ensambles. | `freecad-assembly`, `freecad-modification` |

### 2.6 Módulo Import/Export (`import-export.ts` — 17 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_import_step` | Importar modelos CAD neutros STEP desde catálogos de proveedores. | `freecad-parametric-part`, `freecad-assembly` |
| `freecad_import_stl` | Importar mallas trianguladas STL para ingeniería inversa o reparación. | `freecad-mesh-repair` |
| `freecad_export_step` | Exportar sólido analítico en formato STEP para intercambio industrial. | `freecad-parametric-part`, `freecad-assembly` |
| `freecad_export_stl` | Exportar malla discretizada STL optimizada para laminación FDM/SLA. | `freecad-parametric-part`, `freecad-dfam` |
| `freecad_export_obj` | Exportar visualización poligonal en formato OBJ. | `freecad-mesh-repair` |
| `freecad_measure_distance` | Medir distancia lineal entre dos puntos o vértices del modelo. | `freecad-core`, `freecad-tolerances` |
| `freecad_measure_angle` | Medir ángulo comprendido entre dos aristas o caras planas. | `freecad-core`, `freecad-tolerances` |
| `freecad_get_volume` | Calcular volumen exacto de la pieza para validación teórica. | `freecad-core`, `freecad-parametric-part`, `freecad-stress-analysis` |
| `freecad_get_bounding_box` | Calcular caja contenedora (BoundBox) para verificar dimensiones externas. | `freecad-core`, `freecad-parametric-part`, `freecad-dfam` |
| `freecad_execute_python` | Ejecutar scripts Python directos en casos de workaround aislado. | `freecad-core` (**Uso restringido / Exclusión parcial**) |
| `freecad_import_iges` | Importar superficies IGES (requiere entorno GUI). | `freecad-mesh-repair` (**Restricción GUI-only**) |
| `freecad_import_dxf` | Importar perfiles vectoriales 2D DXF para cortes o bocetos. | `freecad-techdraw`, `freecad-parametric-part` |
| `freecad_import_svg` | Importar gráficos vectoriales SVG para logos, grabado o perfiles. | `freecad-techdraw`, `freecad-dfam` |
| `freecad_export_iges` | Exportar superficies en formato IGES. | `freecad-mesh-repair` |
| `freecad_export_dxf` | Exportar perfiles o vistas 2D a DXF para CNC o corte láser. | `freecad-techdraw` |
| `freecad_export_svg` | Exportar planos 2D o vistas ortogonales a SVG vectorial. | `freecad-techdraw` |
| `freecad_export_brep` | Exportar la estructura de representación de fronteras BRep directa. | `freecad-mesh-repair`, `freecad-parametric-part` |

### 2.7 Módulo Draft (`draft.ts` — 17 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_draft_wire` | Crear polílinea 2D en el espacio 3D para trayectorias o marcos. | `freecad-parametric-part` |
| `freecad_draft_bspline` | Crear B-Spline libre 2D/3D mediante puntos de control. | `freecad-parametric-part` |
| `freecad_draft_polygon` | Crear polígono regular en el plano de trabajo de Draft. | `freecad-parametric-part` |
| `freecad_draft_ellipse` | Crear elipse plana en el banco Draft. | `freecad-parametric-part` |
| `freecad_draft_rectangle` | Crear rectángulo plano en el banco Draft. | `freecad-parametric-part` |
| `freecad_draft_facebinder` | Crear una superficie ligada a partir de caras seleccionadas. | `freecad-parametric-part`, `freecad-modification` |
| `freecad_draft_clone` | Crear clon paramétrico vinculado a un objeto fuente (ligero). | `freecad-assembly`, `freecad-parametric-part` |
| `freecad_draft_shapestring` | Generar texto 3D extruible a partir de fuentes para marcado/embossing. | `freecad-dfam` |
| `freecad_draft_move` | Trasladar objetos 2D/3D con precisión mediante vectores. | `freecad-parametric-part`, `freecad-assembly` |
| `freecad_draft_rotate` | Rotar objetos respecto a puntos de anclaje específicos. | `freecad-parametric-part`, `freecad-assembly` |
| `freecad_draft_scale` | Escalar objetos o aplicar factores de compensación por retracción. | `freecad-tolerances`, `freecad-parametric-part` |
| `freecad_draft_offset` | Crear perfil paralelo a una distancia especificada (equidistancia). | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_draft_upgrade` | Convertir líneas sueltas en polilíneas cerradas o caras compuestas. | `freecad-mesh-repair`, `freecad-parametric-part` |
| `freecad_draft_downgrade` | Descomponer caras o polilíneas en aristas y segmentos individuales. | `freecad-mesh-repair`, `freecad-parametric-part` |
| `freecad_draft_path_array` | Arreglo/patrón de objetos replicados a lo largo de una curva o trayectoria. | `freecad-robotic-joints`, `freecad-gears` |
| `freecad_draft_dimension` | Agregar cota 2D en el espacio de trabajo Draft. | `freecad-techdraw` |
| `freecad_draft_shape2dview` | Proyectar vista 2D plana de un sólido 3D para planos o exportación. | `freecad-techdraw` |

### 2.8 Módulo Mesh (`mesh.ts` — 7 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_mesh_from_shape` | Convertir sólido BRep a malla triangulada con tolerancia fina. | `freecad-mesh-repair`, `freecad-dfam` |
| `freecad_mesh_to_shape` | Convertir malla triangular en cara/sólido BRep para edición CAD. | `freecad-mesh-repair` |
| `freecad_mesh_repair` | Reparar bordes amarres, hoyos, normales invertidas y auto-intersecciones. | `freecad-mesh-repair` |
| `freecad_mesh_decimate` | Reducir la densidad de polígonos conservando la topología clave. | `freecad-mesh-repair` |
| `freecad_mesh_refine` | Subdividir mallas para suavizar superficies trianguladas. | `freecad-mesh-repair` |
| `freecad_mesh_info` | Consultar número de vértices, facetas, volumen y compacidad de la malla. | `freecad-mesh-repair`, `freecad-dfam` |
| `freecad_mesh_boolean` | Operaciones booleanas directas (unión, resta, corte) sobre mallas STL. | `freecad-mesh-repair` |

### 2.9 Módulo TechDraw (`techdraw.ts` — 6 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_techdraw_create_page` | Crear hoja de dibujo técnico normalizada (A4, A3) con formato. | `freecad-techdraw` |
| `freecad_techdraw_add_view` | Insertar vista ortogonal individual de una pieza en la hoja. | `freecad-techdraw` |
| `freecad_techdraw_add_projection_group` | Generar grupo de proyecciones ortogonales automáticas (Frontal, Superior, Izq, Iso). | `freecad-techdraw` |
| `freecad_techdraw_add_dimension` | Insertar cotas lineales, de radio, diámetro o angulares en la vista 2D. | `freecad-techdraw` |
| `freecad_techdraw_export_svg` | Exportar plano formal en formato vectorial SVG para impresión o informe. | `freecad-techdraw` |
| `freecad_techdraw_export_dxf` | Exportar dibujo técnico normalizado a DXF para taller o CNC. | `freecad-techdraw` |

### 2.10 Módulo Advanced Operations (`advanced-operations.ts` — 11 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_thickness` | Crear cáscara vaciada sobre sólidos Part con grosor determinado. | `freecad-dfam`, `freecad-parametric-part` |
| `freecad_offset_3d` | Generar superficie o sólido desplazado 3D (ampliación/contracción). | `freecad-tolerances`, `freecad-parametric-part` |
| `freecad_section` | Generar curva de intersección plana/sección transversal de un sólido. | `freecad-stress-analysis`, `freecad-techdraw` |
| `freecad_compound` | Agrupar múltiples objetos en un contenedor Compound sin fusionarlos. | `freecad-assembly`, `freecad-parametric-part` |
| `freecad_linear_array` | Matriz lineal de duplicación sobre sólidos Part. | `freecad-parametric-part` |
| `freecad_polar_array` | Matriz polar circular sobre sólidos Part. | `freecad-gears`, `freecad-parametric-part` |
| `freecad_scale_object` | Escalar dimensiones globales de un sólido en los ejes X, Y, Z. | `freecad-tolerances`, `freecad-parametric-part` |
| `freecad_extrude` | Extrusión directa de perfiles Part en una dirección especificada. | `freecad-parametric-part` |
| `freecad_get_center_of_mass` | Obtener coordenadas (X, Y, Z) del centro de masa para balanceo dinámico. | `freecad-core`, `freecad-stress-analysis`, `freecad-assembly` |
| `freecad_get_face_info` | Obtener área, vector normal, tipo de superficie y bordes de una cara. | `freecad-core`, `freecad-dfam`, `freecad-parametric-part` |
| `freecad_get_edge_info` | Obtener longitud, vértices y curvatura de una arista para selecciones. | `freecad-core`, `freecad-parametric-part`, `freecad-tolerances` |

### 2.11 Módulo Spreadsheet (`spreadsheet.ts` — 5 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_spreadsheet_create` | Crear hoja de cálculo llamada `Parametros` como fuente única de verdad. | `freecad-parametric-part`, `freecad-gears`, `freecad-tolerances` |
| `freecad_spreadsheet_set` | Escribir valores numéricos o cadenas en celdas específicas. | `freecad-parametric-part`, `freecad-modification` |
| `freecad_spreadsheet_get` | Leer valores o fórmulas almacenadas en celdas de la hoja. | `freecad-core`, `freecad-modification` |
| `freecad_spreadsheet_alias` | Asignar nombres simbólicos (ej. `$W`, `$H`, `$t_pared`) a celdas clave. | `freecad-parametric-part`, `freecad-tolerances` |
| `freecad_set_expression` | Enlazar propiedades geométricas de objetos a expresiones de la hoja. | `freecad-parametric-part`, `freecad-tolerances` |

### 2.12 Módulo BIM (`bim.ts` — 9 tools) — **EXCLUSIÓN EXPLÍCITA DOCUMENTADA**

| Tool MCP | Razón Técnica de Exclusión |
|---|---|
| `freecad_arch_wall`, `freecad_arch_structure`, `freecad_arch_window`, `freecad_arch_floor`, `freecad_arch_building`, `freecad_arch_site`, `freecad_arch_roof`, `freecad_arch_stairs`, `freecad_export_ifc` | **Fuera del dominio de ingeniería mecánica e impresión 3D**. Pertenecen exclusivamente al flujo arquitectónico/BIM (normas IFC). Se excluyen de las skills mecánicas activas para evitar contaminación del espacio de búsqueda del agente. |

### 2.13 Módulo FEM (`fem.ts` — 8 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_fem_analysis` | Inicializar contenedor de análisis FEM en el documento. | `freecad-stress-analysis` |
| `freecad_fem_material` | Asignar propiedades mecánicas del material (módulo E, Poisson, densidad). | `freecad-stress-analysis` |
| `freecad_fem_constraint_fixed` | Aplicar restricción de empotramiento/fijación nula en caras del sólido. | `freecad-stress-analysis` |
| `freecad_fem_constraint_force` | Aplicar vector de carga/fuerza puntual o distribuida en Newtons. | `freecad-stress-analysis` |
| `freecad_fem_constraint_pressure` | Aplicar presión normal uniforme sobre caras seleccionadas (MPa). | `freecad-stress-analysis` |
| `freecad_fem_mesh` | Generar malla de elementos finitos tetraédricos (Gmsh/Netgen). | `freecad-stress-analysis` |
| `freecad_fem_solver` | Configurar y ejecutar el motor de cálculo FEA (CalculiX). | `freecad-stress-analysis` |
| `freecad_fem_results` | Extraer mapa de tensiones equivalentes Von Mises, desplazamientos y FS. | `freecad-stress-analysis` |

### 2.14 Módulo Surface (`surface.ts` — 5 tools) — **EXCLUSIÓN EXPLÍCITA DE FLUJO PRIMARIO**

| Tool MCP | Razón Técnica de Exclusión |
|---|---|
| `freecad_surface_filling`, `freecad_surface_geomfill`, `freecad_surface_sections`, `freecad_surface_extend`, `freecad_surface_ruled` | **Modelado de superficies orgánicas no sólido**. Se excluyen del flujo canónico de ingeniería sólida paramétrica. Su uso se reserva como extensión secundaria para parcheo avanzado de geometrías BRep no cerradas. |

### 2.15 Módulo Assembly (`assembly.ts` — 10 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_assembly_create` | Crear contenedor de ensamble nativo (Ondsel solver) en el documento. | `freecad-assembly`, `freecad-robotic-joints` |
| `freecad_assembly_insert_component` | Insertar pieza o sub-ensamble como componente dentro de la jerarquía. | `freecad-assembly` |
| `freecad_assembly_toggle_grounded` | Fijar/anclar (ground) el componente base de referencia en el espacio. | `freecad-assembly` |
| `freecad_assembly_fixed_joint` | Crear restricción rígida de 0 grados de libertad entre dos componentes. | `freecad-assembly` |
| `freecad_assembly_revolute_joint` | Crear articulación de rotación (1 GDL) alrededor de un eje común. | `freecad-assembly`, `freecad-robotic-joints` |
| `freecad_assembly_slider_joint` | Crear guía prismática de traslación (1 GDL) a lo largo de un eje. | `freecad-assembly`, `freecad-robotic-joints` |
| `freecad_assembly_cylindrical_joint` | Crear junta cilíndrica (2 GDL: rotación + traslación axial). | `freecad-assembly`, `freecad-robotic-joints` |
| `freecad_assembly_ball_joint` | Crear junta esférica/rotula (3 GDL rotacionales). | `freecad-assembly` |
| `freecad_assembly_distance_joint` | Restringir la distancia fija entre dos caras, aristas o vértices. | `freecad-assembly`, `freecad-tolerances` |
| `freecad_assembly_solve` | Ejecutar el motor de resolución cinemática y actualizar posiciones. | `freecad-assembly`, `freecad-robotic-joints` |

### 2.16 Módulo State (`state.ts` — 7 tools) — **CAPA TRANSVERSAL OBLIGATORIA**

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_begin_transaction` | Abrir bloque transaccional antes de modificar la geometría. | `freecad-core`, `freecad-modification`, todas las skills de dominio |
| `freecad_commit_transaction` | Confirmar y consolidar los cambios en el árbol de operaciones. | `freecad-core`, `freecad-modification`, todas las skills de dominio |
| `freecad_abort_transaction` | Abortar transacción y revertir al estado seguro ante fallos. | `freecad-core`, `freecad-modification`, todas las skills de dominio |
| `freecad_undo` | Deshacer la última operación registrada en el historial del documento. | `freecad-core`, `freecad-modification` |
| `freecad_redo` | Rehacer la operación deshecha anteriormente. | `freecad-core`, `freecad-modification` |
| `freecad_snapshot_document` | Capturar estado topológico completo, BoundBox y volumen en JSON. | `freecad-core`, `freecad-modification`, `freecad-parametric-part` |
| `freecad_diff_snapshot` | Comparar dos snapshots y calcular deltas topológicos para detectar regresiones. | `freecad-core`, `freecad-modification` |

### 2.17 Módulo View (`view.ts` — 2 tools)

| Tool MCP | Caso de Uso Principal | Skill Asignada |
|---|---|---|
| `freecad_take_screenshot` | Capturar render de pantalla de la vista 3D activa (GUI Mode). | `freecad-core`, `freecad-dfam`, `freecad-techdraw` |
| `freecad_capture_views` | Capturar mosaico de vistas ortogonales e isométrica para inspección visual. | `freecad-core`, `freecad-dfam`, `freecad-techdraw` |

---

## 3. Fuente 2: Matriz Top-Down (Ciclo de Vida Industrial)

Esta grilla cruza las **9 Etapas del Ciclo de Vida Industrial** con los **4 Tipos de Pieza** y las **5 Operaciones CAD**, asegurando que cada celda de la matriz tenga un flujo de trabajo formalmente asignado o una exclusión explícita justificada.

### 3.1 Estructura de la Grilla

- **9 Etapas**:
  1. Brief / Requerimientos
  2. Especificación Paramétrica (Spreadsheet)
  3. Creación de Pieza (Croquizado y Sólido)
  4. Ensamblado y Mecanismo
  5. Validación Estructural (FEM)
  6. DfAM y Tolerancias (Fabricación FDM)
  7. Documentación 2D (Planos TechDraw)
  8. Exportación y Entrega
  9. Modificación e Iteración
- **4 Tipos de Pieza**: Prismática, Rotacional, Chapa/Pared Fina, Mecanismo/Móvil.
- **5 Operaciones**: Crear, Modificar, Reparar, Validar, Documentar.

### 3.2 Grilla de Asignación Top-Down

| Etapa del Ciclo | Tipo de Pieza | Operación | Skill Asignada | Flujo de Trabajo / Protocolo |
|---|---|---|---|---|
| **1. Brief** | Todas | Crear / Validar | `freecad-core` | Definición de especificaciones, selección de unidades (mm) y setup de documento. |
| **2. Spec Paramétrica** | Prismática / Rotacional | Crear / Modificar | `freecad-parametric-part` | Hoja `Parametros`, alias `$W`, `$H`, `$D`, expresiones enlazadas. |
| **2. Spec Paramétrica** | Chapa / Pared Fina | Crear / Modificar | `freecad-dfam` | Hoja `Parametros`, alias `$t_pared` (múltiplo de nozzle 0.4mm). |
| **2. Spec Paramétrica** | Mecanismo | Crear / Modificar | `freecad-gears`, `freecad-tolerances` | Hoja `Parametros`, módulo `$m`, dientes `$z`, holgura de huelgo `$j`. |
| **3. Creación Sólido** | Prismática | Crear | `freecad-parametric-part` | Sketch XY fully constrained → Pad → Pocket/Hole → Fillet/Chamfer en Tip. |
| **3. Creación Sólido** | Rotacional | Crear | `freecad-parametric-part` | Sketch XZ fully constrained → Revolve alrededor del eje Z → Groove. |
| **3. Creación Sólido** | Chapa / Pared Fina | Crear | `freecad-dfam`, `freecad-parametric-part` | Sketch → Pad → `partdesign_thickness` / `draft_angle`. |
| **3. Creación Sólido** | Mecanismo | Crear | `freecad-gears`, `freecad-robotic-joints` | `additive_helix`, perfil evolvente FCGear, eslabones, alojamientos servo. |
| **3. Creación Sólido** | Todas | Reparar | `freecad-mesh-repair` | `mesh_repair`, `mesh_to_shape`, `refine_shape` de mallas no-manifold. |
| **4. Ensamble** | Prismática / Rotacional | Crear / Modificar | `freecad-assembly` | `assembly_create` → `insert_component` → `toggle_grounded` → `fixed_joint`. |
| **4. Ensamble** | Mecanismo | Crear / Modificar | `freecad-robotic-joints`, `freecad-assembly` | `revolute_joint`, `slider_joint`, `cylindrical_joint`, `assembly_solve`. |
| **5. Validación Estruct.**| Todas | Validar | `freecad-stress-analysis` | `fem_analysis` → material → empotramiento/fuerza → Gmsh → CalculiX → Von Mises. |
| **6. DfAM & Tolerancias**| Prismática / Rotacional | Validar / Modificar| `freecad-tolerances` | Ajuste ISO 286 (slip/press fit), holgura 0.2-0.3mm, alojamientos heat-set M3. |
| **6. DfAM & Tolerancias**| Chapa / Pared Fina | Validar / Modificar| `freecad-dfam` | Orientación de capas, voladizos <45°, teardrop holes horizontales, embossing. |
| **7. Doc. 2D** | Todas | Documentar | `freecad-techdraw` | `techdraw_create_page` → `add_projection_group` → `add_dimension` → SVG/DXF. |
| **8. Exportación** | Todas | Validar / Documentar| `freecad-parametric-part`, `freecad-dfam` | `export_stl` (impresión 3D), `export_step` (CAD neutro), BoundBox + volumen OK. |
| **9. Modificación** | Todas | Modificar (M1) | `freecad-modification`, `freecad-parametric-part` | Transacción → `spreadsheet_set` celda → `diff_snapshot` → commit. |
| **9. Modificación** | Todas | Modificar (M2/M3) | `freecad-modification` | Transacción → editar/agregar feature en Tip → `diff_snapshot` → commit. |
| **9. Modificación** | Todas | Modificar (M4/M5) | `freecad-modification` | Transacción → eliminar/recrear feature → verificación TNP → commit/abort. |

---

## 4. Fuente 3: Benchmark Externo y Gaps Detectados

El análisis comparativo frente a tutoriales canónicos de la **Wiki de FreeCAD** y repositorios destacados del ecosistema MCP (`blwfish/freecad-mcp`, `spkane/freecad-mcp`, `neka-nat/freecad-mcp`) permitió identificar brechas de diseño y solucionarlas en el plan:

### 4.1 Gaps Identificados y Solución Integrada

1. **Reparación de mallas e Ingeniería Inversa**:
   - *Práctica común externa*: Importación de archivos STL provistos por fabricantes para agregar soportes o realizar modificaciones.
   - *Gap previo local*: Falta de una skill orientada al flujo de mallas trianguladas no sanitizadas.
   - *Solución*: Creación de la skill **`freecad-mesh-repair`**, integrando el módulo `mesh.ts` (`mesh_repair`, `mesh_to_shape`, `decimate`, `refine_shape`).
2. **Importación y Procesamiento de Vectores 2D (DXF/SVG)**:
   - *Práctica común externa*: Importar logotipos, perfiles de corte láser o planos 2D para extruir o grabar.
   - *Gap previo local*: Los archivos vectoriales se trataban como casos aislados.
   - *Solución*: Asignación explícita de `import_dxf` e `import_svg` a **`freecad-techdraw`** (para planos) y a **`freecad-dfam`** (para grabado/embossing) y **`freecad-parametric-part`** (para extrusión).
3. **Ausencia de Control Transaccional en Servidores MCP Estándar**:
   - *Práctica común externa*: Ejecución de comandos directos sin capacidad de rollback; si un booleano falla, el modelo queda corrupto.
   - *Solución local superior*: Integración del módulo **`state.ts`** como requisito transaccional transversal obligatorio en todas las skills de dominio antes de aplicar cambios estructurales.
4. **Verificación Visual mediante Feedback Loop**:
   - *Práctica común externa*: Uso de capturas de pantalla de la ventana 3D para validar formas visuales.
   - *Solución local*: Integración del módulo **`view.ts`** (`freecad_take_screenshot`, `freecad_capture_views`) dentro del flujo de entrega de las skills `freecad-core`, `freecad-dfam` y `freecad-techdraw`.

---

## 5. Fuente 4: Evidencia Real de Uso e Historial de Sesiones

A partir del minado de la bitácora de desarrollo (`docs/UPDATE_SESION_2026-08-20.md`, `docs/MCP_EVIDENCIAS_Y_MEJORAS.md`, `docs/GUIA_BUENAS_PRACTICAS_CAD.md` y `docs/METODOLOGIA_CAD_FREECAD.md`), se establece la distribución de frecuencia real de casos de uso:

### 5.1 Ranking Empírico por Frecuencia de Uso

```
[1] Creación Paramétrica PartDesign (50%)   ████████████████████
[2] Modificación e Iteración M1-M3 (20%)   ████████
[3] DfAM y Tolerancias FDM/ISO286 (10%)    ████
[4] Ensambles y Mecanismos Móviles (10%)   ████
[5] Simulación FEM / Esfuerzos (5%)        ██
[6] Mallas STL, DXF 2D y TechDraw (5%)     ██
```

1. **Creación Paramétrica de Piezas PartDesign (~50% de las operaciones)**:
   - Flujo: Spreadsheet → Sketcher fully constrained → Pad → Pocket/Hole → Fillet/Chamfer en Tip → BoundingBox + Volumen.
2. **Modificación de Piezas Existentes y Refactorización (~20% de las operaciones)**:
   - Flujo: Transacción `begin` → `spreadsheet_set` / edición M2-M3 → `diff_snapshot` → `commit`/`abort`.
3. **Diseño para Impresión 3D y Tolerancias (DfAM + ISO 286) (~10% de las operaciones)**:
   - Flujo: Compensación de contracción (PLA/PETG/ABS), holgura slip/press fit, alojamientos heat-set M3-M6, orientación de capas.
4. **Ensambles Mecánicos y Mecanismos Robóticos (~10% de las operaciones)**:
   - Flujo: `assembly_create` → `insert_component` → `grounded` → `revolute`/`slider_joint` → `assembly_solve`.
5. **Simulación FEM y Análisis de Esfuerzos (~5% de las operaciones)**:
   - Flujo: `fem_analysis` → asignación de material FDM → restricciones → malla tetraédrica → CalculiX → factor de seguridad.
6. **Reparación de Mallas STL, Importación 2D DXF/SVG y Planos TechDraw (~5% de las operaciones)**:
   - Flujo: Conversión de mallas a BRep, proyecciones ortogonales TechDraw y exportación de láminas normalizadas.

---

## 6. Exclusiones Explícitas y Justificación Técnica

Para mantener la máxima eficiencia de tokens y precisión en las decisiones del agente, se establecen las siguientes reglas de exclusión:

1. **Exclusión Total del Módulo BIM (`bim.ts` — 9 tools)**:
   - *Justificación*: Las herramientas de muros, ventanas, techos y exportación IFC corresponden al dominio de la arquitectura y construcción civil. Su inclusión en skills mecánicas sobrecarga la ventana de contexto e induce al agente a elegir comandos inadecuados para piezas industriales.
2. **Exclusión del Flujo Primario del Módulo Surface (`surface.ts` — 5 tools)**:
   - *Justificación*: El modelado por parcheo de superficies no es paramétrico en términos de sólidos cerrados BRep para fabricación aditiva FDM. Se catalogan como herramientas de soporte avanzado secundario.
3. **Restricción de Seguridad sobre `freecad_execute_python`**:
   - *Justificación*: Permite código arbitrario. Queda estrictamente prohibido intercalar scripts Python con wrappers del MCP en la misma sesión (corrompe el árbol de operaciones duplicando objetos `Hole001`). Su uso se limita a workarounds aislados documentados en `freecad-core`.
4. **Manejo Adaptativo de Tools GUI-Only (`freecad_import_iges`, `freecad_take_screenshot`, `freecad_capture_views`)**:
   - *Justificación*: En modo headless (`freecadcmd`), estas tools retornan un error explícito de entorno. Las skills deben utilizar validación numérica (BoundBox + volumen) como fuente primaria de verdad en entornos sin interfaz gráfica.

---

## 7. Regla de Documento Vivo y Mantenimiento

Este documento es una **especificación viva**. Debe mantenerse sincronizado con el código fuente del servidor MCP siguiendo estas reglas obligatorias:

1. **Protocolo ante Nueva Tool MCP**:
   - Si se agrega una nueva herramienta en `src/tools/<modulo>.ts` y se registra en `src/index.ts`, es **obligatorio** agregar una entrada en la Sección 2 (Matriz Bottom-Up) de este documento, asignándola a una skill existente o nueva antes de dar por completado el commit.
2. **Protocolo ante Nueva Skill**:
   - Al crear una nueva skill en `.agents/skills/`, se deben actualizar el Resumen Ejecutivo (§1.2) y la Matriz Top-Down (§3.2) para reflejar los nuevos flujos gobernados.
3. **Verificación Automática**:
   - La suma total de tools en la Sección 2 debe ser siempre exactamente igual al total de tools exportadas por `ALL_TOOLS` en `src/index.ts` (verificable con `node -e "import('./dist/index.js')"`).

---

*Documento consolidado y verificado por Sisyphus. Entregable 1 completado.*
