# Changelog

All notable changes to Screen Assistant are documented here. The project follows [Semantic Versioning](https://semver.org/) once tagged releases begin.

## Unreleased

### Added

- Automatic analysis after shortcut and toolbar captures
- Previous-question reuse for recapture workflows
- Automatic clipboard delivery with visible success and failure states
- Flow tests for consent, deduplication, repeated questions, and clipboard behavior
- GitHub Actions CI, Dependabot, and a classic-background-bundle regression check
- Architecture, contribution, security, support, and community documentation

### Changed

- Codex answers now appear in a light-gray bubble at the lower-right of the sidebar
- Repository default branch renamed to `main`

### Fixed

- Prevent production background bundles from containing unsupported ES-module syntax
- Make installed-host smoke checks fail when the native host returns an error
