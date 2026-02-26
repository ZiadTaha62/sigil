import { handleSigil, hasOwnSigil, isSigilCtor } from './helpers';
import type { SigilOptions } from './options';

/**
 * Class decorator factory that attaches sigil statics to a class constructor.
 *
 * @param label - Sigil label string to assign to the decorated class (e.g. `@scope/pkg.ClassName`).
 * @param opts - Options object to override any global options if needed.
 * @returns A class decorator compatible with the ECMAScript decorator context.
 */
export function WithSigil(label: string, opts?: SigilOptions) {
  return function (value: Function, context: any) {
    if (!isSigilCtor(value))
      throw new Error(
        `[Sigil Error] 'WithSigil' decorator accept only Sigil classes but used on class '${value.name}'`
      );
    if (hasOwnSigil(value))
      throw new Error(
        `[Sigil Error] Class '${value.name}' with label '${value.SigilLabel}' is already sigilified`
      );

    handleSigil(value, label, opts);
  };
}
