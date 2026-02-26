export { Sigil, SigilError } from './classes';
export { WithSigil } from './decorator';
export { withSigil } from './hof';
export { isSigilCtor, isSigilInstance } from './helpers';
export { Sigilify, SigilifyAbstract } from './mixin';
export { updateSigilOptions, DEFAULT_LABEL_REGEX, type SigilOptions } from './options';
export type {
  ISigilInstance,
  ISigilStatic,
  ISigil,
  SigilOf,
  ExtendSigil,
  GetPrototype,
  sigil,
} from './types';
