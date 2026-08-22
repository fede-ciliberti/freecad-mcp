# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
