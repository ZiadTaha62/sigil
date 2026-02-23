import { OPTIONS, type SigilOptions } from './options';
import {
  __DECORATED__,
  __INHERITANCE_CHECKED__,
  __LABEL__,
  __EFFECTIVE_LABEL__,
  __SIGIL_BASE__,
  __SIGIL__,
  __LABEL_LINEAGE__,
  __LABEL_SET__,
} from './symbols';
import type { ISigil, GetInstance } from './types';
import { createId } from '@paralleldrive/cuid2';

/** -----------------------------------------
 *  High level helpers
 * ----------------------------------------- */

/**
 * Attach sigil-related statics to a constructor and register its label.
 *
 * Side effects:
 * - Defines non-enumerable statics on the constructor:
 *   - `__LABEL__` (string)
 *   - `__LABEL_LINEAGE__` (array of strings)
 *   - `__LABEL_SET__` (Set of strings)
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
export function decorateCtor(
  ctor: Function,
  label: string,
  runtime?: { isInheritanceCheck?: boolean; isMixin?: boolean }
) {
  // if already decorated throw error
  if (process.env.NODE_ENV !== 'production')
    if (isDecorated(ctor))
      throw new Error(
        `Constructor ${ctor} is already decorated. if you are using 'withSigilTyped()' & '@WithSigil()' at the same time remove one of them.`
      );

  // attach basic runtime statics
  Object.defineProperty(ctor, __LABEL__, {
    value: label,
    configurable: true,
    enumerable: false,
    writable: false,
  });
  if (!runtime?.isInheritanceCheck)
    Object.defineProperty(ctor, __EFFECTIVE_LABEL__, {
      value: label,
      configurable: true,
      enumerable: false,
      writable: false,
    });

  // get parent chain (safe if parent hasn't been augmented yet — uses existing value or empty)
  const parent = Object.getPrototypeOf(ctor);
  const parentChain = parent && parent[__LABEL_LINEAGE__] ? parent[__LABEL_LINEAGE__] : [];

  // generate Ctor chain, if mixin (Sigilify function) then append 'Sigil' at the start
  const ctorChain =
    runtime?.isMixin && label !== 'Sigil'
      ? ['Sigil', ...parentChain, label]
      : [...parentChain, label];

  // attach symbol lineage and set
  Object.defineProperty(ctor, __LABEL_LINEAGE__, {
    value: ctorChain,
    configurable: true,
    enumerable: false,
    writable: false,
  });
  Object.defineProperty(ctor, __LABEL_SET__, {
    value: new Set(ctorChain),
    configurable: true,
    enumerable: false,
    writable: false,
  });

  // mark as decorated
  if (!runtime?.isInheritanceCheck) markDecorated(ctor);
}

/**
 * Perform inheritance checks to ensure no ancestor classes reuse the same sigil label.
 *
 * Behavior:
 * - No-op if `ctor` is not a sigil constructor.
 * - No-op if inheritance checks were already performed.
 * - No-op if `OPTIONS.skipLabelInheritanceCheck` is set to true.
 *
 * When a duplicate label is detected:
 * - If the class is explicitly decorated (`isDecorated`) or `OPTIONS.autofillLabels` is false, And in
 *   development build, an Error is thrown describing the label collision.
 * - Otherwise, a random label will be generated and assigned to the offending constructor via `decorateCtor`.
 *
 * @internal
 * @param ctor - The constructor to validate.
 * @param opts - Options object to override any global options if needed.
 * @throws Error when a decorated subclass re-uses an ancestor's sigil label in development builds only.
 */
export function checkInheritance(
  ctor: ISigil,
  opts?: Pick<SigilOptions, 'skipLabelInheritanceCheck' | 'autofillLabels'>
) {
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
    let label = (ctor as any)[__LABEL__];
    if (labelOwner.has(label)) {
      if (process.env.NODE_ENV !== 'production')
        if (isDecorated(ctor) || !(opts?.autofillLabels ?? OPTIONS.autofillLabels))
          throw new Error(
            `[Sigil Error] Class "${ctor.name}" re-uses Sigil label "${label}" from ancestor "${labelOwner.get(label)}". ` +
              `Each Sigil subclass must use a unique label. Did you forget to use "WithSigil(newLabel)" on the subclass?`
          );

      label = generateRandomLabel();
      decorateCtor(ctor, label, { isInheritanceCheck: true });
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

    if (process.env.NODE_ENV !== 'production')
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
export function generateRandomLabel(): string {
  let label = createId();
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
 * @param ctor - Constructor to test.
 * @returns `true` if `value` is a sigil constructor, otherwise `false`.
 */
export function isSigilCtor(ctor: unknown): ctor is ISigil {
  return typeof ctor === 'function' && (ctor as any)[__SIGIL__] === true;
}

/**
 * Runtime predicate that checks whether the provided object is an instance
 * of a sigil class.
 *
 * @param inst - The instanca to test.
 * @returns `true` if `obj` is an instance produced by a sigil constructor.
 */
export function isSigilInstance(inst: unknown): inst is GetInstance<ISigil> {
  if (!inst || typeof inst !== 'object') return false;
  const ctor = getConstructor(inst);
  return isSigilCtor(ctor);
}

/**
 * Check whether the provided constructor was marked as a sigil base constructor.
 *
 * @param ctor - Constructor to check.
 * @returns `true` if `ctor` is a sigil base constructor.
 */
export function isSigilBaseCtor(ctor: Function): ctor is ISigil {
  return Object.hasOwn(ctor, __SIGIL_BASE__);
}

/**
 * Check whether the provided object is an instance of a sigil base constructor.
 *
 * @param inst - The instance to test.
 * @returns `true` if `inst` is an instance of a sigil base constructor.
 */
export function isSigilBaseInstance(inst: unknown): inst is GetInstance<ISigil> {
  if (!inst || typeof inst !== 'object') return false;
  const ctor = getConstructor(inst);
  return isSigilBaseCtor(ctor);
}

/**
 * Returns whether the constructor has been explicitly decorated with `WithSigil`.
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
