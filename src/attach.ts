import { handleSigilExplicit, isSigilCtor } from './helpers';
import type { SigilOptions } from './options';

/**
 * Class decorator factory that attaches sigil statics to a class constructor.
 *
 * @param label - Sigil label string to assign to the decorated class (e.g. `@scope/pkg.ClassName`).
 * @param opts - Options object to override any global options if needed.
 * @returns A class decorator compatible with the ECMAScript decorator context.
 */
export function AttachSigil(label: string, opts?: SigilOptions) {
  return function (value: Function, context: any) {
    if (!isSigilCtor(value))
      throw new Error(
        `[Sigil Error] 'AttachSigil' decorator accept only Sigil classes but used on class '${value.name}'`
      );

    handleSigilExplicit(value, label, opts);
  };
}

/**
 * @deprecated Use 'AttachSigil' instead, updated for clarity. will be removed in v4
 */
export const WithSigil = AttachSigil;

/**
 * Function that attaches runtime sigil metadata to Sigil class.
 * Alternative to '@AttachSigil' if you prefer normal functions.
 *
 * @typeParam S - Constructor type (should be an instance of sigil class).
 * @param Class - The constructor (class) to enhance.
 * @param label - Sigil label string to assign to the decorated class (e.g. `@scope/pkg.ClassName`).
 * @param opts - Options object to override any global options if needed.
 * @returns The same constructor value, with runtime metadata ensured.
 */
export function attachSigil<S extends Function>(Class: S, label: string, opts?: SigilOptions): S {
  if (!isSigilCtor(Class))
    throw new Error(
      `[Sigil Error] 'attachSigil' function accept only Sigil classes but used on class '${Class.name}'`
    );

  handleSigilExplicit(Class, label, opts);
  return Class;
}

/**
 * @deprecated Use 'attachSigil' instead, updated for clarity. will be removed in v4
 */
export const withSigil = attachSigil;
