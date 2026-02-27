# Changelog

All notable changes to this project will be documented in this file.

## [3.2.1] - 2026-02-27

### Changed

- Updated README.md

## [3.2.0] - 2026-02-27

### Added

- `RECOMMENDED_LABEL_REGEX` is the same as `DEFAULT_LABEL_REGEX` but renamed for clarity
- `getSigilLabels` to get registered sigil labels

### Deprecated

- `DEFAULT_LABEL_REGEX` is deprecated and will be removed in v4, use `RECOMMENDED_LABEL_REGEX` instead

## [3.1.4] - 2026-02-26

### Changed

- Updated description in `package.json`

## [3.1.3] - 2026-02-26

### Changed

- Patched type tests where `sigil` should be imported as type only

## [3.1.2] - 2026-02-26

### Changed

- Patched README.md

### Added

- `GetPrototype<T>` helper to get type of class instance in `protected` or `private` classes

### Removed

- `isSigilified` method in `Sigil` class as it's redundant and separate check function is present

## [3.1.1] - 2026-02-25

### Changed

- Updated README.md

## [3.1.0] - 2026-02-25

### Added

- `isExactType` is added to check for exact instances (children are ingored as well)

### Removed

- `SigilOptions.skipLabelInheritanceCheck` is removed.
- `isOfTypeStrict` is removed.

## [3.0.0] - 2026-02-24

### Added

- `sigil` symbol used for type-only nominal branding of classes

### Changed

- `__SIGIL_BRAND__` is classes replaced with `sigil` symbol

### Removed

- `withSigilTyped` is removed as library moved into manual branding

### Breaking changes

- `withSigilTyped` is removed as library moved into manual branding
- `SigilBrandOf` is renamed to `SigilOf`
- `UpdateSigilBrand` is renamed to `ExtendSigil`

## [2.2.1] - 2026-02-23

### Added

- `SigilEffectiveLabel`/`getSigilEffectiveLabel()` which are last passed label for logging purposes.

### Changed

- Patched multiple bugs.
- Updated defualt options, now `SigilOptions.autofillLabels` is `true` by default.

## [2.1.0] - 2026-02-22

### Changed

- Changed name of `updateOptions` to be `updateSigilOptions`
- Updated JSDOCs of multiple APIs

## [2.0.3] - 2026-02-21

- Patched types

## [2.0.2] - 2026-02-21

### Changed

- Patched types

## [2.0.1] - 2026-02-21

### Removed

- `updateOptions.devMarker`

### Changed

- Now dev checks are internal only

## [2.0.0] - 2026-02-20

### Breaking changes

- All `SigilRegistry`options, methods and classes are removed

## [1.3.0] - 2026-02-18

### Added

- `isOfType()` & `isOfTypeStrict()` now can be called from instances

## [1.2.7] - 2026-02-13

### Added

- Support for `abstract` classes using `SigilifyAbstract` factory

## [1.2.6] - 2026-02-11

### Changed

- Fixed type bug in 'isOfType'

## [1.2.5] - 2026-02-10

### Changed

- Documentation updates (README)

## [1.2.4] - 2026-02-10

**Stable release**

### Changed

- Documentation updates (README)

## [1.2.3] - 2026-02-10

### Changed

- Documentation updates (README)

## [1.2.2] - 2026-02-10

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
