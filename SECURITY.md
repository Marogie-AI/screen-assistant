# Security Policy

## Supported versions

Screen Assistant is in early access. Security fixes are applied to the latest commit on the default branch; older commits and local modifications are not supported.

## Reporting a vulnerability

Do not open a public issue for suspected vulnerabilities. Use GitHub's private vulnerability reporting for this repository when available. Otherwise, contact a Marogie-AI organization maintainer privately and include:

- The affected component and version or commit
- Reproduction steps using non-sensitive test data
- The expected and observed security behavior
- Potential impact
- Any suggested mitigation

Do not include real credentials, private screenshots, authentication tokens, or third-party personal data. Maintainers will acknowledge a complete report, investigate it, and coordinate disclosure after a fix is available.

## Security-sensitive areas

Changes involving these areas require particular care and targeted tests:

- Firefox permissions and capture behavior
- Native Messaging framing and schema validation
- Temporary-file lifecycle and permissions
- Codex process arguments, environment, and sandbox flags
- Clipboard handling and stored browser data
- Prompt construction around untrusted page content
