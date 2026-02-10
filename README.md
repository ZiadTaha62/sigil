# Sigil

`Sigil` is a lightweight TypeScript library for creating **nominal identity classes** with compile-time branding and reliable runtime type checks. It organizes classes across your code and gives you power of **nominal typing**, **safe class checks across bundles** and **centralized registry** where reference to every class constructor is stored and enforced to have its own unique label and symbol.

> **Key ideas:**
>
> - **Compile-time nominal typing** via type brands so two structurally-identical types can remain distinct.
> - **Reliable runtime guards** using `Symbol.for(...)` and lineage sets instead of `instanceof`.
> - **Inheritance-aware identity**: lineages and sets let you test for subtype/supertype relationships.
> - **Centralized class registry**: every class have its own unique label and symbol that can be used as an id throughout the codebase.

**Note: You should read these parts before implementing `Sigil` in your code:**

- **Security note:** By default, `Sigil` stores constructor references in a global registry. While this does not expose private instance data, it allows any module to retrieve a class constructor via its label. If you have sensitive classes that should not be accessible globally, update your options:

```ts
@WithSigil("label", { storeConstructor: false })
```

See the [Registry](#registry) section for more details.

- **Performance & Hot-Paths note:** `Sigil` attaches minimal metadata to instances, which is negligible for 99% of use cases. While `.isOfType()` is optimized, it is inherently slower than the native `instanceof` operator. For extreme hot-path code where every microsecond counts, stick to native checks—but keep in mind you'll lose Sigil's cross-bundle reliability.

- **HOF & Private Constructors note:** Due to a known TypeScript limitation with class expressions, using HOF helpers (like `withSigilTyped`) on classes with private constructors still allow those classes to be extended in the type system. If strict constructor encapsulation is a priority, please review the [Private Constructors](#private-constructors) guide.

- **Simplified instanceof Replacement:** `Sigil` relies on unique labels to identify classes. If your primary goal is simply to fix `instanceof` across bundles without the overhead of nominal typing or a registry, you can jump straight to our [Minimal Setup Guide](#i-dont-care-about-nominal-types-or-central-registry-i-just-want-a-runtime-replacement-of-instanceof).

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
  - [Install](#install)
  - [Basic usage (mixin / base class)](#basic-usage-mixin--base-class)
  - [Decorator style](#decorator-style)
  - [HOF helpers](#hof-higher-order-function-helpers)
  - [Minimal “first-run” example](#minimal-first-run-example)
  - [Migration](#migration)
- [Limitations & guarantees](#limitations--guarantees)
- [Core concepts](#core-concepts)
- [Nominal typing](#nominal-typing)
- [API reference](#api-reference)
- [Options & configuration](#options--configuration)
- [Registry](#registry)
- [Security guidance](#security-guidance)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Deprecated API](#deprecated-api)
- [Phantom](#phantom)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Features

- Attach **stable runtime identity** to classes using `Symbol.for(label)`.

- **Type-level branding** so distinct domain identities are enforced by TypeScript.

- **Lineage tracking** (arrays + sets of symbols) for O(1) and O(n) checks.

- Easy to use: decorator (`@WithSigil`), mixin (`Sigilify`), and HOF (Higher order function) helpers (`withSigil`, `withSigilTyped`, `typed`).

- **Global registry** to centralize classes (query any class by its label in run-time) and guard against duplicate labels.

- Minimal runtime overhead in production (DEV checks can be toggled off).

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

**Requirements**: TypeScript 5.0+ (for stage-3 decorators) and Node.js 18+ recommended. however HOF can be used in older TypeScript versions.

### Basic usage (mixin / base class)

Use the `Sigil` base class or the `Sigilify` mixin to opt a class into the Sigil runtime contract.

```ts
import { Sigil, Sigilify } from '@vicin/sigil';

// Using the pre-sigilified base class:
class User extends Sigil {}

// Or use Sigilify when you want an ad-hoc class:
const MyClass = Sigilify(class {}, '@myorg/mypkg.MyClass');
```

This adds runtime metadata to the constructor and allows you to use runtime helpers (see API).

### Decorator style

Apply a label with the `@WithSigil` decorator. This is handy for small classes or when you prefer decorator syntax.

```ts
import { Sigil, WithSigil } from '@vicin/sigil';

@WithSigil('@myorg/mypkg.User')
class User extends Sigil {}
```

> Note: When extending an already sigilized class (for example `Sigil`), you must decorate the subclass or use the HOF helpers in DEV mode unless you configured the library otherwise.

### HOF (Higher-Order Function) helpers

HOFs work well in many build setups and are idempotent-safe for HMR flows.

```ts
import { Sigil, withSigil } from '@vicin/sigil';

class _User extends Sigil {}
const User = withSigil(_User, '@myorg/mypkg.User');

const user = new User();
console.log(User.SigilLabel); // "@myorg/mypkg.User"
```

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

2. Make your base classes extends `Sigil`:

```ts
import { Sigil } from '@vicin/sigil';

class MyBaseClass {} // original

class MyBaseClass extends Sigil {} // <-- add 'extends Sigil' here
```

Just like this, your entire classes are sigilized and you can start using `.isOfType()` as a replacement of `instanceof` in cross bundle checks.
But there is more to add to your system, which will be discussed in the [Core concepts](#core-concepts).

---

## Limitations & guarantees

This section states clearly what `Sigil` provides and what it does **not** provide.

### What Sigil guarantees

**1. Stable label → symbol mapping within the same JS global symbol registry.**

- If two bundles share the same **global symbol registry** (the thing `Symbol.for(...)` uses), then `Symbol.for(label)` is identical across them — enabling cross-bundle identity checks when both sides use the same label string.

**2. Reliable runtime identity (when used as intended).**

- When classes are sigilified and their labels are used consistently, `.isOfType()` and the `SigilTypeSet` checks produce stable results across bundles/Hot Module Replacement flows that share the same runtime/global symbol registry.

**3. Optional central registry for discovery & serialization helpers.**

- If enabled, the registry centralizes labels (and optionally constructor references), which can be used for label-based serialization or runtime lookups within a trusted runtime.

**4. Nominal typing that is inheritance-aware**

- With couple extra lines of code you can have nominally typed classes.

### What Sigil does not guarantee

**2. It is not for across isolated JS realms.**

Examples of isolated realms where Sigil may not work as expected:

- iframe with a different global context that does not share the same window (and therefore a different symbol registry).
- Workers or processes that do not share the same `globalThis` / symbol registry.
- Cross-origin frames where symbols are not shared.

In such cases you must provide a bridging/serialization protocol that maps labels to constructors on each side. however `Sigil` if used as intended makes serialization protocol much easier as each class will have a unique label.

**3. Not a security or access-control mechanism.**

Presence of a constructor or label in the registry is discoverable (unless you purposely set `storeConstructor: false`). Do **not** use `Sigil` as an authorization or secrets mechanism.

---

## Core concepts

### Terminology

- **Label**: A human-readable identity (string) such as `@scope/pkg.ClassName`.
- **SigilType (symbol)**: `Symbol.for(label)` — stable across realms that share the global registry.
- **Type lineage**: An array `[parentSymbol, childSymbol]` used for strict ancestry checks.
- **Type set**: A `Set<symbol>` built from the lineage for O(1) membership checks.
- **Brand**: A compile-time-only TypeScript marker carried on instances so the type system treats labelled classes nominally.
- **Registry**: A global Map of registered `Sigil` classes keyed by there labels.

---

### Why `Sigil` exists

`Sigil` was born out of real-world friction in a large **monorepo** built with **Domain-Driven Design (DDD)**.

#### The monorepo (`instanceof`) problem

The first issue surfaced with `instanceof`.
In modern JavaScript setups—monorepos, multiple bundles, HMR, transpiled builds—the same class can be defined more than once at runtime. When that happens, `instanceof` becomes unreliable:

- Objects created in one bundle fail `instanceof` checks in another
- Hot reloads can silently break identity checks
- Runtime behavior diverges from what the type system suggests

This made instanceof unsuitable as a foundation for domain identity.

#### The DDD (`Manual branding`) problem

We started embedding custom identifiers directly into class to achieve nominal typing.
While this worked conceptually, it quickly became problematic:

- Every class needed boilerplate fields or symbols
- Type guards had to be hand-written and maintained
- Inheritance required extra care to preserve identity

The intent of the domain model was obscured by repetitive code, What started as a workaround became verbose, fragile, and hard to enforce consistently.

#### A better abstraction

Sigil is the result of abstracting that pattern into a **first-class identity system**:

- **Nominal identity at compile time**, without structural leakage
- **Reliable runtime type checks**, without instanceof
- **Inheritance-aware identity**, with lineage tracking
- **Minimal runtime overhead**, with DEV-only safeguards

Instead of embedding identity logic inside every class, Sigil centralizes it, enforces it, and makes it explicit.

The goal is simple:

- **Make domain identity correct by default, and hard to get wrong.**

---

### How Sigil solves the problems

#### Problem A — `instanceof` is unreliable

To make runtime identity reliable across bundles, HMR, and transpiled code, `Sigil` explicitly attaches identity metadata and tracks inheritance lineage on classes. That tracking starts with a contract created by `Sigilify()` (a mixin) or by extending the `Sigil` base class. Sigilify augments a plain JS class with the metadata and helper methods Sigil needs (for example, `isOfType`).

Basic patterns:

**Mixin:**

```ts
import { Sigilify } from '@vicin/sigil';

const MyClass = Sigilify(class {}, 'MyClass');
```

**Direct base-class extend:**

```ts
import { Sigil, WithSigil } from '@vicin/sigil';

@WithSigil('MyClass')
class MyClass extends Sigil {}
```

Once you opt into the runtime contract, Sigil enforces consistency: in DEV mode, extending a sigil-aware class without using decorator `@WithSigil` or a provided HOF (e.g. `withSigil` or `withSigilTyped`) will throw a helpful error. If you prefer a laxer setup, Sigil can be configured to auto-label.

**Decorator:**

```ts
import { Sigil, WithSigil } from '@vicin/sigil';

@WithSigil('MyClass')
class MyClass extends Sigil {}
```

**HOF:**

```ts
import { Sigil, withSigil } from '@vicin/sigil';

class _MyClass extends Sigil {}
const MyClass = withSigil(_MyClass, 'MyClass');
```

#### Problem B — Branding can get messy

Runtime metadata alone does not change TypeScript types. To get compile-time nominal typing (so `UserId` ≠ `PostId` even with the same shape), Sigil provides two patterns:

**Decorator with brand field:**

```ts
import { Sigil, WithSigil, UpdateSigilBrand } from '@vicin/sigil';

@WithSigil('User')
class User extends Sigil {
  declare __SIGIL_BRAND__: UpdateSigilBrand<'User', Sigil>; // <-- inject type
}
```

**HOF with `_Class` / `Class`:**

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

// Untyped (runtime) base you extend as normal TS class code:
class _User extends Sigil {}

// Create a fully typed & runtime-safe class:
const User = withSigilTyped(_User, 'User');
type User = GetInstance<typeof User>;
```

Typings are lineage aware as well:

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

class _A extends Sigil {}
const A = withSigilTyped(_A, 'A');
type A = GetInstance<typeof A>;

class _B extends A {}
const B = withSigilTyped(_B, 'B');
type B = GetInstance<typeof B>;

type test1 = A extends B ? true : false; // false
type test2 = B extends A ? true : false; // true
```

#### SigilLabel & SigilType

If library is used with default options, `SigilLabel` & `SigilType` are **100% unique** for each class, which make them perfect replacement of manual labeling across your code that comes shipped with Sigil by default. you can access them in class constructor directly of via `getSigilLabel()` and `getSigilType()` in instances.

---

## Nominal typing

In this part we will discuss conventions to avoid any type errors and have normal developing experience with just extra few definition lines at the bottom of the file.
First we have two patterns, **HOF with `_Class` / `Class`** and **Decorators with brand field**:

### HOF with `_Class` / `Class`

The update of `Sigil` brand types happens via HOF that are defined below actual class definition:

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

class _X extends Sigil {
  // All logic for class
}

export const X = withSigilTyped(_X, 'Label.X'); // <-- Pass class with label to uniquely identify it from other classes
export type X = GetInstance<typeof X>;
```

In other parts of the code:

```ts
import { X } from './example.ts';

class _Y extends X {
  // All logic as earlier
}

export const Y = withSigilTyped(_Y, 'Label.Y');
export type Y = GetInstance<typeof Y>;
```

So as we have seen nominal identity is introduced with few lines only below each class. and the bulk code where logic lives is untouched.

#### `InstanceType<>` vs `GetInstance<>`

You should depend on `GetInstance` to get type of instance and avoid using `InstanceType` as it returns `any` if the class constructor is `protected` or `private`.

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

class _X extends Sigil {}

export const X = withSigilTyped(_X, 'Label.X');
export type X = GetInstance<typeof X>; // <-- works with 'private' and 'protected' constructors as well
```

Internally `GetInstance` is just `T extends { prototype: infer R }`.

#### Generic propagation

One of the downsides of defining typed class at the bottom is that we need to redefine generics as well in the type.

Example of generic propagation:

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

// Untyped base classes used for implementation:
class _X<G> extends Sigil {}

export const X = withSigilTyped(_X, 'Label.X');
export type X<G> = GetInstance<typeof X<G>>; // <-- Generics re-defined here, just copy-paste and pass them
```

#### Anonymous classes

You may see error: `Property 'x' of exported anonymous class type may not be private or protected.`, although this is rare to occur.
This comes from the fact that all typed classes are `anonymous class` as they are return of HOF and ts compiler struggle to type them safely. to avoid these error entirely all you need is exporting the untyped classes even if they are un-used as a good convention.

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

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

Unfortunately this is a limitation in typescript and i couldn't find any solution to adress it.

---

### Decorators with brand field

The update of `Sigil` brand type happens directly by overriding `__SIGIL_BRAND__` field:

```ts
import { Sigil, WithSigil, UpdateSigilBrand } from '@vicin/sigil';

@WithSigil('X')
class X extends Sigil {
  declare __SIGIL_BRAND__: UpdateSigilBrand<'X', Sigil>;
}

@WithSigil('Y')
class Y extends X {
  declare __SIGIL_BRAND__: UpdateSigilBrand<'Y', Sigil>;
}
```

As you see no `_Class`/`Class` pattern, no `private constructor` issue and no type hacks, but our branding logic now lives in class body.

To be more explicit and prevent mismatch between run-time and compile-time labels we can:

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

> The runtime API is intentionally small and focused. Types are exported for consumers that want to interact with compile-time helpers.

### Exports

Top-level exports from the library:

```ts
export { Sigil, SigilError } from './classes';
export { WithSigil } from './decorator';
export { withSigil, withSigilTyped } from './enhancers';
export {
  isDecorated,
  isInheritanceChecked,
  isSigilBaseCtor,
  isSigilBaseInstance,
  isSigilCtor,
  isSigilInstance,
} from './helpers';
export { Sigilify } from './mixin';
export {
  updateOptions,
  SigilRegistry,
  getActiveRegistry,
  DEFAULT_LABEL_REGEX,
} from './options';
export type {
  ISigil,
  TypedSigil,
  GetInstance,
  SigilBrandOf,
  SigilOptions,
  UpdateSigilBrand,
} from './types';
```

### Key helpers (runtime)

- `Sigil`: a minimal sigilified base class you can extend from.
- `SigilError`: an `Error` class decorated with a sigil so it can be identified at runtime.
- `WithSigil(label)`: class decorator that attaches sigil metadata at declaration time.
- `Sigilify(Base, label?, opts?)`: mixin function that returns a new constructor with sigil types and instance helpers.
- `withSigil(Class, label?, opts?)`: HOF that validates and decorates an existing class constructor.
- `withSigilTyped(Class, label?, opts?)`: like `withSigil` but narrows the TypeScript type to include brands.
- `isSigilCtor(value)`: `true` if `value` is a sigil constructor.
- `isSigilInstance(value)`: `true` if `value` is an instance of a sigil constructor.
- `SigilRegistry`: `Sigil` Registy class used to centralize classes across app.
- `getActiveRegistry`: Getter of active registry being used by `Sigil`.
- `updateOptions(opts, mergeRegistries?)`: change global runtime options before sigil decoration (e.g., `autofillLabels`, `devMarker`, etc.).
- `DEFAULT_LABEL_REGEX`: regex that ensures structure of `@scope/package.ClassName` to all labels, it's advised to use it as your `SigilOptions.labelValidation`

### Instance & static helpers provided by Sigilified constructors

When a constructor is decorated/sigilified it will expose the following **static** getters/methods:

- `SigilLabel` — the human label string.
- `SigilType` — the runtime symbol for the label.
- `SigilTypeLineage` — readonly array of symbols representing parent → child.
- `SigilTypeSet` — readonly `Set<symbol>` for O(1) checks.
- `isSigilified(obj)` — runtime predicate that delegates to `isSigilInstance`.
- `isOfType(other)` — O(1) membership test using `other`'s `__TYPE_SET__`.
- `isOfTypeStrict(other)` — strict lineage comparison element-by-element.

Instances of sigilified classes expose instance helpers:

- `getSigilLabel()` — returns the human label.
- `getSigilType()` — runtime symbol.
- `getSigilTypeLineage()` — returns lineage array.
- `getSigilTypeSet()` — returns readonly Set.

---

## Options & configuration

Sigil exposes a small set of runtime options that control registry and DEV behavior. These can be modified at app startup via `updateOptions(...)` to set global options:

```ts
import { updateOptions, SigilRegistry } from '@vicin/sigil';

// Values defined in this example are defaults:

updateOptions({
  autofillLabels: false, // auto-generate labels for subclasses that would otherwise inherit
  skipLabelInheritanceCheck: false, // skip DEV-only inheritance checks -- ALMOST NEVER WANT TO SET THIS TO TRUE, Use 'autofillLabels: true' instead. --
  labelValidation: null, // or a RegExp / function to validate labels
  devMarker: process.env.NODE_ENV !== 'production', // boolean used to block dev only checks in non-dev environments
  registry: new SigilRegistry(), // setting active registry used by 'Sigil'
  useGlobalRegistry: true, // append registry into 'globalThis' to ensure single source in the runtime in cross bundles.
  storeConstructor: true, // store reference of the constructor in registry
});
```

Global options can be overridden per class by `opts` field in decorator and HOF.

---

## Registry

`Sigil`'s default options require developers to label every class, that allows central class registry that stores a reference for every class keyed by its label, also it prevent two classes in the codebase from having the same `SigilLabel`.

This is mainly useful in large codebases or frameworks where they need central registry or if you need class transport across API, workers, etc... where you can use `SigilLabel` reliably to serialize class identity. to interact with registry `Sigil` exposes `getActiveRegistry` and `SigilRegistry` class. also you can update registry related options with `updateOptions`.

By default, registry is stored in `globalThis` under `Symbol.for(__SIGIL_REGISTRY__)` so one instance is used across runtime even with multiple bundles, but this also exposes that map anywhere in the code, see [globalThis and security](#globalthis-and-security).

### Get registry

You can interact with registry using `getActiveRegistry`, this function returns registry currently in use:

```ts
import { getActiveRegistry } from '@vicin/sigil';
const registry = getActiveRegistry();
if (registry) console.log(registry.listLabels()); // check for presence as it can be 'null' if 'updateOptions({ registry: null })' is used
```

### Replace registry

In most cases you don't need to replace registry, but if you wanted to define a `Map` and make `Sigil` use it aa a register (e.g. define custom side effects) you can use `SigilRegistry`:

```ts
import { SigilRegistry, updateOptions } from '@vicin/sigil';

const myMap = new Map();
const myRegistry = new SigilRegistry(myMap);
updateOptions({ registry: myRegistry });

// Now 'Sigil' register new labels and constructors to 'myMap'.
```

By default `Sigil` will merge old registry map into `myMap`, to prevent this behavior:

```ts
updateOptions({ registry: myRegistry }, false); // <-- add false here
```

Also you can set registry to `null`, but this is not advised as it disable all registry operations entirely:

```ts
import { updateOptions } from '@vicin/sigil';
updateOptions({ registry: null }); // No label checks and registry map is freed from memory
```

### globalThis and security

By default registry is stored in `globalThis`. to disable this behavior you can:

```ts
import { updateOptions } from '@vicin/sigil';
updateOptions({ useGlobalRegistry: false });
```

Before applying this change, for registry to function normally you should ensure that `Sigil` is not bundles twice in your app.
however if you can't ensure that only bundle of `Sigil` is used and don't want class constructors to be accessible globally do this:

```ts
import { updateOptions } from '@vicin/sigil';
updateOptions({ storeConstructor: false });
```

Now registry only stores label of this classes and all class constructors are in the map are replaced with `null`.
If you need even more control and like the global registry for classes but want to obscure only some of your classes you can pass this option per class and keep global options as is:

```ts
import { withSigil, Sigil } from '@vicin/sigil';

class _X extends Sigil {}
const X = withSigil(_X, 'X', { storeConstructor: false });
```

Pick whatever pattern you like!

### Class typing in registry

Unfortunately concrete types of classes is not supported and all classes are stored as `ISigil` type. if you want concrete typings you can wrap registry:

```ts
import { getActiveRegistry } from '@vicin/sigil';
import { MySigilClass1 } from './file1';
import { MySigilClass2 } from './file2';

interface MyClasses {
  MySigilClass1: typeof MySigilClass1;
  MySigilClass2: typeof MySigilClass2;
}

class MySigilRegistry {
  listLabels(): (keyof MyClasses)[] {
    return getActiveRegistry()?.listLabels();
  }
  has(label: string): boolean {
    return getActiveRegistry()?.has(label);
  }
  get<L extends keyof MyClasses>(label: L): MyClasses[L] {
    return getActiveRegistry()?.get(label) as any;
  }
  unregister(label: string): boolean {
    return getActiveRegistry()?.unregister(label);
  }
  clear(): void {
    getActiveRegistry()?.clear();
  }
  replaceRegistry(newRegistry: Map<string, ISigil> | null): void {
    getActiveRegistry()?.replaceRegistry(newRegistry);
  }
  get size(): number {
    return getActiveRegistry()?.size;
  }
}

export const MY_SIGIL_REGISTRY = new MySigilRegistry();
```

Now you have fully typed central class registry!

### I don't care about nominal types or central registry, i just want a runtime replacement of 'instanceof'

You can run this at the start of your app:

```ts
import { updateOptions } from '@vicin/sigil';
updateOptions({ autofillLabels: true, storeConstructor: false });
```

now you can omit all `HOF`, `Decorators` and make `Sigil` work in the background:

```ts
import { Sigil } from '@vicin/sigil';

class X extends Sigil {}
class Y extends X {}
class Z extends Y {}

Z.isOfType(new Y()); // true
Z.isOfType(new X()); // true
Y.isOfType(new Y()); // false
```

No class constructors are stored globally and no code overhead, moreover if you can ensure that `Sigil` is not bundles twice you can disable `useGlobalRegistry` and no trace of sigil in `globalThis`.

---

## Security guidance

### Recommended defaults & quick rules

- Default recommendation for public/shared runtimes (web pages, untrusted workers, serverless):

```ts
updateOptions({ useGlobalRegistry: false, storeConstructor: false });
```

This prevents constructors from being put on `globalThis` and prevents constructors from being stored in the registry map (labels remain, but constructors are `null`).

- For private server runtimes (single controlled Node process) where a central registry is desired:

```ts
updateOptions({ useGlobalRegistry: true, storeConstructor: true });
```

Only enable this if you control all bundles and trust the runtime environment.

### Per-class sensitivity control

If you want the registry in general but need to hide particular classes (e.g., internal or security-sensitive classes), pass `storeConstructor: false` for those classes:

```ts
class _Sensitive extends Sigil {}
export const Sensitive = withSigil(_Sensitive, '@myorg/internal.Sensitive', {
  storeConstructor: false, // label kept, constructor not stored
});
```

This keeps the declarative identity but avoids exposing the constructor reference in the registry.

### Short warnings (do not rely on Sigil for)

- **Not a security boundary:** Registry labels/constructors are discovery metadata — do not put secrets or private instance data in them or rely on them for access control.

- **Third-party code can access the registry if `useGlobalRegistry: true`** — only enable that in fully trusted runtimes.

---

## Troubleshooting & FAQ

**Q: My `instanceof` checks fail across bundles — will Sigil fix this?**

A: Yes. Sigil uses `Symbol.for(label)` and runtime `SigilTypeSet` membership checks to provide stable identity tests that work across bundles/realms that share the global symbol registry.

**Q: I accidentally extended a sigilized class without decorating the subclass; I see an error in DEV. How should I fix it?**

A: Use `@WithSigil("@your/label")`, or wrap the subclass with `withSigil` / `withSigilTyped`. Alternatively, you can relax DEV checks using `updateOptions({ skipLabelInheritanceCheck: true })` but be cautious — this weakens guarantees.

**Q: I got this error: 'Property 'x' of exported anonymous class type may not be private or protected.', How to fix it?**

A: This error comes from the fact that all typed classes (return from `withSigil`, `withSigilTyped` or `typed`) are 'anonymous class' as they are the return of HOF. all you need to do is to export untyped classes (`_Class`) that have private or protected properties. or even export all untyped classes as a good convention even if they are not used.

**Q: How do I inspect currently registered labels?**

A: Use `getActiveRegistry()?.listLabels()` to get an array of registered labels.

**Q: What if i want to omit labeling in some classes while enforce others?**

A: You can set `SigilOptions.autofillLabels` to `true`. or if you more strict enviroment you can define empty `@WithSigil()` decorator above classes you don't care about labeling and `Sigil` will generate random label for it, but still throw if you forgot to use a decorator or HOF on a class.

---

## Deprecated API

### REGISTRY

`Sigil` have moved from static reference registry to dynamic access and updates, now devs can create `SigilRegistry` class and pass it to `SigilOptions` to be be used by the library internals. however change is done gracefully and `REGISTRY` is still supported with no change in behavior but it's **marked with `deprecated` and will be removed in v2.0.0**.

```ts
import { REGISTRY, getActiveRegistry } from '@vicin/sigil';

// from:
const present = REGISTRY.has('label');

// to:
const present = getActiveRegistry()?.has('label'); // Active registy can be 'null' if 'SigilOptions.registy' is set to null so we used the '?' mark
```

```ts
import { REGISTRY, updateOptions, SigilRegistry } from '@vicin/sigil';

// from:
const newRegistry = new Map();
REGISTRY.replaceRegistry(newRegistry);

// to
const newRegistry = new SigilRegistry(); // can pass external map to constructor if needed.
updateOptions({ registry: newRegistry });
```

### typed

Typed was added to add types to output from `Sigilify` mixin, but now mixin do this by default.

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

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Author

Built with ❤️ by **Ziad Taha**.

- **GitHub: [@ZiadTaha62](https://github.com/ZiadTaha62)**
- **NPM: [@ziadtaha62](https://www.npmjs.com/~ziadtaha62)**
- **Vicin: [@vicin](https://www.npmjs.com/org/vicin)**
