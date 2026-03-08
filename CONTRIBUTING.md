# Contributing to freecad-mcp

Thank you for your interest in contributing to freecad-mcp!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/freecad-mcp.git`
3. Install dependencies: `npm install`
4. Build: `npm run build`

## Prerequisites

- Node.js >= 18
- FreeCAD installed (tested with FreeCAD 0.21+)
- TypeScript knowledge

## Development Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes in `src/`
3. Build and test: `npm run build`
4. Commit with clear messages
5. Push and open a Pull Request

## Code Style

- TypeScript strict mode
- Use `JSON.stringify()` for string parameters passed to Python (prevents injection)
- Use `validateNumber()` / `validateString()` from `src/validation.ts` for runtime input validation
- All numeric inputs must have range checks
- All file paths must be validated against path traversal

## Adding New Tools

1. Create or edit a tool file in `src/tools/`
2. Define the tool schema with `inputSchema`
3. Add the handler in the switch statement
4. Register the tool in `src/index.ts`
5. Add input validation for all parameters

## Security

- Never use string interpolation for user-provided strings in Python code. Use `JSON.stringify()`.
- All file path inputs must go through `validateFilePath()`.
- See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Pull Request Checklist

- [ ] Code builds without errors (`npm run build`)
- [ ] Input validation added for new parameters
- [ ] No hardcoded paths or credentials
- [ ] Tool description is clear and accurate

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
