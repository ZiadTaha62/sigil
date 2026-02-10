# Changelog

All notable changes to this project will be documented in this file.

## [1.2.2] - 2026-02-11

### Changed

- Documentation updates (README and JSDOCs)

## [1.2.1] - 2026-02-10

### Added

- Re-introduced 'ISigilStatic' and 'ISigilIntance' types

## [1.2.0] - 2026-02-10

### Added

- Added new typing method (decorator with brand field update)
- Added type to exported base classes

### Changed

- Simplified types
- Fix type bug in `Sigilify`
- Updated `Sigilify` to return typed class directly
- Fix options propagation bug

### Deprecated

- `typed` higher order function as it has no use-case anymore
- `typed` will be removed in v2.0.0

## [1.1.1] - 2026-02-09

### Changed

- Improved package build outputs to make sure it support multiple JavaScript module systems (ESM and CommonJS).
- Updated build configuration to ensure correct usage in different runtimes and bundlers.

## [1.1.0] - 2026-02-08

### Added

- `SigilRegistry` class
- `getActiveRegistry()` helper
- Registry-related options in `updateOptions`

### Deprecated

- `REGISTRY` constant (use `SigilRegistry` instead)
- `REGISTRY` will be removed in v2.0.0.

## [1.0.1] - 2026-02-07

### Changed

- Documentation updates (README)

## [1.0.0] - 2026-02-07

### Added

- Initial release with core features
