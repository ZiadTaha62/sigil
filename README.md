# Sigil

[![npm version](https://img.shields.io/npm/v/@vicin/sigil.svg)](https://www.npmjs.com/package/@vicin/sigil) [![npm downloads](https://img.shields.io/npm/dm/@vicin/sigil.svg)](https://www.npmjs.com/package/@vicin/sigil) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue) [![Build](https://github.com/ZiadTaha62/sigil/actions/workflows/ci.yml/badge.svg)](https://github.com/ZiadTaha62/sigil/actions/workflows/ci.yml)

> - 🎉 v2.0.0 is out! Happy coding! 😄💻
> - 📄 **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

`Sigil` is a lightweight TypeScript library for creating nominal identity classes with compile-time branding and reliable runtime type checks. It organizes class identities across your codebase and gives you the power of **nominal typing** and **safe cross-bundle class checks** where each class constructor is stored under a unique label.

> **Key ideas:**
>
> - **Nominal Typing at Compile Time:** Distinguishes structurally similar types (e.g., UserId vs. PostId).
> - **Reliable Runtime Checks:** Uses symbols instead of instanceof for cross-bundle reliability.
> - **Inheritance Awareness:** Tracks lineages for subtype/supertype checks.

## Important Notes Before Using

- **Explicit class identity:** `Sigil` uses passed class label to identify classes, which means that dev is responsible for uniqueness of classes by passing unique labels.
- **Performance:** Minimal overhead, but `.isOfType()` is slightly slower than native `instanceof`. Avoid in ultra-hot paths.
- **Private Constructors:** HOF pattern allows extending private constructors in types (TypeScript limitation).
- **Simple instanceof Fix:** If you just need runtime checks without extras, see the [minimal mode](#minimal-mode).

## Why Registry is dropped

Although registry added label checks and central class management but it also introduced complexity, especially when mutiple packages tried to use it simultaneously, So in v2 we decided to omit it entirely and minimize API surface.

---

## Table of contents

- [Quick start](#quick-start)
  - [Install](#install)
  - [Basic usage](#basic-usage)
  - [Decorator pattern](#decorator-pattern)
  - [HOF pattern](#hof-higher-order-function-pattern)
  - [Minimal “first-run” example](#minimal-first-run-example)
  - [Migration](#migration)
- [Limitations & guarantees](#limitations--guarantees)
  - [What Sigil guarantees](#what-sigil-guarantees)
  - [What Sigil does not guarantee](#what-sigil-does-not-guarantee)
- [Core concepts](#core-concepts)
  - [Terminology](#terminology)
  - [Purpose and Origins](#purpose-and-origins)
  - [Implementation Mechanics](#implementation-mechanics)
- [Nominal typing patterns](#nominal-typing-patterns)
  - [HOF pattern](#1-hof-pattern-_classclass)
  - [Decorator pattern](#2-decorator-pattern)
- [API reference](#api-reference)
- [Options & configuration](#options--configuration)
- [Minimal mode](#minimal-mode)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Phantom](#phantom)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Quick start

### Install

```bash
npm install @vicin/sigil
# or
yarn add @vicin/sigil
# or
pnpm add @vicin/sigil
```

Requires TypeScript 5.0+ for decorators; HOFs work on older versions. Node.js 18+ recommended.

### Basic usage

#### Opt into `Sigil`

Use the `Sigil` base class or the `Sigilify` mixin to opt a class into the Sigil runtime contract.

```ts
import { Sigil, Sigilify } from '@vicin/sigil';

// Using the pre-sigilified base class:
class User extends Sigil {}

// Or use Sigilify when you want an ad-hoc class:
const MyClass = Sigilify(class {}, '@myorg/mypkg.MyClass');
```

If your class is marked with `abstract`:

```ts
import { Sigil, SigilifyAbstract } from '@vicin/sigil';

// Using the pre-sigilified base class:
abstract class User extends Sigil {}

// Or use Sigilify when you want an ad-hoc class:
const MyClass = SigilifyAbstract(abstract class {}, '@myorg/mypkg.MyClass');
```

This adds runtime metadata to the constructor and allows you to use runtime helpers, see [API reference](#api-reference).

#### Extend `Sigil` classes

After opting into the `Sigil` contract, labels are passed to child classes to uniquely identify them, they can be supplied using two patterns:

##### Decorator pattern

Apply a label with the `@WithSigil` decorator:

```ts
import { Sigil, WithSigil } from '@vicin/sigil';

@WithSigil('@myorg/mypkg.User')
class User extends Sigil {}
```

##### HOF (Higher-Order Function) pattern

Apply a label using HOF as `withSigil` or `withSigilTyped`:

```ts
import { Sigil, withSigil } from '@vicin/sigil';

class _User extends Sigil {}
const User = withSigil(_User, '@myorg/mypkg.User');

const user = new User();
console.log(User.SigilLabel); // "@myorg/mypkg.User"
```

> Note: When extending an already sigilified class (for example `Sigil`), you must decorate the subclass or use the HOF helpers in DEV mode unless you configured the library otherwise.

### Minimal “first-run” example

```ts
import { Sigil, withSigil } from '@vicin/sigil';

class _User extends Sigil {
  constructor(public name: string) {
    super();
  }
}
export const User = withSigil(_User, '@myorg/mypkg.User');

const u = new User('alice');

console.log(User.SigilLabel); // "@myorg/mypkg.User"
console.log(User.isOfType(u)); // true
```

### Migration

Migrating old code into `Sigil` can be done seamlessly with this set-up:

1. Set `SigilOptions.autofillLabels` to `true` at the start of the app so no errors are thrown in the migration stage:

```ts
import { updateOptions } from '@vicin/sigil';
updateOptions({ autofillLabels: true });
```

2. Pass your base class to `Sigilify` mixin:

```ts
import { Sigilify } from '@vicin/sigil';

const MySigilBaseClass = Sigilify(MyBaseClass);
```

3. Or extend it with `Sigil`:

```ts
import { Sigil } from '@vicin/sigil';

class MyBaseClass extends Sigil {} // <-- add 'extends Sigil' here
```

Congratulations — you’ve opted into `Sigil` and you can start replacing `instanceof` with `isOfType`, however there is more to add to your system, check [Core concepts](#core-concepts) for more.

---

## Limitations & guarantees

This section states clearly what `Sigil` provides and what it does **not** provide.

### What Sigil guarantees

**1. Stable label → symbol mapping within the same JS global symbol registry.**

**2. Reliable runtime identity (when used as intended).**

**3. Nominal typing that is inheritance-aware**

### What Sigil does not guarantee

**1. Doesn't work across isolated realms (e.g., iframes, workers) without custom bridging.**

**2. Not for security/access control — constructors can be discoverable.**

---

## Core concepts

### Terminology

- **Label**: A human-readable identity (string) such as `@scope/pkg.ClassName`.
- **SigilType (symbol)**: `Symbol.for(label)` — for runtime stability.
- **Type lineage**: Array of symbols for ancestry.
- **Type set**: Set of symbols for fast checks.
- **Brand**: TypeScript marker (`__SIGIL_BRAND__`) for nominal types.

---

### Purpose and Origins

Sigil addresses issues in large monorepos and Domain-Driven Design (DDD):

- **Unreliable `instanceof`:** Bundling and HMR cause class redefinitions, breaking checks.
- **Manual Branding Overhead:** Custom identifiers lead to boilerplate and maintenance issues.

`Sigil` abstracts these into a **centralized system**, making identity management **explicit** and **error-resistant** if defined the right way.

### Implementation Mechanics

- **Runtime Contract:** Established via extending `Sigil` or using `Sigilify` mixin.
- **Update metadata:** With each new child, HOF or decorators are used to attach metadata and update nominal type.
- **Accessors & Type guards:** Classes expose `SigilLabel`, `SigilType`; instances provide `getSigilLabel()` and `getSigilType()` for querying unique identifier label or symbol. also when typed it hold nominal identity used to prevent subtle bugs.

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

// Runtime contract
class _MyClass extends Sigil {}

// Update metadata (append new label)
const MyClass = withSigilTyped(_MyClass, '@scope/package.MyClass');
type MyClass = GetInstance<typeof MyClass>;

// Accessors & Type guards
console.log(MyClass.SigilLabel); // '@scope/package.MyClass'
console.log(new MyClass().getSigilType()); // Symbol.for('@scope/package.MyClass')
console.log(MyClass.isOfType(new MyClass())); // true
function x(c: MyClass) {} // Only instances created by 'MyClass' can be passed
```

---

## Nominal typing patterns

In this part we will discuss conventions to avoid any type errors and have nominal typing with just extra few definition lines.
We have two patterns, **HOF pattern (`_Class`/`Class`)** and **Decorator pattern**:

### 1. HOF pattern (`_Class`/`Class`)

Define implementation in an untyped class, then wrap for typing:

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

class _X extends Sigil {
  // Class logic here
}
export const X = withSigilTyped(_X, 'Label.X');
export type X = GetInstance<typeof X>;
```

#### `InstanceType<>` vs `GetInstance<>`

You should depend on `GetInstance` to get type of instance and avoid using `InstanceType` as it returns `any` if the class constructor is `protected` or `private`.

```ts
export type X = GetInstance<typeof X>; // <-- works with 'private' and 'protected' constructors as well
```

Internally `GetInstance` is just `T extends { prototype: infer R }`.

#### Generic propagation

```ts
class _X<G> extends Sigil {}
export const X = withSigilTyped(_X, 'Label.X');
export type X<G> = GetInstance<typeof X<G>>; // <-- Redeclare generics here

class _Y<G> extends X<G> {} // and so on...
```

#### Anonymous classes

You may see error: `Property 'x' of exported anonymous class type may not be private or protected.`, although this is rare to occur.
This comes from the fact that all typed classes are `anonymous class` as they are return of HOF. to avoid these error entirely all you need is exporting the untyped classes even if they are un-used as a good convention.

```ts
export class _X extends Sigil {} // <-- Just add 'export' here
export const X = withSigilTyped(_X, 'Label.X');
export type X = GetInstance<typeof X>;
```

#### Private constructors

The only limitation in HOF approach is **extending private constructors**:

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';
class _X extends Sigil {
  private constructor() {}
}
const X = withSigilTyped(_X, 'X');
type X = GetInstance<typeof X>;

class _Y extends X {} // <-- This is allowed!
const Y = withSigilTyped(_Y, 'Y');
type Y = GetInstance<typeof Y>;

const y = new Y(); // <-- Type here is any
```

Unfortunately this is a limitation in typescript and I couldn't find any solution to address it.

---

### 2. Decorator pattern

Inject brand directly in class body:

```ts
import { Sigil, WithSigil, UpdateSigilBrand } from '@vicin/sigil';

@WithSigil('X')
class X extends Sigil {
  declare __SIGIL_BRAND__: UpdateSigilBrand<'X', Sigil>;
}

@WithSigil('Y')
class Y extends X {
  declare __SIGIL_BRAND__: UpdateSigilBrand<'Y', X>;
}
```

No `_Class`/`Class` pattern, no `private constructor` issue, no type hacks and only one extra line, but our branding logic now lives in class body.

#### Label Consistency

Use typeof label for compile-time matching:

```ts
import { Sigil, WithSigil, UpdateSigilBrand } from '@vicin/sigil';

const label = 'X';

@WithSigil(label)
class X extends Sigil {
  declare __SIGIL_BRAND__: UpdateSigilBrand<typeof label, Sigil>;
}
```

---

## API reference

### Primary Exports

- **Mixins:**
  - `Sigilify(Base, label?, opts?)`
  - `SigilifyAbstract(Base, label?, opts?)`

- **Classes:**
  - `Sigil`
  - `SigilError`

- **Decorator:**
  - `WithSigil(label, opts?)`

- **HOFs:**
  - `withSigil(Class, label?, opts?)`
  - `withSigilTyped(Class, label?, opts?)`

- **Helpers:**
  - `isSigilCtor(ctor)`
  - `isSigilInstance(inst)`
  - `isSigilBaseCtor(ctor)`
  - `isSigilBaseInstance(inst)`
  - `isDecorated(ctor)`
  - `isInheritanceChecked(ctor)`

- **Options:**
  - `updateOptions(opts)`
  - `DEFAULT_LABEL_REGEX`

- **Types:**
  - `ISigil<Label, ParentSigil?>`
  - `ISigilStatic<Label, ParentSigil?>`
  - `ISigilInstance<Label, ParentSigil?>`
  - `SigilBrandOf<T>`
  - `TypedSigil<SigilClass, Label>`
  - `GetInstance<T>`
  - `UpdateSigilBrand<Label, Base>`
  - `SigilOptions`

### Key helpers (runtime)

- `Sigil`: a minimal sigilified base class you can extend from.
- `SigilError`: an `Error` class decorated with a `Sigil` so it can be identified at runtime.
- `WithSigil(label)`: class decorator that attaches `Sigil` metadata at declaration time.
- `Sigilify(Base, label?, opts?)`: mixin function that returns a new constructor with `Sigil` types and instance helpers.
- `withSigil(Class, label?, opts?)`: HOF that validates and decorates an existing class constructor.
- `withSigilTyped(Class, label?, opts?)`: like `withSigil` but narrows the TypeScript type to include brands.
- `isSigilCtor(value)`: `true` if `value` is a `Sigil` constructor.
- `isSigilInstance(value)`: `true` if `value` is an instance of a `Sigil` constructor.
- `updateOptions(opts)`: change global runtime options before `Sigil` decoration (e.g., `autofillLabels`).
- `DEFAULT_LABEL_REGEX`: regex that ensures structure of `@scope/package.ClassName` to all labels, it's advised to use it as your `SigilOptions.labelValidation`

### Instance & static helpers provided by Sigilified constructors

When a constructor is decorated/sigilified it will expose the following **static** getters/methods:

- `SigilLabel` — the human label string.
- `SigilLabelLineage` — readonly array of labels representing parent → child.
- `SigilLabelSet` — readonly `Set<string>` for O(1) checks.
- `isSigilified(obj)` — runtime predicate that delegates to `isSigilInstance`.
- `isOfType(other)` — O(1) membership test using `other`'s `__LABEL_SET__`.
- `isOfTypeStrict(other)` — strict lineage comparison element-by-element.

Instances of sigilified classes expose instance helpers:

- `getSigilLabel()` — returns the human label.
- `getSigilType()` — runtime symbol.
- `getSigilTypeLineage()` — returns lineage array.
- `getSigilTypeSet()` — returns readonly Set.
- `isOfType(other)` — O(1) membership test using `other`'s `__LABEL_SET__`.
- `isOfTypeStrict(other)` — strict lineage comparison element-by-element.

---

## Options & configuration

Customize behavior globally at startup:

```ts
import { updateOptions } from '@vicin/sigil';

updateOptions({
  autofillLabels: false, // Automatically label unlabeled subclasses
  skipLabelInheritanceCheck: false, // Bypass dev inheritance checks -- ALMOST NEVER WANT TO SET THIS TO TRUE, Use 'autofillLabels: true' instead.
  labelValidation: null, // Function or regex, Enforce label format
});
```

Values defined in previous example are defaults, per-class overrides available in mixin, decorators, and HOFs.

---

## Minimal mode

`updateOptions({ autofillLabels: true });` – Enables background operation without explicit labels:

```ts
import { Sigil, updateOptions } from '@vicin/sigil';

// run at the start of the app
updateOptions({ autofillLabels: true });

// No decorators or HOF needed to use 'isOfType' ('instanceof' replacement)
class A extends Sigil {}
class B extends A {}
class C extends B {}
```

---

## Troubleshooting & FAQ

- **Dev Extension Errors:** Add labels or enable autofillLabels.
- **Anonymous Class Errors:** Export untyped bases.
- **Selective Labeling:** Use `autofillLabels: true` or empty `@WithSigil()` for auto-generation.

---

## Phantom

`Phantom` is another lightweight TypeScript library I created for achieving **nominal typing** on primitives and objects through type-only metadata. It solves the problem of structural typing in TypeScript allowing accidental misuse of identical shapes (e.g., confusing `UserId` and `PostId` as both strings) by enabling compile-time distinctions with features like **brands**, **constrained identities**, **variants for states**, **additive traits**, and **reversible transformations**. This makes it ideal for domain-driven design (DDD) without runtime overhead.

`Phantom` works seamlessly in conjunction with `Sigil`, use `Sigil` for nominal identity on classes (runtime-safe checks across bundles), and `Phantom` for primitives/objects. Together, they provide **end-to-end type safety**: e.g., a Sigil-branded `User` class could hold a Phantom-branded `UserId` string property, enforcing domain boundaries at both compile and runtime.

- **GitHub: [@phantom](https://github.com/ZiadTaha62/phantom)**
- **NPM: [@phantom](https://www.npmjs.com/package/@vicin/phantom)**

---

## Contributing

Any contributions you make are **greatly appreciated**.

Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Reporting bugs

If you encounter a bug:

- 1. Check existing issues first
- 2. Open a new issue with:
  - Minimal reproduction
  - Expected vs actual behavior
  - Environment (Node, TS version)

Bug reports help improve Sigil — thank you! 🙏

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Author

Built with ❤️ by **Ziad Taha**.

- **GitHub: [@ZiadTaha62](https://github.com/ZiadTaha62)**
- **NPM: [@ziadtaha62](https://www.npmjs.com/~ziadtaha62)**
- **Vicin: [@vicin](https://www.npmjs.com/org/vicin)**
