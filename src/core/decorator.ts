import {
  checkInheritance,
  decorateCtor,
  generateRandomLabel,
  isSigilCtor,
  verifyLabel,
} from './helpers';
import type { SigilOptions } from './options';

/**
 * Class decorator factory that attaches sigil statics to a class constructor.
 *
 * Usage:
 * ```ts
 * @WithSigil('@myorg/mypkg.MyClass')
 * class MyClass { ... }
 * ```
 *
 * The returned decorator:
 * - validates the provided label (via `verifyLabel`)
 * - performs inheritance checks (via `checkInheritance`) in DEV builds
 * - attaches sigil-related statics to the constructor (via `decorateCtor`)
 *
 * Notes:
 * - This decorator is intended to be applied to classes only. When used
 *   incorrectly (e.g. on a property), it is a no-op.
 * - Throws an error during class creation if the label validation fails.
 *
 * @typeParam L - Narrow string literal type for the provided label.
 * @param label - Optional sigil label to assign to the decorated class (e.g. `@scope/pkg.ClassName`).
 *                If not passed a random label is generated instead.
 * @param opts - Options object to override any global options if needed.
 * @returns A class decorator compatible with the ECMAScript decorator context.
 */
export function WithSigil<L extends string>(label?: L, opts?: SigilOptions) {
  // generate random label if not passed and verify it
  let l: string;
  if (label) {
    verifyLabel(label, opts);
    l = label;
  } else l = generateRandomLabel();

  return function (value: Function, context: ClassDecoratorContext) {
    // Only apply to class declarations
    if (context.kind !== 'class') return;
    if (!isSigilCtor(value))
      throw new Error(
        `[Sigil Error] 'WithSigil' decorator accept only Sigil classes but used on class ${value.name}`
      );
    // Attach sigil metadata to constructor (registers label, sets symbols, marks decorated)
    decorateCtor(value, l);
    // Development-only inheritance checks and potential autofill
    checkInheritance(value, opts);
  };
}
