import { OPTIONS, type SigilOptions } from './options';
import { __LABEL__, __EFFECTIVE_LABEL__, __SIGIL__, __LINEAGE__ } from './symbols';
import type { ISigil, ISigilInstance } from './types';

/** Prefex use by the lib to identify auto-generated classes */
const AUTO_LABEL_PREFEX = '@Sigil-auto';

/** -----------------------------------------
 *  Main helper
 * ----------------------------------------- */

/** Weak set to ensure that every ctor is handled only once. */
const handledCtors = new WeakSet<Function>();

/** Main function to handle 'Sigil' and attach its metadata to the class */
export function handleSigil(ctor: Function, label?: string, opts?: SigilOptions) {
  // fast return if already defined
  if (handledCtors.has(ctor)) return;
  handledCtors.add(ctor);

  // Verify label
  verifyLabel(ctor, label, opts);

  // check ancestors to ensure that every label in sigil chain in unique
  const ancLabelsMap = handleAncestors(ctor, opts);

  // make sure that newly passed label is unique as well
  if (label && ancLabelsMap.has(label))
    throw new Error(
      `[Sigil Error] Attempt to assign label '${label}' to ${ctor.name} but label is already used by parent '${ancLabelsMap.get(label)}', Make sure that every class has a unique label`
    );

  // handle current class
  sigilify(ctor, label ?? generateRandomLabel(ctor));
}

/** -----------------------------------------
 *  Generic helpers
 * ----------------------------------------- */

function handleAncestors(ctor: Function, opts?: SigilOptions): Map<string, string> {
  // handle options
  const autofillLabels = opts?.autofillLabels ?? OPTIONS.autofillLabels;

  // get line age of this class (ancestors only)
  const ancestors: Function[] = [];
  let a = Object.getPrototypeOf(ctor);
  while (a && typeof a === 'function' && a.prototype[__SIGIL__]) {
    ancestors.unshift(a);
    a = Object.getPrototypeOf(a);
  }

  /** Map<label, className> to record the owner of each label. */
  const labelOwner = new Map<string, string>();

  // loop lineage to insure that each label is unique in ancestors
  for (const a of ancestors) {
    // get label
    const l = a.prototype[__LABEL__] as string;
    // if duplicate (no label is passed for this class) update class with new label
    if (labelOwner.has(l)) {
      if (!autofillLabels)
        throw new Error(
          `[Sigil Error] Class '${a.name}' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'`
        );
      sigilify(a, generateRandomLabel(a));
    }
    // register current label with class name
    labelOwner.set(labelOf(a)!, a.name);
  }

  return labelOwner;
}

function sigilify(ctor: Function, label: string) {
  const sym = Symbol.for(label);
  Object.defineProperty(ctor.prototype, __SIGIL__, {
    value: sym,
    configurable: false,
    enumerable: false,
    writable: false,
  });
  Object.defineProperty(ctor.prototype, sym, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
  Object.defineProperty(ctor.prototype, __LABEL__, {
    value: label,
    configurable: false,
    enumerable: false,
    writable: false,
  });
  if (!label.startsWith(AUTO_LABEL_PREFEX))
    Object.defineProperty(ctor.prototype, __EFFECTIVE_LABEL__, {
      value: label,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  Object.defineProperty(ctor.prototype, __LINEAGE__, {
    value: new Set(['Sigil', ...(lineageOf(ctor) ?? []), label]),
    configurable: false,
    enumerable: false,
    writable: false,
  });
  // add { Symbol.for('Sigil'): true } if not present
  const sigilSym = Symbol.for('Sigil');
  if (ctor.prototype[sigilSym] !== true)
    Object.defineProperty(ctor.prototype, sigilSym, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false,
    });
}

/** -----------------------------------------
 *  Introspection helpers
 * ----------------------------------------- */

/**
 * Runtime predicate that checks whether the provided value is a sigil constructor.
 *
 * @param ctor - Constructor to test.
 * @returns `true` if `value` is a sigil constructor, otherwise `false`.
 */
export function isSigilCtor(ctor: unknown): ctor is ISigil {
  return typeof ctor === 'function' && __SIGIL__ in ctor.prototype;
}

/**
 * Runtime predicate that checks whether the provided object is an instance
 * of a sigil class.
 *
 * @param inst - The instanca to test.
 * @returns `true` if `obj` is an instance produced by a sigil constructor.
 */
export function isSigilInstance(inst: unknown): inst is ISigilInstance {
  return !!inst && typeof inst === 'object' && __SIGIL__ in inst;
}

export function hasOwnSigil(ctor: Function): ctor is ISigil {
  return typeof ctor === 'function' && Object.hasOwn(ctor.prototype, __SIGIL__);
}

function labelOf(ctor: Function): string | undefined {
  return ctor.prototype[__LABEL__];
}

function lineageOf(ctor: Function): Set<string> | undefined {
  return ctor.prototype[__LINEAGE__];
}

/** -----------------------------------------
 *  Label helpers
 * ----------------------------------------- */

function verifyLabel<L extends string>(ctor: Function, label?: L, opts?: SigilOptions): void {
  // handle option
  const labelValidation = opts?.labelValidation ?? OPTIONS.labelValidation;
  const autofillLabels = opts?.autofillLabels ?? OPTIONS.autofillLabels;

  if (!label) {
    if (!autofillLabels)
      throw new Error(
        `[Sigil Error] Class '${ctor.name}' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'`
      );
    return;
  }

  if (label.startsWith(AUTO_LABEL_PREFEX))
    throw new Error(`'${AUTO_LABEL_PREFEX}' is a prefex reserved by the library`);

  if (labelValidation) {
    let valid: boolean;
    if (labelValidation instanceof RegExp) valid = labelValidation.test(label);
    else valid = labelValidation(label);

    if (process.env.NODE_ENV !== 'production')
      if (!valid)
        throw new Error(
          `[Sigil Error] Invalid identity label "${label}". Make sure that supplied label matches validation regex or function`
        );
  }
}

if (!(globalThis as any).__SigilabelCounter) (globalThis as any).__SigilabelCounter = 0;

function generateRandomLabel(ctor: Function): string {
  const namePart = ctor && typeof ctor.name === 'string' && ctor.name.length ? ctor.name : 'C';

  const counter = (globalThis as any).__SigilabelCounter++;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);

  return `${AUTO_LABEL_PREFEX}:${namePart}:${time}:${counter.toString(36)}:${rand}`;
}
