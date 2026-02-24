# Sigil

[![npm version](https://img.shields.io/npm/v/@vicin/sigil.svg)](https://www.npmjs.com/package/@vicin/sigil) [![npm downloads](https://img.shields.io/npm/dm/@vicin/sigil.svg)](https://www.npmjs.com/package/@vicin/sigil) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue) [![Build](https://github.com/ZiadTaha62/sigil/actions/workflows/ci.yml/badge.svg)](https://github.com/ZiadTaha62/sigil/actions/workflows/ci.yml) ![bundle size](https://img.shields.io/bundlephobia/minzip/@vicin/sigil)

> - 🎉 v3.0.0 is out! Happy coding! 😄💻
> - 📄 **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

`Sigil` replaces `instanceof` across bundles, enforces nominal class identity, and makes inheritance-aware runtime type checks reliable in large TypeScript systems. It organizes class identities across your codebase and gives you the power of **nominal typing** and **safe cross-bundle class checks** where each class constructor is stored under a unique label.

> **Key ideas:**
>
> - **Reliable Runtime Checks:** Uses labels instead of instanceof for cross-bundle reliability.
> - **Nominal Typing at Compile Time:** Distinguishes structurally similar types (e.g., UserId vs. PostId).
> - **Inheritance Awareness:** Tracks lineages for subtype/supertype checks.

## Important Notes Before Using

- **Explicit class identity:** `Sigil` uses passed class label to identify classes, which means that the developer is responsible for uniqueness of classes by passing unique labels.
- **Performance:** Minimal overhead, `.isOfType()` is slightly slower than native `instanceof`. Avoid in ultra-hot paths.
- **Simple instanceof Fix:** If you just need runtime checks without extras, see the [minimal mode](#minimal-mode).

## Features

- ✅ **Drop-in `instanceof` replacement** that works across bundles, HMR, and monorepos
- ✅ **True nominal typing** with zero runtime cost
- ✅ **Inheritance-aware** checks (`isOfType` knows about subclasses)
- ✅ Four flexible usage patterns: `extends Sigil`, mixin, decorator, HOF
- ✅ Full TypeScript 5.0+ support + excellent JSDoc

---

## Table of contents

- [Quick start](#quick-start)
  - [Install](#install)
  - [Basic usage](#basic-usage)
  - [Decorator pattern](#decorator-pattern)
  - [HOF pattern](#hof-higher-order-function-pattern)
  - [Migration](#migration)
- [Core concepts](#core-concepts)
  - [Terminology](#terminology)
  - [Purpose and Origins](#purpose-and-origins)
  - [Implementation Mechanics](#implementation-mechanics)
  - [Inheritance example](#inheritance-example)
- [API reference](#api-reference)
- [Options & configuration](#options--configuration)
- [Minimal mode](#minimal-mode)
- [Strict mode](#strict-mode)
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

abstract class User extends Sigil {}

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

Apply a label using `withSigil` HOF:

```ts
import { Sigil, withSigil } from '@vicin/sigil';

class _User extends Sigil {}
const User = withSigil(_User, '@myorg/mypkg.User');

const user = new User();
console.log(User.SigilLabel); // "@myorg/mypkg.User"
```

### Migration

Migrating old code into `Sigil` can be done with extra couple lines of code only:

1. Pass your base class to `Sigilify` mixin:

```ts
import { Sigilify } from '@vicin/sigil';

const MySigilBaseClass = Sigilify(MyBaseClass);
```

2. Or extend it with `Sigil`:

```ts
import { Sigil } from '@vicin/sigil';

class MyBaseClass extends Sigil {} // <-- add 'extends Sigil' here
```

Congratulations — you’ve opted into `Sigil` and you can start replacing `instanceof` with `isOfType`, however there is more to add to your system, check [Core concepts](#core-concepts) for more.

---

## Core concepts

### Terminology

- **Label**: An identity (string) such as `@scope/pkg.ClassName`, but can be random string (e.g. `@Sigil.auto-dq62ib6jnvmmlfbjhxh2937h`) if no label passed.
- **EffectiveLabel:** A human-readable (string) such as `@scope/pkg.ClassName`, if no label is passed it inherit the last defined label.
- **Label lineage**: Array of labels for ancestry.
- **Label set**: Set of labels for fast checks.
- **[sigil]**: TypeScript symbol marker for nominal types.

---

### Purpose and Origins

Sigil addresses issues in large monorepos and Domain-Driven Design (DDD):

- **Unreliable `instanceof`:** Bundling and HMR cause class redefinitions, breaking checks.

```ts
// Broken in monorepo or HMR
if (obj instanceof User) { ... }

// With Sigil
if (User.isOfType(obj)) { ... } // This still works even if User was bundled twice.
```

- **Manual Branding Overhead:** Custom identifiers lead to boilerplate and maintenance issues, `Sigil` add reliable inheritance-aware nominal branding with just one line of code.

```ts
import { sigil } from '@vicin/sigil';

class User extends Sigil {
  declare [sigil]: ExtendSigil<'User', Sigil>; // <-- Update nominal brand with this line
}

type test1 = User extends Sigil ? true : false; // true
type test2 = Sigil extends User ? true : false; // false
```

`Sigil` abstracts these into a **centralized system**, making identity management **explicit** and **error-resistant** if defined the right way.

### Implementation Mechanics

- **Runtime Contract:** Established via extending `Sigil` or using `Sigilify` mixin.
- **Update metadata:** With each new child, use decorators or HOF to attach run-time metadata and `ExtendSigil` to update nominal type.

```ts
import { Sigil, WithSigil, sigil, ExtendSigil } from '@vicin/sigil';

@WithSigil('@scope/package.MyClass') // <-- Run-time values update
class MyClass extends Sigil {
  declare [sigil]: ExtendSigil<'@scope/package.MyClass', Sigil>; // <-- compile-time type update
}
```

You can avoid decorators and use HOF but they are slightly more verbose:

```ts
import { Sigil, withSigil, sigil, ExtendSigil } from '@vicin/sigil';

class _MyClass extends Sigil {
  declare [sigil]: ExtendSigil<'@scope/package.MyClass', Sigil>;
}

const MyClass = withSigil(_MyClass, '@scope/package.MyClass');
type MyClass = InstanceType<typeof MyClass>;
```

Note that you can't use `InstanceType` on `private` or `protected` classes.

### Inheritance example

```ts
import { Sigil, WithSigil } from '@vicin/sigil';

@WithSigil('@myorg/User')
class User extends Sigil {
  declare [sigil]: ExtendSigil<'@myorg/User', Sigil>;
}

@WithSigil('@myorg/Admin')
class Admin extends User {
  declare [sigil]: ExtendSigil<'@myorg/Admin', User>;
}

const admin = new Admin();
const user = new User();

console.log(Admin.isOfType(admin)); // true
console.log(Admin.isOfType(user)); // false
console.log(User.isOfType(admin)); // true

type test1 = Admin extends User ? true : false; // true
type test2 = User extends Admin ? true : false; // false
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

- **Helpers:**
  - `isSigilCtor(ctor)`
  - `isSigilInstance(inst)`
  - `isSigilBaseCtor(ctor)`
  - `isSigilBaseInstance(inst)`
  - `isDecorated(ctor)`
  - `isInheritanceChecked(ctor)`

- **Options:**
  - `updateSigilOptions(opts)`
  - `DEFAULT_LABEL_REGEX`

- **Types:**
  - `ISigil<Label, ParentSigil?>`
  - `ISigilStatic<Label, ParentSigil?>`
  - `ISigilInstance<Label, ParentSigil?>`
  - `SigilOf<T>`
  - `ExtendSigil<Label, Parent>`
  - `SigilOptions`

### Key helpers (runtime)

- `Sigil`: a minimal sigilified base class you can extend from.
- `SigilError`: an `Error` class decorated with a `Sigil` so it can be identified at runtime.
- `Sigilify(Base, label?, opts?)`: mixin function that returns a new constructor with `Sigil` types and instance helpers.
- `WithSigil(label)`: class decorator that attaches `Sigil` metadata at declaration time.
- `withSigil(Class, label?, opts?)`: HOF that validates and decorates an existing class constructor.
- `isSigilCtor(value)`: `true` if `value` is a `Sigil` constructor.
- `isSigilInstance(value)`: `true` if `value` is an instance of a `Sigil` constructor.
- `updateSigilOptions(opts)`: change global runtime options before `Sigil` decoration (e.g., `autofillLabels`).
- `DEFAULT_LABEL_REGEX`: regex that ensures structure of `@scope/package.ClassName` to all labels, it's advised to use it as your `SigilOptions.labelValidation`

### Instance & static helpers provided by Sigilified constructors

When a constructor is decorated/sigilified it will expose the following **static** getters/methods:

- `SigilLabel` — the identity label string.
- `SigilEffectiveLabel` — the human label string.
- `SigilLabelLineage` — readonly array of labels representing parent → child.
- `SigilLabelSet` — readonly `Set<string>` for O(1) checks.
- `isSigilified(obj)` — runtime predicate that delegates to `isSigilInstance`.
- `isOfType(other)` — O(1) membership test using `other`'s `__LABEL_SET__`.
- `isOfTypeStrict(other)` — strict lineage comparison element-by-element.

Instances of sigilified classes expose instance helpers:

- `getSigilLabel()` — returns the identity label.
- `getSigilEffectiveLabel()` — returns the human label.
- `getSigilLabelLineage()` — returns lineage array.
- `getSigilLabelSet()` — returns readonly Set.
- `isOfType(other)` — O(1) membership test using `other`'s `__LABEL_SET__`.
- `isOfTypeStrict(other)` — strict lineage comparison element-by-element.

---

## Options & configuration

Customize behavior globally at startup:

```ts
import { updateSigilOptions } from '@vicin/sigil';

updateSigilOptions({
  autofillLabels: true, // Automatically label unlabeled subclasses
  skipLabelInheritanceCheck: false, // Bypass dev inheritance checks -- ALMOST NEVER WANT TO SET THIS TO TRUE
  labelValidation: null, // Function or regex, Enforce label format
});
```

Values defined in previous example are defaults, per-class overrides available in mixin, decorators, and HOFs.

---

## Minimal mode

You can ignore all decorators and HOFs and just make base class extend `Sigil`:

```ts
import { Sigil, updateSigilOptions } from '@vicin/sigil';

// No decorators or HOF needed to use 'isOfType' ('instanceof' replacement)
class A extends Sigil {}
class B extends A {}
class C extends B {}
```

## Strict mode

If you want to enforce passing a label to every class defined in your codebase, you can set `autofillLabels` to `false` at the start of app:

```ts
import { updateSigilOptions } from '@vicin/sigil';

updateSigilOptions({ autofillLabels: false });
```

Now if you forgot to pass a label error is thrown.

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
