# Sigil

`Sigil` is a lightweight TypeScript library for creating **nominal identity classes** with compile-time branding and reliable runtime type checks. It organizes classes across your code and gives you power of **nominal typing**, **safe class checks across bundles** and **centralized registry** where reference to every class constructor is stored and enforced to have it's own unique label and symbol.

> **Key ideas:**
>
> - **Compile-time nominal typing** via type brands so two structurally-identical types can remain distinct.
> - **Reliable runtime guards** using `Symbol.for(...)` and lineage sets instead of `instanceof`.
> - **Inheritance-aware identity**: lineages and sets let you test for subtype/supertype relationships.
> - **Centralized class registry**: every class have its own unique label and symbol that can be used as an id throughout the codebase.

**Note: You should read these parts before implementing `Sigil` in you code:**

- **Security note:** By default, `Sigil` stores constructor references in the global registry. While it doesn't expose private instance data, it does mean any module can get constructor of the class. if you have sensitive classes that you want to be unaccessable outside it's module update global or per class options (e.g. `updateOptions({ storeConstructor: false })` or `@WithSigil("label", { storeConstructor: false })`). read more [Registery](#registry).

- **Performance note:** `Sigil` attaches couple methods to every sigilized class instance, this is negligible in almost all cases, also `.isOfType()` although being reliable and performance optimized but it still less performant that native `instanceof` checks, so if you want maximum performance in cases like hot-path code it is not advised to use `Sigil` as it's built for consistency and maintainability mainly at the cost of minimal performance overhead.

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
  - [Install](#install)
  - [Basic usage (mixin / base class)](#basic-usage-mixin--base-class)
  - [Decorator style](#decorator-style)
  - [HOF helpers (recommended)](#hof-helpers-recommended)
  - [Typed helpers (compile-time branding)](#typed-helpers-compile-time-branding)
  - [Migration](#migration)
- [Core concepts](#core-concepts)
- [Typing](#typing)
- [API reference](#api-reference)
- [Options & configuration](#options--configuration)
- [Registry](#registry)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Best practices](#best-practices)
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

- **Global registry** to centralize classes (query any class by it's label in run-time) and guard against duplicate labels.

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

**Requirements**: TypeScript 5.0+ (for stage-3 decorators) and Node.js 18+ recommended.

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

### HOF (Higher-Order Function) helpers - recommended -

HOFs work well in many build setups and are idempotent-safe for HMR flows.

```ts
import { Sigil, withSigil } from '@vicin/sigil';

class _User extends Sigil {}
const User = withSigil(_User, '@myorg/mypkg.User');

const user = new User();
console.log(User.SigilLabel); // "@myorg/mypkg.User"
```

### Typed helpers (compile-time branding)

If you want TypeScript to treat identities nominally (so `UserId` !== `PostId` despite identical shape), use the typed helpers.

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

class _User extends Sigil {}
const User = withSigilTyped(_User, '@myorg/mypkg.User');
type User = GetInstance<typeof User>;

// Now `User` carries a compile-time brand that prevents accidental assignment
// to other labelled instances with the same structure.
```

### Migration

Migration old code into `Sigil` can be done seamlessly with this set-up:

1. Set `SigilOptions.autofillLabels` to `true` at the start of the app so no errors are thrown in the migration stage:

```ts
import { updateOptions } from '@vicin/sigil';
updateOptions({ autofillLabels: true });
```

2. Make you base classes extends `Sigil`:

```ts
import { Sigil } from '@vicin/sigil';

class MyBaseClass {} // original

class MyBaseClass extends Sigil {} // <-- add 'extends Sigil' here
```

Just like this, your entire classes are siglized and you can start using `.isOfType()` as a replacement of `instanceof` in cross bundle checks.
But there is more to add to your system, which will be discussed in the [Core concepts](#core-concepts).

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

**Sigil’s solution (runtime chain).**
To make runtime identity reliable across bundles, HMR, and transpiled code, `Sigil` explicitly attaches identity metadata and tracks inheritance lineage on classes. That tracking starts with a contract created by `Sigilify()` (a mixin / class factory) or by extending the `Sigil` base class. Sigilify augments a plain JS class with the metadata and helper methods Sigil needs (for example, `isOfType`).

Basic patterns:

Mixin / factory:

```ts
import { Sigilify } from '@vicin/sigil';

const MyClass = Sigilify(class {}, 'MyClass');
```

Direct base-class extend:

```ts
import { Sigil, WithSigil } from '@vicin/sigil';

class MyClass extends Sigil {}
```

**Enforced contract.**
Once you opt into the runtime contract, Sigil enforces consistency: in DEV mode, extending a sigil-aware class without using decorator `@WithSigil` or a provided HOF (e.g. `withSigil` or `withSigilTyped`) will throw a helpful error. If you prefer a laxer setup, Sigil can be configured to auto-label or disable the strict enforcement.

Decorator style:

```ts
import { Sigil, WithSigil } from '@vicin/sigil';

@WithSigil('MyClass') // <-- Note `@WithSigil` used here cause it extended alreay sigilized class (Sigil). Error is thrown without it.
class MyClass extends Sigil {}
```

HOF (preferred for many workflows):

```ts
import { Sigil, withSigil } from '@vicin/sigil';

class _MyClass extends Sigil {}
const MyClass = withSigil(_MyClass, 'MyClass');
```

Recommendation:

- Use the decorator approach for a minimal, runtime-only fix for `instanceof`.
- Use the HOFs when you want better ergonomics or plan to opt into typed branding later.

#### Problem B — manual branding

**Sigil’s solution (typed chain).**
Runtime metadata alone does not change TypeScript types. To get compile-time nominal typing (so `UserId` ≠ `PostId` even with the same shape), Sigil provides typed HOFs that produce TypeScript-branded classes while preserving runtime metadata.

Example using a typed HOF:

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

// Untyped (runtime) base you extend as normal TS class code:
class _User extends Sigil {}

// Create a fully typed & runtime-safe class:
const User = withSigilTyped(_User, 'User');
type User = GetInstance<typeof User>;
```

With the typed HOF:

- The emitted runtime class still has sigil metadata (symbols, lineage).
- The TypeScript type for the class is narrowed to the `UserId` label at compile time. Assignments between different labels become type errors.

---

#### Why there are '\_Class' and 'Class'

The typed approach requires redefinition of public class, so you have:

- **Untyped class:** `_User` — regular class code used for inheritance and implementation.
- **Typed class:** `User` — the result of the typed HOF; this is the sigil-aware, branded class used by the rest of your codebase.

This separation is necessary as typescript decorators doesn't affect type system. so to reflect type update the class should be passed to HOF.

Example of approach for class chain:

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

// Untyped base classes used for implementation:
class _User extends Sigil {}

const User = withSigilTyped(_User, 'User');
type User = GetInstance<typeof User>;

class _Admin extends User {}

const Admin = withSigilTyped(_Admin, 'Admin');
type Admin = GetInstance<typeof Admin>;

// Type relationships:
type test1 = User extends Admin ? true : false; // false
type test2 = Admin extends User ? true : false; // true
```

This demonstrates:

- `Admin` is recognized as a subtype of `User` (both at runtime and in types) if it was created via the appropriate typed helpers.

---

#### SigilLabel & SigilType

If library is used with default options, `SigilLabel` & `SigilType` are **100% unique** for each class, which make them perfect replacement of manual labeling across your code that comes shipped with Sigil by default. you can access them in class constructor directly of via `getSigilLabel()` and `getSigilType()` in instances.

---

## Typing

In this part we will discuss conventions to avoid any type errors and have normal developing experience with just extra few definition lines at the bottom of the file.

---

### Typed vs Untyped classes

The update of Sigil brand types happens via HOF that are defined below actual class definition.

Example:

```ts
import { Sigil, withSigilTyped } from '@vicin/sigil';

class _X extends Sigil {
  // All logic for class
}

export const X = withSigilTyped(_X, 'Label.X'); // <-- Pass class with label to uniquely identify it from other classes
export type X = InstanceType<typeof X>; // alias to instance to avoid InstanceType<typeof X> everywhere
```

In other parts of the code:

```ts
import { X } from './example.ts';

class _Y extends X {
  // All logic as earlier
}

export const Y = withSigilTyped(_Y, 'Label.Y');
export type Y = InstanceType<typeof Y>;
```

So as we have seen nominal identity is introduced with few lines only below each class. and the bulk code where logic lives is untouched.

---

### `InstanceType<>` vs `GetInstance<>`

Earlier example used `InstanceType<>` to get instance of the class. It works well until class constructor is `protected` or `private` which cause it to return `any`.
So alternative in introduced which is `GetInstance`.

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

class _X extends Sigil {}

export const X = withSigilTyped(_X, 'Label.X');
export type X = GetInstance<typeof X>; // <-- Just replace 'InstanceType' here with 'GetInstance'
```

Internally `GetInstance` is just `T extends { prototype: infer R }` with appending new `__SIGIL_BRAND__` to it.

---

### Generic propagation

One of the downsides of defining typed class at the bottom is that we need to redefine generics as well in the type.

Example of generic propagation:

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

// Untyped base classes used for implementation:
class _X<G> extends Sigil {}

export const X = withSigilTyped(_X, 'Label.X');
export type X<G> = GetInstance<typeof X<G>>; // <-- Generics re-defined here, just copy-paste and pass them
```

---

### Anonymous classes

You may see error: `Property 'x' of exported anonymous class type may not be private or protected.`, although this is rare to occur.
This comes from the fact that all typed classes are `anonymous class` as they are return of HOF and ts compiler struggle to type them safely. to avoid these error entirely all you need is exporting the untyped classes even if they are un-used as a good convention.

```ts
import { Sigil, withSigilTyped, GetInstance } from '@vicin/sigil';

export class _X extends Sigil {} // <-- Just add 'export' here

export const X = withSigilTyped(_X, 'Label.X');
export type X = GetInstance<typeof X>;
```

---

## API reference

> The runtime API is intentionally small and focused. Types are exported for consumers that want to interact with compile-time helpers.

### Exports

Top-level exports from the library:

```ts
export { Sigil, SigilError } from './classes';
export { WithSigil } from './decorator';
export { typed, withSigil, withSigilTyped } from './enhancers';
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
  ISigilInstance,
  ISigilStatic,
  TypedSigil,
  GetInstance,
  SigilBrandOf,
  SigilOptions,
} from './types';
```

### Key helpers (runtime)

- `Sigil`: a minimal sigilified base class you can extend from.
- `SigilError`: an `Error` class decorated with a sigil so it can be identified at runtime.
- `WithSigil(label)`: class decorator that attaches sigil metadata at declaration time.
- `Sigilify(Base, label?, opts?)`: mixin function that returns a new constructor with sigil types and instance helpers.
- `withSigil(Class, label?, opts?)`: HOF that validates and decorates an existing class constructor.
- `withSigilTyped(Class, label?, opts?)`: like `withSigil` but narrows the TypeScript type to include brands.
- `typed(Class, label?, parent?)`: type-only narrowing helper (no runtime mutation) — asserts runtime label in DEV.
- `isSigilCtor(value)`: `true` if `value` is a sigil constructor.
- `isSigilInstance(value)`: `true` if `value` is an instance of a sigil constructor.
- `SigilRegistry`: `Sigil` Registy class used to centralize classes across app.
- `getActiveRegistry`: Getter of active registry being used by `Sigil`.
- `updateOptions(opts, mergeRegistries?)`: change global runtime options before sigil decoration (e.g., `autofillLabels`, `devMarker`, etc.).
- `DEFAULT_LABEL_REGEX`: regex that insures structure of `@scope/package.ClassName` to all labels, it's advised to use it as your `SigilOptions.labelValidation`

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
  devMarker: process.env.NODE_ENV !== 'production', // boolean used to block dev only checks in non-dev enviroments
  registry: new SigilRegistry(), // setting active registry used by 'Sigil'
  useGlobalRegistry: true, // append registry into 'globalThis' to insure single source in the runtime in cross bundles.
  storeConstructor: true, // store reference of the constructor in registry
});
```

Global options can be overridden per class by `opts` field in decorator and HOF.

**Notes**:

- It's advised to use `updateOptions({ labelValidation: DEFAULT_LABEL_REGEX })` at app entry point to validate labels against `@scope/package.ClassName` structure.
- `devMarker` drives DEV-only checks — when `false`, many runtime validations are no-ops (useful for production builds).
- `autofillLabels` is useful for some HMR/test setups where you prefer not to throw on collisions and want autogenerated labels.
- `skipLabelInheritanceCheck = true` can result on subtle bugs if enabled, so avoid setting it to true.
- When `SigilOptions.registry` is updated, old registry entries is merged and registered into new registry, to disable this behavrio pass `false` to `mergeRegistries` (`updateOptions({ registry: newRegistry }, false)`)
- `useGlobalRegistry` makes Sigil registry a central manager of classes and reliable way to enforce single label usage, so avoid setting it to `false` except if you have a strong reason. if you want to avoid making class constructor accessible via `globalThis` use `storeConstructor = true` instead.

---

## Registry

`Sigil` with default options forces devs to `SigilLabel` every class defined, that allows central class registery that store a reference for every class keyed by its label, also it prevent two classes in the codebase from having the same `SigilLabel`.

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

Before applying this change, for registry to function normally you should insure that `Sigil` is not bundles twice in your app.
however if you can't insure that only bundle of `Sigil` is used and don't want class constructors to be accessible globally do this:

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

Unfortunately concrete types of classes is not supported and all classes are stored as `ISigil` type. if you want concrete typings you can wrap registery:

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

No class constructors are stored globally and no code overhead, moreover if you can insure that `Sigil` is not bundles twice you can disable `useGlobalRegistry` and no trace of sigil in `globalThis`.

---

## Troubleshooting & FAQ

**Q: My `instanceof` checks fail across bundles — will Sigil fix this?**

A: Yes. Sigil uses `Symbol.for(label)` and runtime `SigilTypeSet` membership checks to provide stable identity tests that work across bundles/realms that share the global symbol registry.

**Q: I accidentally extended a sigilized class without decorating the subclass; I see an error in DEV. How should I fix it?**

A: Use `@WithSigil("@your/label")`, or wrap the subclass with `withSigil` / `withSigilTyped`. Alternatively, you can relax DEV checks using `updateOptions({ skipLabelInheritanceCheck: true })` but be cautious — this weakens guarantees.

**Q: I got this error: 'Property 'x' of exported anonymous class type may not be private or protected.', How to fix it?**

A: This error comes from the fact that all typed classes (return from `withSigil`, `withSigilTyped` or `typed`) are 'anonymous class' as they are the return of HOF. all you need to do is to export untyped classes (`_Class`) that have private or protected properties. or even export all untyped classes as a good convention even if they are not used.

**Q: I need nominal types in TypeScript. Which helper do I use?**

A: Use `withSigilTyped` to both attach runtime metadata and apply compile-time brands. If runtime metadata already exists and you only want to narrow types, use `typed(...)` (which is type-only but asserts the runtime label in DEV).

**Q: How do I inspect currently registered labels?**

A: Use `getActiveRegistry()?.list()` to get an array of registered labels.

**Q: What if i want to omit labeling in some classes while enforce others?**

A: You can set `SigilOptions.autofillLabels` to `true`. or if you more strict enviroment you can define empty `@WithSigil()` decorator above classes you don't care about labeling and `Sigil` will generate random label for it, but still throw if you forgot to use a decorator or HOF on a class.

---

## Best practices

- Prefer `withSigil`/`withSigilTyped` for predictable, explicit decoration.
- Keep labels globally unique and descriptive (including scope and package like `@myorg/mypkg.ClassName`).
- Use typed helpers for domain-level identities (IDs, tokens, domain types) so the compiler helps you avoid mistakes.
- Run with `devMarker` enabled during local development / CI to catch label collisions early.

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
