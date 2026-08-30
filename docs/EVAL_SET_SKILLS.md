# Eval Set de Golden Tasks EVAL_SET_SKILLS.md

**Versión:** 1.0, **Fecha:** 24 agosto 2026  
**Proyecto:** freecad-mcp, **Target:** FreeCAD 1.1.3+ (mínimo 1.0)  
**Autor:** Fede & Sisyphus, **Estado:** Entregable oficial del plan de rediseño

---

## 1. Introducción y Propósito

Este documento define el conjunto de evaluación de referencia o eval set de golden tasks para el servidor MCP de FreeCAD. Su propósito central es servir como banco de pruebas y regresión para validar el comportamiento de los agentes al invocar las skills del ecosistema ante modificaciones del código base, incorporación de nuevas herramientas o cambios en los flujos de modelado.

Cada tarea representa un caso de uso real de ingeniería, redactado exactamente como un prompt que un usuario enviaría en una sesión de desarrollo. Las tareas están alineadas con la matriz de cobertura de `docs/COBERTURA_SKILLS.md` y ponderadas según la frecuencia de uso observada en entornos de producción.

---

## 2. Distribución y Ponderación por Frecuencia de Uso

El eval set contiene 25 tareas canónicas distribuidas de manera proporcional a la evidencia empírica de uso de las herramientas CAD:

- **PartDesign Canónico y Primitivas (~50%, 12 tareas):** Creación de piezas base, croquis restringidos, extrusiones, vaciados y operaciones volumétricas.
- **Modificación y Mantenimiento de Piezas (~20%, 5 tareas):** Refactorización paramétrica, control de deuda topológica y migración de escalas M1 a M3.
- **Tolerancias y DfAM (~10%, 2 tareas):** Ajustes mecánicos ISO 286, compensación de retracción y alojamientos para insertos termofijados.
- **Ensambles y Cinemática (~10%, 2 tareas):** Relaciones de restricción y movimiento con el solver de Assembly.
- **Análisis Estructural FEM (~5%, 2 tareas):** Simulación de esfuerzos, cargas mecánicas y verificación de Von Mises.
- **Mallas y TechDraw (~5%, 2 tareas):** Reparación de mallas STL y generación de vistas ortogonales 2D.

---

## 3. Matriz de Golden Tasks (Prompt a Criterio de Aceptación)

| ID | Prompt de Usuario Real | Skill(s) Esperada(s) | Gates de Validación Esperados | Criterio de Aceptación |
|---|---|---|---|---|
| T01 | "crear pieza paramétrica base para un soporte rectangular de 100x50x20 mm" | `freecad-parametric-part` | Hoja Parametros, Sketch fully constrained, BoundBox exacto | El BoundBox coincide exactamente con las cotas nominales y el croquis tiene 0 grados de libertad. |
| T02 | "agregar un agujero pasante M5 centrado en la base del soporte" | `freecad-parametric-part`, `freecad-tolerances` | Pocket o Hole sobre cara plana, diámetro nominal correcto | El diámetro del agujero incluye la holgura adecuada para tornillo M5 sin interferencia en simulación. |
| T03 | "redondear las aristas exteriores del soporte con radio de 3 mm" | `freecad-parametric-part` | Fillet aplicado al Tip final de la feature tree | Las aristas seleccionadas muestran el radio especificado sin corromper las caras adyacentes. |
| T04 | "hacer un vaciado interior en la pieza dejando paredes de 2.5 mm de espesor" | `freecad-dfam`, `freecad-parametric-part` | PartDesign Thickness sobre cara inferior abierta | El espesor de pared es uniforme en toda la pieza y pasa la validación geométrica de sólidos. |
| T05 | "generar un patrón lineal de 4 agujeros M4 espaciados cada 20 mm" | `freecad-parametric-part`, `freecad-tolerances` | LinearPattern referenciado a dirección del Sketch | Las instancias se generan de forma paramétrica vinculadas a la hoja de parámetros. |
| T06 | "diseñar una polea dentada GT2 de 20 dientes" | `freecad-gears`, `freecad-parametric-part` | FCGear involute profile, PolarPattern, ajuste de módulo | El perfil de dientes respeta el paso GT2 y el volumen teórico coincide con el cálculo analítico. |
| T07 | "crear un engranaje recto Z=30 de módulo 2 con backlash para FDM de 0.15 mm" | `freecad-gears`, `freecad-tolerances` | FCGear parameterization, compensación de espesor de diente | El espesor de diente reducido permite un engrane libre sin atascos en piezas impresas en PLA. |
| T08 | "modelar un eje con ajuste deslizante slip fit H7/g6 de diámetro 10 mm" | `freecad-parametric-part`, `freecad-tolerances` | Tolerancias ISO 286 aplicadas sobre cilindro base | El diámetro nominal refleja la tolerancia positiva requerida para el montaje manual suave. |
| T09 | "crear un alojamiento hexagonal para tuerca M3 con tolerancia de ajuste press fit" | `freecad-parametric-part`, `freecad-tolerances` | Pocket poligonal con escala de expansión térmica del material | La tuerca entra a presión firme sin holgura transversal excesiva. |
| T10 | "preparar el modelo para impresión 3D FDM agregando refuerzos en los voladizos" | `freecad-dfam` | Draft angle superior a 45 grados en voladizos críticos | La geometría no requiere soportes complejos y cumple las reglas de fabricación aditiva. |
| T11 | "ajustar el espesor de pared principal de la pieza de 2 a 3.5 mm modificando la hoja Parametros" | `freecad-modification`, `freecad-parametric-part` | Modificación M1 paramétrica pura en Spreadsheet | El re-cálculo del documento finaliza con éxito sin errores topológicos ni caras huérfanas. |
| T12 | "reparar un error de nombres topológicos caídos tras cambiar la profundidad del pad principal" | `freecad-modification` | Mapeo transaccional M2, snapshot y rollback si falla | Se restablece el vínculo del Sketch sin requerir reconstrucción manual del árbol. |
| T13 | "reestructurar una pieza híbrida separando cuerpos superpuestos en un único Body canónico" | `freecad-modification` | Transición M3, consolidación de operaciones booleanas | La pieza queda contenida en un único Body con historial limpio y trazable. |
| T14 | "migrar un diseño heredado sin croquis paramétricos a una estructura basada en Feature Tree" | `freecad-modification` | Reconstrucción M4, creación de croquis de referencia sobre geometría importada | El modelo recupera parametricidad completa sobre las cotas principales. |
| T15 | "eliminar features redundantes y aristas fantasma dejadas por operaciones de corte obsoletas" | `freecad-modification` | Limpieza M5, ShapeRefine y eliminación de dependencias muertas | El árbol de diseño queda libre de nodos inactivos y el archivo reduce su tamaño. |
| T16 | "ensamblar la tapa superior con la base utilizando restricciones fijas y de revolución" | `freecad-assembly` | Assembly con Ondsel solver, Grounded en base, Revolute en eje | Las piezas se ubican en la posición correcta y el grado de libertad rotacional es libre y válido. |
| T17 | "crear un mecanismo de biela manivela con articulaciones deslizantes y rotacionales" | `freecad-assembly`, `freecad-robotic-joints` | Joints de tipo Slider y Revolute vinculados en ensamble | El mecanismo simula su rango de movimiento sin colisiones cinemáticas bloqueantes. |
| T18 | "diseñar un soporte para servo motor SG90 con orejas de fijación y tornillos M2" | `freecad-robotic-joints`, `freecad-tolerances` | Alojamientos paramétricos para cuerpo de servo y tornillos | Las dimensiones coinciden con las especificaciones físicas del servo estándar SG90. |
| T19 | "modelar un eslabón de brazo robótico con nervios de refuerzo estructural" | `freecad-robotic-joints`, `freecad-parametric-part` | Pad, Pocket de aligeramiento y nervios de unión | La relación resistencia a peso está optimizada para cargas estáticas moderadas. |
| T20 | "simular un análisis de elementos finitos FEM sobre el soporte aplicando una carga vertical de 200N" | `freecad-stress-analysis` | FEM material PLA, FixedConstraint en base, ForceConstraint aplicada | El solver calcula tensiones de Von Mises y el factor de seguridad supera el límite seguro de 2.0. |
| T21 | "realizar un análisis de tensión térmica y deformación estática en una pieza de PETG" | `freecad-stress-analysis` | Propiedades mecánicas de PETG configuradas en módulo FEM | Los resultados muestran la deflección máxima bajo carga distribuida dentro de la tolerancia aceptable. |
| T22 | "reparar una malla STL importada con agujeros abiertos y normales invertidas" | `freecad-mesh-repair` | Mesh repair fill holes, recalculate normals, mesh to shape | La malla queda completamente cerrada y manifold, lista para conversión a sólido BRep. |
| T23 | "convertir una malla STL de alta densidad a un sólido BRep simplificado" | `freecad-mesh-repair`, `freecad-parametric-part` | Decimate mesh, mesh to shape, refine shape | El sólido resultante conserva la forma general con un conteo reducido de caras analíticas. |
| T24 | "generar un plano técnico 2D en TechDraw con vistas ortogonales frontal, superior y lateral" | `freecad-techdraw` | TechDraw page template, projection group, dimensioning | El plano contiene las vistas principales acotadas correctamente sin superposiciones. |
| T25 | "exportar el plano técnico a formato DXF para corte por láser y la pieza en STEP" | `freecad-techdraw`, `freecad-parametric-part` | Export DXF y export STEP desde el documento activo | Los archivos generados se abren sin errores en software CAD externo y visor CAD industrial. |

---

## 4. Descripción Detallada de Flujos y Criterios de Éxito

### 4.1 Bloque PartDesign y Primitivas (T01 - T06)
- **Objetivo:** Validar que el agente invoque las herramientas de creación en el orden correcto, partiendo de una hoja de parámetros en Spreadsheet, construyendo croquis totalmente restringidos (0 grados de libertad), aplicando operaciones de extrusión o vaciado sobre el objeto activo, y cerrando con redondeos en el Tip.
- **Validación numérica:** Verificación obligatoria mediante `freecad_get_bounding_box` y `freecad_get_volume`. El margen de tolerancia aceptado respecto al valor analítico teórico es inferior al 0.5%.

### 4.2 Bloque Modificación y Refactorización (T11 - T15)
- **Objetivo:** Comprobar la resiliencia del modelo ante cambios dimensionales y estructurales según la escala de modificación M1 a M5.
- **Validación numérica:** Uso del módulo de transacciones (`freecad_snapshot`, `freecad_diff_snapshot`) para garantizar que cualquier cambio paramétrico mantenga la integridad topológica y permita hacer un rollback limpio ante fallos de nombre topológico (TNP).

### 4.3 Bloque DfAM, Tolerancias y Ajustes (T07 - T10)
- **Objetivo:** Asegurar que las piezas impresas en 3D encajen correctamente considerando la contracción del material FDM y las tablas de ajuste ISO 286.
- **Validación numérica:** Comprobación de que los agujeros para insertos térmicos tengan el diámetro de pre-agujero correcto (ej. 4.2 mm para M3) y que los perfiles tengan ángulos de salida adecuados.

### 4.4 Bloque Ensambles y Cinemática (T16 - T19)
- **Objetivo:** Validar la creación correcta de restricciones mecánicas utilizando el solver de ensambles de FreeCAD.
- **Validación numérica:** Comprobación de que los grados de libertad de los componentes móviles queden reducidos exclusivamente a los permitidos por las articulaciones (revolución, deslizamiento).

### 4.5 Bloque Simulación FEM y Análisis (T20 - T21)
- **Objetivo:** Confirmar la correcta asignación de propiedades de materiales polímeros (PLA, PETG, ABS) y la aplicación de restricciones de contorno y fuerzas.
- **Validación numérica:** El valor máximo de tensión de Von Mises obtenido por el solver debe encontrarse por debajo del límite elástico del material considerado, dividido por el factor de seguridad deseado.

### 4.6 Bloque Mallas y Planos TechDraw (T22 - T25)
- **Objetivo:** Garantizar la interoperabilidad con formatos de malla y la documentación técnica de fabricación.
- **Validación numérica:** Las mallas reparadas deben reportar 0 bordes abiertos y orientaciones de caras consistentes; los planos 2D deben incluir todas las cotas críticas de fabricación.

---

## 5. Nota de Ejecución y Regresión

Este eval set se ejecuta de forma automatizada o semi-automatizada utilizando la infraestructura de pruebas del ecosistema y los comandos de validación del skill `skill-creator`. 

Cada vez que se modifiquen las definiciones de las skills, se agreguen nuevas herramientas al servidor MCP o se refactoricen los módulos core, este conjunto de 25 tareas debe ser recorrido para verificar que los agentes mantienen la adherencia a los flujos deterministas definidos en la documentación maestra.

---

## 6. Nota de Cobertura Viva

Si durante la ejecución de una tarea del eval set el agente se encuentra con un escenario no contemplado en los flujos estándar y se ve obligado a improvisar o utilizar workarounds no documentados, se debe proceder de inmediato de la siguiente manera:

1. Registrar la situación en `docs/MCP_EVIDENCIAS_Y_MEJORAS.md` detallando la limitación observada.
2. Clasificar el caso como "brecha de cobertura" o "deficiencia de herramienta".
3. Utilizar dicho registro como insumo directo para la próxima iteración de mejora continua del servidor MCP y sus skills asociadas.
