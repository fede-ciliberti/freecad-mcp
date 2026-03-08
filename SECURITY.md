# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in freecad-mcp, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email: **sergiudanstan@gmail.com**

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgement**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix release**: Within 30 days for critical issues

### Process

1. Reporter submits vulnerability via email
2. Maintainer acknowledges receipt within 48 hours
3. Maintainer investigates and assesses severity
4. Fix is developed and tested
5. Security advisory is published with the fix
6. Reporter is credited (unless they prefer anonymity)

## Security Design Considerations

### Code Execution Model

This MCP server executes Python code inside FreeCAD (either via a GUI socket or a headless subprocess). By design, the `freecad_execute_python` tool allows arbitrary Python execution. This is intentional for CAD automation but requires that:

- The MCP client is trusted
- The server runs in a controlled environment
- File system access is limited to the FreeCAD user's permissions

### Input Validation

All tool inputs are validated at two levels:
1. **MCP SDK JSON Schema validation** - enforces types and required fields
2. **Runtime validation** - numeric range checks, string sanitization, and path traversal prevention

### Network Security

The FreeCAD GUI socket server listens only on `127.0.0.1:12345` (localhost). It is not exposed to external networks.

## Dependencies

We monitor dependencies for known vulnerabilities using `npm audit`. Run `npm audit` to check the current status of dependencies.
