import {
  checkInheritance,
  decorateCtor,
  generateRandomLabel,
  isSigilCtor,
  verifyLabel,
} from './helpers';
import type { SigilOptions } from './options';

/**
 * HOF (class inhancer) that attaches runtime sigil metadata to Sigil class.
 * Alternative to '@WithSigil' if you prefer HOFs.
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
