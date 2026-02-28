export { Sigil, SigilError } from './classes';
export { AttachSigil, WithSigil, attachSigil, withSigil } from './attach';
export { isSigilCtor, isSigilInstance, getSigilLabels } from './helpers';
export { Sigilify, SigilifyAbstract } from './mixin';
export {
  updateSigilOptions,
  DEFAULT_LABEL_REGEX,
  RECOMMENDED_LABEL_REGEX,
  type SigilOptions,
} from './options';
export type {
  ISigilInstance,
  ISigilStatic,
  ISigil,
  SigilOf,
  ExtendSigil,
  GetPrototype,
  sigil,
} from './types';
