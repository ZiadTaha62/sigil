export { Sigil, SigilError } from './classes';
export { WithSigil } from './decorator';
export { withSigil } from './hof';
export {
  isDecorated,
  isInheritanceChecked,
  isSigilBaseCtor,
  isSigilBaseInstance,
  isSigilCtor,
  isSigilInstance,
} from './helpers';
export { Sigilify, SigilifyAbstract } from './mixin';
export { updateSigilOptions, DEFAULT_LABEL_REGEX, type SigilOptions } from './options';
export type { ISigilInstance, ISigilStatic, ISigil, SigilOf, ExtendSigil } from './types';
export { sigil } from './types';
