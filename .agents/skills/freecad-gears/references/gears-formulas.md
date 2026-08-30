# Referencia Técnica: Fórmulas de Engranajes y Tolerancias FDM

Este documento detalla las fórmulas analíticas, relaciones geométricas y tablas de compensación de backlash (juego lateral) para la fabricación aditiva (FDM) de engranajes paramétricos en FreeCAD.

---

## 1. Fórmulas Geométricas y Cinemáticas

Las siguientes ecuaciones rigen el diseño de engranajes cilíndricos de dientes rectos y helicoidales. Se emplea notación plana Unicode estricta.

- **Módulo y Diámetro Primitivo**:
  - Módulo: `m = d / z`
  - Diámetro primitivo: `d = m · z`
  - Dónde: `m` es el módulo en milímetros, `d` es el diámetro primitivo, y `z` es el número de dientes.

- **Altura del Diente y Diámetro Exterior (Cabeza)**:
  - Addendum (saliente): `hₐ = 1.0 · m`
  - Dedendum (fondo): `h_f = 1.25 · m`
  - Altura total del diente: `h = hₐ + h_f = 2.25 · m`
  - Diámetro exterior (cabeza): `dₐ = m · (z + 2)`
  - Diámetro de raíz (fondo): `d_f = m · (z - 2.5)`

- **Distancia entre Centros**:
  - Para un par acoplado de engranajes (piñón 1 y rueda 2):
  - `a = (d₁ + d₂) / 2 = m · (z₁ + z₂) / 2`

- **Relación de Contacto**:
  - Garantiza continuidad en la transmisión de potencia:
  - `ε > 1.2` (mínimo exigido para funcionamiento suave).

---

## 2. Compensación de Backlash (Juego Lateral) para Impresión 3D FDM

Los polímeros extruidos por FDM presentan expansión térmica, acumulación de material en esquinas y contracción al enfriarse (shrinkage). Un engranaje impreso sin backlash se bloqueará mecánicamente.

- **Fórmula de Cálculo del Backlash (`j`)**:
  - `j ≈ 0.1 + 0.05 · m` (en milímetros).

### Tabla de Backlash y Tolerancias por Material (Boquilla de 0.4 mm)

| Material | Factor de Shrinkage | Backlash Recomendado (`j`) | Holgura de Eje (Slip Fit) |
|---|---|---|---|
| **PLA** | 0.2% | `0.10 + 0.05 · m` mm | `+0.30` mm |
| **PETG** | 0.3% | `0.15 + 0.05 · m` mm | `+0.35` mm |
| **ABS** | 0.5% - 0.8% | `0.20 + 0.08 · m` mm | `+0.40` mm |
| **Nylon** | 1.0% - 1.5% | `0.25 + 0.10 · m` mm | `+0.45` mm |

---

## 3. Criterios de Resistencia y Límites FDM

- **Número Mínimo de Dientes**:
  - `z ≥ 12` para prevenir socavadura geométrica (undercut) en el flanco del diente al generar la evolvente.
- **Módulo Mínimo**:
  - `m ≥ 1.0` (módulos menores superan la resolución de boquillas estándar de 0.4 mm, destruyendo la forma del perfil).
- **Orientación de Impresión**:
  - Disponer siempre el engranaje acostado en el plano XY (impresión plana por capas) para que el esfuerzo principal actúe en el plano de las fibras del filamento y no por cizalladura intercapa en el eje Z.
