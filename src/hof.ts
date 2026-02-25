import { handleSigil, isSigilCtor, hasOwnSigil } from './helpers';
import type { SigilOptions } from './options';

/**
 * HOF (class inhancer) that attaches runtime sigil metadata to Sigil class.
 * Alternative to '@WithSigil' if you prefer HOFs.
 *
 * @typeParam S - Constructor type (should be an instance of sigil class).
 * @param Class - The constructor (class) to enhance.
 * @param label - Sigil label string to assign to the decorated class (e.g. `@scope/pkg.ClassName`).
 * @param opts - Options object to override any global options if needed.
 * @returns The same constructor value, with runtime metadata ensured.
 */
export function withSigil<S extends Function>(Class: S, label: string, opts?: SigilOptions): S {
  if (!isSigilCtor(Class))
    throw new Error(
      `[Sigil Error] 'withSigil' HOF accept only Sigil classes  but used on class ${Class?.name ?? 'unknown'}`
    );
  if (hasOwnSigil(Class))
    throw new Error(
      `[Sigil Error] Class '${Class.name}' with label '${Class.SigilLabel}' is already sigilified`
    );

  handleSigil(Class, label, opts);
  return Class;
}
