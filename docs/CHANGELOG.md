# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-08-24

### Added
- Rediseño y expansión del ecosistema de skills y documentación:
  - 3 nuevas skills integradas: `freecad-modification` (escala M1 a M5 y transacciones), `freecad-techdraw` (planos 2D y exportacion DXF/SVG), y `freecad-mesh-repair` (reparacion de mallas STL y mesh-to-shape).
  - Anatomía canónica estandarizada para todas las skills (frontmatter, diagramas Mermaid, decisiones SI/ENTONCES, quality gates y tabla de fallos).
  - Matriz de cobertura universal (`docs/COBERTURA_SKILLS.md`) mapeando el 100% de las 174 tools del MCP.

## [1.1.0] - 2026-08-23

### Added
- 9 new tools across 2 new modules (174 tools total across 17 modules):
  - `state` module (7 tools): transactional state management (`freecad_begin_transaction`, `freecad_commit_transaction`, `freecad_abort_transaction`, `freecad_undo`, `freecad_redo`, `freecad_diff_snapshot`, `freecad_snapshot_document`).
  - `view` module (2 tools): visual capture and inspection (`freecad_take_screenshot`, `freecad_capture_views` — GUI-only).
- Methodological updates: 5-layer assisted creation pipeline and M1-M5 modification flow with differential snapshots and rollback support.

## [1.0.1] - 2026-08-21

### Fixed
- `operations` (`freecad_fillet`): Fixed invalid shape/Compound issue when applying fillets in Part workbench. Replaced `Part::Fillet` with a clean `Part::Feature` utilizing OpenCASCADE BRep `makeFillet` and `Solids[0]` extraction. Resulting geometry is a valid `Solid` supporting subsequent boolean cuts (`freecad_boolean_cut`).
- `part-design` (`freecad_partdesign_fillet`): Fixed `Missing container body` and NULL shape errors by ensuring container `PartDesign::Body` linkage, registering fillet object in body group, validating positive radius input, and verifying non-null shape result.

## [1.0.0] - 2026-03-08

### Added
- Initial open-source release
- 165 FreeCAD tools across 15 modules: document, primitives, operations, sketcher, part-design, import-export, draft, mesh, techdraw, advanced-operations, spreadsheet, BIM, FEM, surface, assembly
- Dual-mode FreeCAD bridge: GUI socket mode and headless subprocess mode
- Auto-detection of FreeCAD GUI availability
- Input validation module with numeric range checks, string sanitization, and path traversal prevention
- SECURITY.md with vulnerability disclosure policy
- CONTRIBUTING.md with development guidelines

### Security
- Added runtime input validation for all tool parameters
- Fixed string escaping to include newline characters
- Added file path traversal prevention for import/export operations
- Added security warning to `freecad_execute_python` tool description
