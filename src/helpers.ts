import { OPTIONS, type SigilOptions } from './options';
import { __LABEL__, __EFFECTIVE_LABEL__, __SIGIL__, __DEPTH__ } from './symbols';
import type { ISigil, ISigilInstance } from './types';

/** -----------------------------------------
 *  Constants
 * ----------------------------------------- */

/** Prefex use by the lib to identify auto-generated classes */
const AUTO_LABEL_PREFEX = '@Sigil-auto';

/** -----------------------------------------
 *  Weak maps
 * ----------------------------------------- */

/** Weak set to ensure that every ctor is handled only once. register both explicit and lazy handles */
const handledCtors = new WeakSet<Function>();

/** Weak set to ensure that every ctor is handled only once. register explicit handles only */
const handledCtorsExplicit = new WeakSet<Function>();

/** -----------------------------------------
 *  Main helpers
 * ----------------------------------------- */

/** Main function to handle 'Sigil' and attach its metadata to the class when label is passed */
export function handleSigilExplicit(ctor: Function, label: string, opts?: SigilOptions): void {
  // fast return if already defined
  if (handledCtorsExplicit.has(ctor))
    throw new Error(
      `[Sigil Error] Class '${ctor.name}' with label '${(ctor as any).SigilLabel}' is already sigilified`
    );
  // verify label
  verifyLabel(ctor, label, opts);
  // lazy evaluate ancestors
  handleAncestors(ctor, opts);
  // sigilify ctor
  sigilify(ctor, label, true);
}

/** Function to lazily evaluate 'Sigil' ( update with auto-generated metadata or throw ) */
export function handleSigilLazy(ctor: Function): void {
  // fast return if already handled
  if (handledCtors.has(ctor)) return;
  // if autofillLabels is set to false throw error
  if (!OPTIONS.autofillLabels)
    throw new Error(
      `[Sigil Error] Class '${ctor?.name}' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'`
    );
  // lazy evaluate ancestors
  handleAncestors(ctor);
  // sigilify ctor
  sigilify(ctor, generateRandomLabel(ctor), false);
}

/** -----------------------------------------
 *  Generic helpers
 * ----------------------------------------- */

function handleAncestors(ctor: Function, opts?: Pick<SigilOptions, 'autofillLabels'>): void {
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
  const autofillLabels = opts?.autofillLabels ?? OPTIONS.autofillLabels;
  for (const a of ancestors) {
    // get label
    const l = a.prototype[__LABEL__] as string;
    // if duplicate (no label is passed for this class) update class with new label
    if (labelOwner.has(l)) {
      if (!autofillLabels)
        throw new Error(
          `[Sigil Error] Class '${a.name}' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'`
        );
      sigilify(a, generateRandomLabel(a), false);
    }
    // register current label with class name
    labelOwner.set(a.prototype[__LABEL__], a.name);
  }
}

function sigilify(ctor: Function, label: string, explicit: boolean) {
  // -------------------------
  // Get symbol from label
  // -------------------------

  const sym = Symbol.for(label);

  // -------------------------
  // Populate 'Sigil' symbols
  // -------------------------

  Object.defineProperty(ctor.prototype, __SIGIL__, {
    value: sym,
    configurable: !explicit,
    enumerable: false,
    writable: false,
  });
  Object.defineProperty(ctor.prototype, __LABEL__, {
    value: label,
    configurable: !explicit,
    enumerable: false,
    writable: false,
  });
  if (explicit)
    Object.defineProperty(ctor.prototype, __EFFECTIVE_LABEL__, {
      value: label,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  if (!handledCtors.has(ctor))
    Object.defineProperty(ctor.prototype, __DEPTH__, {
      value: (ctor.prototype[__DEPTH__] ?? -1) + 1,
      configurable: false,
      enumerable: false,
      writable: false,
    });

  // -------------------------
  // Add { symbol: ture } pair
  // -------------------------

  Object.defineProperty(ctor.prototype, sym, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  // -------------------------
  // Mark as handled
  // -------------------------

  // mark as handled (explicit or lazy)
  handledCtors.add(ctor);
  // if explicit mark as handled explicit
  if (explicit) handledCtorsExplicit.add(ctor);
}

/** -----------------------------------------
 *  Inspection helpers
 * ----------------------------------------- */

/**
 * Runtime predicate that checks whether the provided value is a sigil constructor.
 *
 * @param ctor - Constructor to test.
 * @returns `true` if `value` is a sigil constructor, otherwise `false`.
 */
export function isSigilCtor(ctor: unknown): ctor is ISigil {
  return typeof ctor === 'function' && ctor.prototype && __SIGIL__ in ctor.prototype;
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

/**
 * Helper function to get labels registered by 'Sigil'
 * @returns Sigil labels registered
 */
export function getSigilLabels(): string[] {
  return getLabelRegistry().labels();
}

/** -----------------------------------------
 *  Label helpers
 * ----------------------------------------- */

/** Exposed methods of global label registry */
interface LabelRegistry {
  has: (label: string) => boolean;
  add: (label: string) => void;
  labels: () => string[];
  enc: () => number;
}

/** Internal helper to get (or init then get) global label registry */
function getLabelRegistry(): LabelRegistry {
  if ('__labelRegistry__' in globalThis) return (globalThis as any).__labelRegistry__;

  const labelSet = new Set<string>();
  let count = 0;

  const labelRegistry: LabelRegistry = {
    has: (label: string) => labelSet.has(label),
    add: (label: string) => labelSet.add(label),
    labels: () => [...labelSet],
    enc: () => ++count,
  };

  Object.freeze(labelRegistry);

  Object.defineProperty(globalThis, '__labelRegistry__', {
    value: labelRegistry,
    writable: false,
    configurable: false,
    enumerable: false,
  });

  return labelRegistry;
}

/** Internal helper to validate passed label */
function verifyLabel<L extends string>(ctor: Function, label: L, opts?: SigilOptions): void {
  // get label registry
  const reg = getLabelRegistry();

  // If label starts with '@Sigil-auto:' throw error
  if (label.startsWith(AUTO_LABEL_PREFEX))
    throw new Error(`'${AUTO_LABEL_PREFEX}' is a prefex reserved by the library`);

  // If label is duplicate throw error
  if (!(opts?.skipLabelUniquenessCheck ?? OPTIONS.skipLabelUniquenessCheck) && reg.has(label))
    throw new Error(
      `[Sigil Error] Passed label '${label}' to class '${ctor?.name}' is re-used, passed labels must be unique`
    );

  // If validation regex or function is defined validate
  const labelValidation = opts?.labelValidation ?? OPTIONS.labelValidation;
  if (labelValidation) {
    let valid: boolean;
    if (labelValidation instanceof RegExp) valid = labelValidation.test(label);
    else valid = labelValidation(label);

    if (!valid)
      throw new Error(
        `[Sigil Error] Invalid Sigil label '${label}'. Make sure that supplied label matches validation regex or function`
      );
  }

  // Add label to registry
  reg.add(label);
}

/** Internal helper to generate random label */
function generateRandomLabel(ctor: Function): string {
  return `${AUTO_LABEL_PREFEX}:${ctor?.name}:${getLabelRegistry().enc()}:${Math.random().toString(36).slice(2, 10)}`;
}
