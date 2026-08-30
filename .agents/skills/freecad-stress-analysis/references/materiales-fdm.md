# Referencia de Materiales FDM para Análisis de Esfuerzos

Este documento detalla las propiedades mecánicas nominales para filamentos termoplásticos impresos por FDM con cien por ciento de relleno sólido, destinadas a la validación analítica y simulación FEM preliminar.

## Tabla de Propiedades Mecánicas (100% Infill)

| Material | Resistencia a Tracción (σ_t) | Módulo de Elasticidad (E) | Densidad (ρ) | Aplicación Recomendada y Comportamiento |
| :--- | :--- | :--- | :--- | :--- |
| **PLA** | 50 a 60 MPa | 3.5 GPa | 1.24 g/cm³ | Prototipos visuales, piezas generales de baja exigencia térmica y alta rigidez inicial. |
| **PETG** | 45 a 50 MPa | 2.1 GPa | 1.27 g/cm³ | Soportes mecánicos, resistencia al impacto, excelente tenacidad en interiores. |
| **ABS** | 30 a 40 MPa | 2.0 GPa | 1.04 g/cm³ | Encastres flexibles, piezas sujetas a post-procesado químico con acetona. |
| **Nylon** | 55 a 75 MPa | 1.2 a 1.8 GPa | 1.14 g/cm³ | Engranajes de alta fricción, bisagras vivas y componentes expuestos a desgaste constante. |

## Consideraciones de Anisotropía FDM

La adhesión entre capas sucesivas en la dirección del eje Z reduce la resistencia a tracción y cizalladura entre un cuarenta y un setenta por ciento en comparación con el plano XY. Los cálculos analíticos y las condiciones de contorno FEM deben incorporar este factor reductor cuando las cargas operativas actúen fuera del plano de laminación.
