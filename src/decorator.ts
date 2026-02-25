import { handleSigil, hasOwnSigil, isSigilCtor } from './helpers';
import type { SigilOptions } from './options';

/**
 * Class decorator factory that attaches sigil statics to a class constructor.
 *
 * Notes:
 * - This decorator is intended to be applied to classes only. When used
 *   incorrectly (e.g. on a property), it is a no-op.
 * - Throws an error during class creation if the label validation fails (in development only).
 *
 * @typeParam L - Narrow string literal type for the provided label.
 * @param label - Optional sigil label to assign to the decorated class (e.g. `@scope/pkg.ClassName`).
 *                If not passed a random label is generated instead.
 * @param opts - Options object to override any global options if needed.
 * @returns A class decorator compatible with the ECMAScript decorator context.
 */
export function WithSigil<L extends string>(label?: L, opts?: SigilOptions) {
  return function (value: Function, context: any) {
    // Only apply to class declarations
    if (context.kind !== 'class') return;
    if (!isSigilCtor(value))
      throw new Error(
        `[Sigil Error] 'WithSigil' decorator accept only Sigil classes but used on class ${value.name}`
      );
    if (hasOwnSigil(value))
      throw new Error(
        `[Sigil Error] Class '${value.name}' with label '${value.SigilLabel}' is already sigilified`
      );

    handleSigil(value, label, opts);
  };
}
