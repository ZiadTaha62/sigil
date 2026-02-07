import { Sigilify } from './mixin';

/**
 * A minimal root Sigil class used by the library as a base identity.
 *
 * This is produced by `Sigilify` and can serve as a basic sentinel/base
 * class for other sigil classes or for debugging/inspection.
 */
export const Sigil = Sigilify(class {}, 'Sigil');

/**
 * A sigil variant of the built-in `Error` constructor used by the library
 * to represent Sigil-specific errors.
 *
 * Use `SigilError` when you want an Error type that is identifiable via sigil
 * runtime checks (e.g. `SigilError.isOfType(someError)`).
 */
export const SigilError = Sigilify(Error, 'SigilError');
