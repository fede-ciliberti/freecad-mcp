# Referencia Técnica: Ajustes ISO 286 Adaptados a FDM e Insertos Heat-Set

Esta referencia detalla los valores empíricos para tolerancias, contracción de materiales y alojamientos de insertos roscados en impresión 3D FDM.

---

## 1. Tabla de Ajustes ISO 286 Adaptados a FDM

La fabricación aditiva FDM introduce desviaciones térmicas y geométricas debido al ancho de línea y al flujo del plástico. Las tolerancias de mecanizado CNC no sirven directamente. Los rangos probados son:

| Tipo de Ajuste | Holgura / Interferencia (Δd) | Aplicación Mecánica Típica | Comportamiento Impreso |
|----------------|-------------------------------|---------------------------|------------------------|
| **Slip Fit (Holgura Suave)** | `0.3mm` a `0.5mm` | Ejes rotatorios libres, bisagras, pasadores deslizantes | Evita atascamientos por expansión térmica de capas |
| **Transición (Ajuste Manual)** | `0.1mm` a `0.2mm` | Tapas encastrables, conectores modulares, piezas desmontables | Fricción leve que permite encastre manual sin herramientas |
| **Press Fit (Interferencia Fija)** | `0.05mm` a `0.1mm` | Rodamientos 608, imanes de neodimio, pines estructurales | Requiere leve presión o mazo de goma para fijación permanente |

---

## 2. Compensación de Contracción (Shrinkage por Material)

Cada polímero termoplástico sufre contracción volumétrica al enfriarse desde la temperatura de extrusión hasta el ambiente:

- **PLA**: Contracción muy baja (~0.2%). Factor de escala estándar `1.002` o compensación directa en cotas críticas.
- **PETG**: Contracción moderada (~0.2% a 0.4%). Excelente estabilidad dimensional para componentes técnicos y mecánicos.
- **ABS**: Contracción alta (~0.5% a 0.8%). Exige recinto cerrado (enclosure) y sobredimensionar perfiles de acople en un 0.5% mínimo.
- **Nylon**: Contracción muy alta y alta absorción de humedad (~1.0% a 1.5%). Requiere secado previo del filamento y holguras ensanchadas en 1%.

---

## 3. Diseño de Alojamientos para Insertos Heat-Set (M3 a M6)

Roscar directamente sobre capas FDM produce uniones débiles que fallan por cizalladura. Los insertos roscados de bronce instalados por calor con soldador son el estándar industrial para uniones desmontables robustas.

### Fórmula General del Diámetro de Taladro:
`D_taladro = D_nominal - 0.8mm`

- **M3**: Diámetro de taladro hembra = `Ø2.2mm` (Longitud estándar de inserto: `3.0mm` a `5.0mm`)
- **M4**: Diámetro de taladro hembra = `Ø3.2mm` (Longitud estándar de inserto: `4.0mm` a `6.0mm`)
- **M5**: Diámetro de taladro hembra = `Ø4.2mm` (Longitud estándar de inserto: `5.0mm` a `9.0mm`)
- **M6**: Diámetro de taladro hembra = `Ø5.2mm` (Longitud estándar de inserto: `5.8mm` a `9.5mm`)

### Reglas de Geometría para el Alojamiento:
1. **Profundidad de cavidad**: Debe ser `1.0mm` mayor que la longitud nominal del inserto para acumular el plástico desplazado por el calor sin rebosar hacia la rosca.
2. **Paredes circulares**: El espesor de la pared plástica circundante al inserto debe ser de al menos `2.0mm` para soportar la presión de expansión durante la inserción en caliente.
