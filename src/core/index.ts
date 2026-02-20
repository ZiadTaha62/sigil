export { Sigil, SigilError } from './classes';
export { WithSigil } from './decorator';
export { withSigil, withSigilTyped } from './enhancers';
export {
  isDecorated,
  isInheritanceChecked,
  isSigilBaseCtor,
  isSigilBaseInstance,
  isSigilCtor,
  isSigilInstance,
} from './helpers';
export { Sigilify, SigilifyAbstract } from './mixin';
export { updateOptions, DEFAULT_LABEL_REGEX, type SigilOptions } from './options';
export type {
  ISigilInstance,
  ISigilStatic,
  ISigil,
  GetInstance,
  SigilBrandOf,
  TypedSigil,
  UpdateSigilBrand,
} from './types';
