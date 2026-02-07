export { Sigil, SigilError } from './classes';
export { WithSigil } from './decorator';
export { typed, withSigil, withSigilTyped } from './enhancers';
export {
  isDecorated,
  isInheritanceChecked,
  isSigilBaseCtor,
  isSigilBaseInstance,
  isSigilCtor,
  isSigilInstance,
} from './helpers';
export { Sigilify } from './mixin';
export {
  updateOptions,
  type SigilOptions,
  DEFAULT_LABEL_REGEX,
} from './options';
export { REGISTRY } from './registry';
export type {
  GetInstance,
  ISigil,
  ISigilInstance,
  ISigilStatic,
  SigilBrandOf,
  TypedSigil,
} from './types';
