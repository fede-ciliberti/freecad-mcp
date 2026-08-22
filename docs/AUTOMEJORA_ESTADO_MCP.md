# AUTOMEJORA_ESTADO_MCP — Estado vivo del MCP de FreeCAD

*Este archivo es el "libro de bitácora" de la automejora. Lo lee SIEMPRE el equipo de automejora al abrir un ciclo (ver skill `mcp-freecad-automejora`). Mantenerlo fresco: cada cambio del MCP que afecte a futuras mejoras se registra acá.*

*Última actualización: 2026-08-21*

---

## 1. Estado actual del MCP

- **Versión**: 1.0.0 (package.json). Target FreeCAD 1.1.3+ (mínimo 1.0).
- **Tools**: ~169 en 15 módulos.
- **Compatibilidad validada**: 99.4% (168/169 tests PASS) frente a FreeCAD 1.1.3 headless + modo GUI socket.
- **Único FAIL estructural**: `freecad_import_iges` (requiere módulo GUI `ImportGui`, limitación de entorno).

## 2. Historial de cambios relevantes para automejora

> Formato: fecha | módulo/tool | cambio | impacto para futuras mejoras.

- 2026-08-21 | operations/part-design | `freecad_fillet` + `freecad_partdesign_fillet` fixeados (ya no producen Compound/NULL; generan Solid válido que soporta boolean cut). | Fillets ahora encadenables con `boolean_cut` sin `execute_python`.
- 2026-08-20 | bridge | Serialización `Quantity`→`.Value` corregida en modo socket. | Validar que tools que devuelven cantidades funcionen en ambos modos.
- 2026-08-20 | assembly | Joints → `App::FeaturePython` + `JointObject.Joint` para 1.1.3. | Verificar patrón al tocar módulo assembly.
- 2026-08-20 | fem/bim | `fem_mesh` + `export_ifc` adaptados a 1.1.3. | —
- 2026-08-20 | docs | `METODOLOGIA_CAD_FREECAD.md` consolidado como doc maestro. | Toda arquitectura/flujo avanzado se rige por él.

## 3. Gaps y plan de mejora vigente

> Detalle completo en `docs/MCP_EVIDENCIAS_Y_MEJORAS.md`.

1. **Datum Planes**: tool para planos tangentes/arbitrarios en un Body (anidar sketches en superficies curvas).
2. **Adjuntamiento de sketches**: `create_sketch` con `faceName` opcional.
3. **Roscas robustas**: dirección/eje personalizados en `hole`/`subtractive_helix` (no solo Z).
4. **Validación de sweeps**: control de normalidad en trayectorias helicoidales.

## 4. Cambios pendientes de reflejar (automejora de la automejora)

- [ ] Nada pendiente por el momento.
