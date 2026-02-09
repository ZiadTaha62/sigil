# Changelog

All notable changes to this project will be documented in this file.

## v1.1.1 2026-02-09

### Changed

- Improved package build outputs to make sure it support multiple JavaScript module systems (ESM and CommonJS).
- Updated build configuration to ensure correct usage in different runtimes and bundlers.

## v1.1.0 2026-02-08

### Added

- `SigilRegistry` class
- `getActiveRegistry()` helper
- Registry-related options in `updateOptions`

### Deprecated

- `REGISTRY` constant (use `SigilRegistry` instead)
- `REGISTRY` will be removed in v2.0.0.

### Breaking Changes

- None

## v1.0.1 2026-02-07

### Changed

- Documentation updates (README)

## v1.0.0 2026-02-07

### Added

- Initial release with core features
