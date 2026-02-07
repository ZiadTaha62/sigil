import { OPTIONS, type SigilOptions } from './options';
import { REGISTRY } from './registry';
import {
  __DECORATED__,
  __INHERITANCE_CHECKED__,
  __LABEL__,
  __SIGIL_BASE__,
  __SIGIL__,
  __TYPE_LINEAGE__,
  __TYPE_SET__,
  __TYPE__,
} from './symbols';
import type { ISigil, ISigilInstance } from './types';

/** -----------------------------------------
 *  High level helpers
 * ----------------------------------------- */

/**
 * Attach sigil-related statics to a constructor and register its label.
 *
 * Side effects:
 * - Registers `label` in the global registry via `REGISTRY.register(label)`.
 * - Defines non-enumerable statics on the constructor:
 *   - `__LABEL__` (string)
 *   - `__TYPE__` (Symbol.for(label))
 *   - `__TYPE_LINEAGE__` (array of symbols)
 *   - `__TYPE_SET__` (Set of symbols)
 * - Marks the constructor as decorated via `markDecorated`.
 *
 * Throws if the constructor is already decorated.
 *
 * @internal
 * @param ctor - The constructor to decorate.
 * @param label - The identity label to register and attach (e.g. '@scope/pkg.ClassName').
 * @param opts - Options object to override any global options if needed.
 * @throws Error when `ctor` is already decorated.
 */
export function decorateCtor(ctor: Function, label: string) {
  // if already decorated throw error
  if (isDecorated(ctor))
    throw new Error(
      `Constructor ${ctor} is already decorated. if you are using 'withSigilTyped()' & '@WithSigil()' at the same time remove one of them.`
    );

  // get symbol for the label and update registry
  const symbol = Symbol.for(label);
  REGISTRY.register(label, ctor as ISigil);

  // attach basic runtime statics
  Object.defineProperty(ctor, __LABEL__, {
    value: label,
    configurable: false,
    enumerable: false,
    writable: false,
  });
  Object.defineProperty(ctor, __TYPE__, {
    value: symbol,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  // compute type chain from parent (safe if parent hasn't been augmented yet — uses existing value or empty)
  const parent = Object.getPrototypeOf(ctor);
  const parentChain =
    parent && parent[__TYPE_LINEAGE__] ? parent[__TYPE_LINEAGE__] : [];
  const ctorChain = [...parentChain, symbol];
  Object.defineProperty(ctor, __TYPE_LINEAGE__, {
    value: ctorChain,
    configurable: false,
    enumerable: false,
    writable: false,
  });
  Object.defineProperty(ctor, __TYPE_SET__, {
    value: new Set(ctorChain),
    configurable: false,
    enumerable: false,
    writable: false,
  });

  // mark as decorated
  markDecorated(ctor);
}

/**
 * Perform development-only inheritance checks to ensure no ancestor classes
 * reuse the same sigil label.
 *
 * Behavior:
 * - No-op if `ctor` is not a sigil constructor.
 * - No-op in non-DEV builds.
 * - No-op if inheritance checks were already performed or `OPTIONS.skipLabelInheritanceCheck` is true.
 *
 * When a duplicate label is detected:
 * - If the class is explicitly decorated (`isDecorated`) or `OPTIONS.autofillLabels` is false,
 *   an Error is thrown describing the label collision.
 * - Otherwise (autofill enabled), a random label will be generated and assigned
 *   to the offending constructor via `decorateCtor`.
 *
 * @internal
 * @param ctor - The constructor to validate.
 * @param opts - Options object to override any global options if needed.
 * @throws Error when a decorated subclass re-uses an ancestor's sigil label.
 */
export function checkInheritance(
  ctor: Function,
  opts?: Pick<
    SigilOptions,
    'skipLabelInheritanceCheck' | 'autofillLabels' | 'devMarker'
  >
) {
  if (!(opts?.devMarker ?? OPTIONS.devMarker)) return;
  if (!isSigilCtor(ctor)) return;
  if (
    isInheritanceChecked(ctor) ||
    (opts?.skipLabelInheritanceCheck ?? OPTIONS.skipLabelInheritanceCheck)
  )
    return;

  /** Array of all sigil constructors in the chain (starting with the provided ctor) */
  const ctors: ISigil[] = [ctor];

  // go through prototype chain to get all sigil ancestors
  let ancestor: any = Object.getPrototypeOf(ctor);
  while (isSigilCtor(ancestor)) {
    ctors.push(ancestor);
    ancestor = Object.getPrototypeOf(ancestor);
  }

  /** Map<label, className> to record the owner of each label. */
  const labelOwner = new Map<string, string>();

  // loop ctors from base to current and make sure no label is reused
  for (let i = ctors.length - 1; i >= 0; i--) {
    const ctor = ctors[i];
    if (!ctor) continue;
    let label = ctor.SigilLabel;
    if (labelOwner.has(label)) {
      if (
        isDecorated(ctor) ||
        !(opts?.autofillLabels ?? OPTIONS.autofillLabels)
      ) {
        const ancestorName = labelOwner.get(label);
        throw new Error(
          `[Sigil Error] Class "${ctor.name}" re-uses Sigil label "${label}" from ancestor "${ancestorName}". ` +
            `Each Sigil subclass must use a unique label. Did you forget to use "WithSigil(newLabel)" on the subclass?`
        );
      }
      label = generateRandomLabel();
      decorateCtor(ctor, label);
    }
    labelOwner.set(label, ctor.name);
  }
  markInheritanceChecked(ctor);
}

/**
 * Validate a sigil label at runtime and throw a helpful error if it is malformed.
 *
 * This is intentionally `void` and runs synchronously at class declaration time so
 * invalid labels fail fast during development. Validation behavior follows `OPTIONS.labelValidation`:
 * - If `OPTIONS.labelValidation` is `null` no validation is performed.
 * - If it is a `RegExp`, the label must match the regex.
 * - If it is a function, the function must return `true` for the label to be considered valid.
 *
 * @internal
 * @typeParam L - Label string literal type.
 * @param label - The label to validate.
 * @param opts - Options object to override any global options if needed.
 * @throws {Error} Throws when the label does not pass configured validation.
 */
export function verifyLabel<L extends string>(
  label: L,
  opts?: Pick<SigilOptions, 'labelValidation'>
): void {
  const labelValidation = opts?.labelValidation ?? OPTIONS.labelValidation;

  if (labelValidation) {
    let valid: boolean;
    if (labelValidation instanceof RegExp) valid = labelValidation.test(label);
    else valid = labelValidation(label);

    if (!valid)
      throw new Error(
        `[Sigil] Invalid identity label "${label}". Make sure that supplied label matches validation regex or function.`
      );
  }
}

/**
 * Generate a random alphanumeric label of the requested length.
 *
 * This is used to auto-generate labels when `OPTIONS.autofillLabels` is enabled.
 * It insures that generated label is not registered yet.
 *
 * @internal
 * @param length - Desired length of the generated string (defaults to 16).
 * @returns A random label.
 */
export function generateRandomLabel(length = 16): string {
  let label = generateRandomString(length);
  while (REGISTRY.has(label)) label = generateRandomLabel();
  return `@Sigil.auto-${label}`;
}

/** -----------------------------------------
 *  Introspection helpers
 * ----------------------------------------- */

/**
 * Mark a constructor as a sigil constructor by attaching an internal symbol.
 *
 * This function defines a non-enumerable, non-writable, non-configurable
 * property on the constructor so subsequent checks can detect sigil
 * constructors.
 *
 * @internal
 * @param ctor - The constructor to mark.
 */
export function markSigil(ctor: Function) {
  Object.defineProperty(ctor, __SIGIL__, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}

/**
 * Mark a constructor as a "sigil base" constructor.
 *
 * A sigil base constructor indicates that the class is the base for
 * other sigil classes. This writes a stable, non-enumerable property
 * to the constructor.
 *
 * @internal
 * @param ctor - The constructor to mark as sigil base.
 */
export function markSigilBase(ctor: Function) {
  Object.defineProperty(ctor, __SIGIL_BASE__, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}

/**
 * Mark a constructor as having been decorated with `WithSigil`.
 *
 * This is used to detect classes that were explicitly decorated rather
 * than auto-filled by the library.
 *
 * @internal
 * @param ctor - The constructor that was decorated.
 */
export function markDecorated(ctor: Function) {
  Object.defineProperty(ctor, __DECORATED__, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}

/**
 * Mark that inheritance checks for this constructor have already been performed.
 *
 * The library uses this to avoid repeating expensive inheritance validation
 * during development.
 *
 * @internal
 * @param ctor - The constructor that has been checked.
 */
export function markInheritanceChecked(ctor: Function) {
  Object.defineProperty(ctor, __INHERITANCE_CHECKED__, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}

/**
 * Runtime predicate that checks whether the provided value is a sigil constructor.
 *
 * This is a lightweight check that verifies the presence of an internal
 * symbol attached to the constructor.
 *
 * @param value - Value to test.
 * @returns `true` if `value` is a sigil constructor, otherwise `false`.
 */
export function isSigilCtor(value: unknown): value is ISigil {
  return typeof value === 'function' && (value as any)[__SIGIL__] === true;
}

/**
 * Runtime predicate that checks whether the provided object is an instance
 * of a sigil class.
 *
 * The function is defensive: non-objects return `false`. If an object is
 * passed, the object's constructor is resolved and tested with `isSigilCtor`.
 *
 * @param obj - The value to test.
 * @returns `true` if `obj` is an instance produced by a sigil constructor.
 */
export function isSigilInstance(obj: unknown): obj is ISigilInstance {
  if (!obj || typeof obj !== 'object') return false;
  const ctor = getConstructor(obj);
  return isSigilCtor(ctor);
}

/**
 * Check whether the provided constructor was marked as a sigil base constructor.
 *
 * Uses `Object.hasOwn` to ensure we only check own properties.
 *
 * @param ctor - Constructor to check.
 * @returns `true` if `ctor` is a sigil base constructor.
 */
export function isSigilBaseCtor(ctor: Function): boolean {
  return Object.hasOwn(ctor, __SIGIL_BASE__);
}

/**
 * Check whether the provided object is an instance of a sigil base constructor.
 *
 * This resolves the object's constructor and delegates to `isSigilBaseCtor`.
 *
 * @param obj - The object to test.
 * @returns `true` if `obj` is an instance of a sigil base constructor.
 */
export function isSigilBaseInstance(obj: unknown): obj is ISigilInstance {
  if (!obj || typeof obj !== 'object') return false;
  const ctor = getConstructor(obj);
  return isSigilBaseCtor(ctor);
}

/**
 * Returns whether the constructor has been explicitly decorated with `WithSigil`.
 *
 * This is an own-property check and does not traverse the prototype chain.
 *
 * @internal
 * @param ctor - Constructor to test.
 * @returns `true` if the constructor is explicitly decorated.
 */
export function isDecorated(ctor: Function): boolean {
  return Object.hasOwn(ctor, __DECORATED__);
}

/**
 * Returns whether inheritance checks have already been performed for the constructor.
 *
 * This is used to avoid repeated checks during development (DEV-only checks).
 *
 * @internal
 * @param ctor - Constructor to test.
 * @returns `true` if inheritance checks were marked as completed.
 */
export function isInheritanceChecked(ctor: Function): boolean {
  return Object.hasOwn(ctor, __INHERITANCE_CHECKED__);
}

/** -----------------------------------------
 *  Generic helpers
 * ----------------------------------------- */

/**
 * Retrieve the constructor function for a given instance.
 *
 * Returns `null` for non-objects or when a constructor cannot be resolved.
 *
 * @internal
 * @param obj - The value that may be an instance whose constructor should be returned.
 * @returns The constructor function or `null` if not available.
 */
export function getConstructor(obj: any) {
  if (!obj || typeof obj !== 'object') return null;
  return obj.constructor ?? Object.getPrototypeOf(obj)?.constructor ?? null;
}

/**
 * Generate a random alphanumeric string of the requested length.
 *
 * @internal
 * @param length - Desired length of the generated string (defaults to 16).
 * @returns A random string consisting of upper/lower letters and digits.
 */
function generateRandomString(length = 16) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}
