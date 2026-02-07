import {
  checkInheritance,
  decorateCtor,
  generateRandomLabel,
  isSigilCtor,
  verifyLabel,
} from './helpers';
import { OPTIONS, type SigilOptions } from './options';
import type { TypedSigil } from './types';

/**
 * HOF (class inhancer) that attaches runtime sigil metadata to Sigil class.
 * Alternative to '@WithSigil' if you prefer HOFs.
 *
 * This does both:
 *  - validate (and autofill) a label,
 *  - perform runtime decoration (via `decorateCtor`),
 *
 * The helper is idempotent: `decorateCtor` will register the label and throw if already
 * decorated; we handle this gracefully in DEV to support HMR flows.
 *
 * @typeParam S - Constructor type (should be an ISigil).
 * @typeParam L - Label literal to attach.
 * @param Class - The constructor (class) to enhance.
 * @param label - Optional label string. If omitted, a random label is generated.
 * @param opts - Options object to override any global options if needed.
 * @returns The same constructor value, with runtime metadata ensured.
 */
export function withSigil<S extends Function, L extends string = string>(
  Class: S,
  label?: L,
  opts?: SigilOptions
): S {
  if (!isSigilCtor(Class))
    throw new Error(
      `[Sigil Error] 'withSigil' HOF accept only Sigil classes  but used on class ${Class?.name ?? 'unknown'}`
    );

  // generate random label if not passed and verify it
  let l: string;
  if (label) {
    verifyLabel(label, opts);
    l = label;
  } else l = generateRandomLabel();

  // decorate and check inheritance.
  const ctor = Class;
  decorateCtor(ctor, l);
  checkInheritance(ctor, opts);

  return Class;
}

/**
 * Narrow a constructor to a compile-time `TypedSigil` without modifying runtime.
 *
 * This is a *purely type-level* helper (no runtime changes). It optionally
 * verifies in DEV that the runtime `SigilLabel` matches the provided `label`.
 *
 * Use this when the runtime metadata is already present (for example the class
 * is already decorated or was created via `Sigilify`).
 *
 * @typeParam S - Constructor type (should be an ISigil).
 * @typeParam L - Label literal to associate at compile-time.
 * @param Class - The constructor to assert as typed sigil.
 * @param label - Optional label literal to assert at compile-time (and to verify in DEV).
 * @returns The same constructor value, typed as `TypedSigil<S, L, P>`.
 */
export function typed<S extends Function, L extends string = string>(
  Class: S,
  label?: L,
  opts?: Pick<SigilOptions, 'devMarker'>
): TypedSigil<S, L> {
  if (!isSigilCtor(Class))
    throw new Error(
      `[Sigil Error] 'typed' HOF accept only Sigil classes but used on class ${Class?.name ?? 'unknown'}`
    );

  if ((opts?.devMarker ?? OPTIONS.devMarker) && label) {
    const runtimeLabel = Class.SigilLabel;
    if (runtimeLabel && runtimeLabel !== label) {
      // Runtime label mismatch — surfaced in DEV only
      throw new Error(
        `[Sigil Error][typed] runtime label "${runtimeLabel}" does not match asserted label "${label}".`
      );
    }
  }
  return Class as TypedSigil<S, L>;
}

/**
 * Convenience helper that combine 'withSigil' and 'typeSigil'.
 *
 * This does both:
 *  - validate (and autofill) a label,
 *  - perform runtime decoration (via `decorateCtor`),
 *  - return the constructor typed as `TypedSigil`.
 *
 * The helper is idempotent: `decorateCtor` will register the label and throw if already
 * decorated; we handle this gracefully in DEV to support HMR flows.
 *
 * @typeParam S - Constructor type (should be an ISigil).
 * @typeParam L - Label literal to attach.
 * @param Class - The constructor (class) to decorate and type.
 * @param label - Optional label string. If omitted, a random label is generated.
 * @param parent - Optional parent sigil constructor (type-only).
 * @param opts - Options object to override any global options if needed.
 * @returns The same constructor value, with runtime metadata ensured and typed as `TypedSigil<S,L,P>`.
 */
export function withSigilTyped<S extends Function, L extends string = string>(
  Class: S,
  label?: L,
  opts?: SigilOptions
): TypedSigil<S, L> {
  if (!isSigilCtor(Class))
    throw new Error(
      `[Sigil Error] 'withSigilTyped' HOF accept only Sigil classes but used on class ${Class?.name ?? 'unknown'}`
    );

  // generate random label if not passed and verify it
  let l: string;
  if (label) {
    verifyLabel(label, opts);
    l = label;
  } else l = generateRandomLabel();

  // decorate and check inheritance.
  const ctor = Class;
  decorateCtor(ctor, l);
  checkInheritance(ctor, opts);

  return Class as TypedSigil<S, L>;
}
