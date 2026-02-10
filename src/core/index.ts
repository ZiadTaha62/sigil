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
  DEFAULT_LABEL_REGEX,
  SigilRegistry,
  getActiveRegistry,
  REGISTRY,
} from './options';
export type {
  ISigilInstance,
  ISigilStatic,
  ISigil,
  GetInstance,
  SigilBrandOf,
  TypedSigil,
  SigilOptions,
  UpdateSigilBrand,
} from './types';
