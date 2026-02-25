import { handleSigil, hasOwnSigil, isSigilInstance } from './helpers';
import type { SigilOptions } from './options';
import { __LABEL__, __EFFECTIVE_LABEL__, __LINEAGE__, __SIGIL__ } from './symbols';
import type {
  Constructor,
  Prettify,
  ConstructorAbstract,
  ISigilInstance,
  GetPrototype,
  ISigilStatic,
} from './types';
import { sigil } from './types';

/**
 * Mixin factory that augments an existing class with Sigil runtime metadata and helpers.
 *
 * @param Base - The base constructor to extend.
 * @param label - Optional identity label to attach to the resulting class (e.g. '@scope/pkg.ClassName').
 *                If not passed a random label is generated instead.
 * @param opts - Options object to override any global options if needed.
 * @returns A new constructor that extends `Base` and includes Sigil statics/instance methods.
 * @throws Error if `Base` is already sigilified.
 */
export function Sigilify<B extends Constructor, L extends string>(
  Base: B,
  label?: L,
  opts?: SigilOptions
) {
  if (hasOwnSigil(Base))
    throw new Error(
      `[Sigil Error] Class '${Base.name}' with label '${Base.SigilLabel}' is already sigilified`
    );

  class Sigilified extends Base implements ISigilInstance {
    /**
     * Class-level identity label constant for this sigil constructor.
     */
    static get SigilLabel(): L {
      handleSigil(this);
      return (this as any).prototype?.[__LABEL__];
    }

    /**
     * Class-level human-readable label constant for this sigil constructor, last passed label in 'Sigil' chain by developer.
     */
    static get SigilEffectiveLabel(): L {
      handleSigil(this);
      return (this as any).prototype?.[__EFFECTIVE_LABEL__];
    }

    /**
     * Linearized sigil type label chain for the current constructor.
     *
     * Useful for debugging and performing strict lineage comparisons.
     *
     * @returns An array of labels representing parent → child type labels.
     */
    static get SigilLabelLineage(): readonly string[] {
      handleSigil(this);
      return [...((this as any).prototype?.[__LINEAGE__] ?? [])];
    }

    /**
     * Sigil type label set for the current constructor.
     * Useful for debugging.
     *
     * @returns A Readonly Set of labels that represent the type lineage.
     */
    static get SigilLabelSet(): Readonly<Set<string>> {
      handleSigil(this);
      return (this as any).prototype?.[__LINEAGE__];
    }

    /**
     * Compile-time nominal brand that encodes the class sigil labels object.
     */
    declare readonly [sigil]: Prettify<
      {
        Sigil: true;
      } & {
        [K in L]: true;
      }
    >;

    constructor(...args: any[]) {
      super(...args);
      const ctor = new.target;
      handleSigil(ctor);
    }

    /**
     * Runtime predicate indicating whether `obj` is an instance produced by a sigil class.
     *
     * @param obj - The value to test.
     * @returns `true` if `obj` is a sigil instance.
     */
    static isSigilified(obj: unknown): obj is ISigilInstance {
      return isSigilInstance(obj);
    }

    /**
     * Check whether `other` is (or inherits from) the instance represented by the
     * calling constructor.
     *
     * This replaces `instanceof` so that checks remain valid across bundles/realms
     * and when subclassing.
     *
     * @typeParam T - The specific sigil constructor (`this`).
     * @param this - The constructor performing the type check.
     * @param other - The object to test.
     * @returns A type guard asserting `other` is an instance of the constructor.
     */
    static isOfType<T extends ISigilStatic>(this: T, other: unknown): other is GetPrototype<T> {
      handleSigil(this as any);
      if (other == null || typeof other !== 'object') return false;
      return (other as any)[(this as any).prototype?.[__SIGIL__]] === true;
    }

    /**
     * Check whether `other` is exactly the same instance represented by the
     * calling constructor.
     *
     * @typeParam T - The specific sigil constructor (`this`).
     * @param this - The constructor performing the type check.
     * @param other - The object to test.
     * @returns A type guard asserting `other` is an instance of the constructor.
     */
    static isExactType<T extends ISigilStatic>(this: T, other: unknown): other is GetPrototype<T> {
      handleSigil(this as any);
      if (other == null || typeof other !== 'object') return false;
      if ((this as any).prototype?.[__LINEAGE__].size !== (other as any)[__LINEAGE__]?.size)
        return false;
      return (other as any)[(this as any).prototype?.[__SIGIL__]] === true;
    }

    /**
     * Check whether `other` is (or inherits from) the instance represented by the
     * calling constructor.
     *
     * This replaces `instanceof` so that checks remain valid across bundles/realms
     * and when subclassing.
     *
     * @typeParam T - The specific sigil constructor (`this`).
     * @param this - The constructor performing the type check.
     * @param other - The object to test.
     * @returns A type guard asserting `other` is an instance of the constructor.
     */
    isOfType<T extends ISigilInstance>(this: T, other: unknown): other is T {
      if (other == null || typeof other !== 'object') return false;
      return (other as any)[(this as any)[__SIGIL__]] === true;
    }

    /**
     * Check whether `other` is exactly the same instance represented by the
     * calling constructor.
     *
     * @typeParam T - The specific sigil constructor (`this`).
     * @param this - The constructor performing the type check.
     * @param other - The object to test.
     * @returns A type guard asserting `other` is an instance of the constructor.
     */
    isExactType<T extends ISigilInstance>(this: T, other: unknown): other is T {
      if (other == null || typeof other !== 'object') return false;
      if ((this as any)[__LINEAGE__].size !== (other as any)[__LINEAGE__]?.size) return false;
      return (other as any)[(this as any)[__SIGIL__]] === true;
    }

    /**
     * Returns the identity sigil label of this instance's constructor.
     *
     * @returns The label string if passed (e.g. '@scope/pkg.ClassName'), random label if not passed (e.g. '@Sigil-auto:ClassName:mm2gkdwn:0:g1sq').
     */
    getSigilLabel(): string {
      return (this as any)[__LABEL__];
    }

    /**
     * Returns the human-readable sigil label of this instance's constructor.
     *
     * @returns The last passed label string (e.g. '@scope/pkg.ClassName').
     */
    getSigilEffectiveLabel(): string {
      return (this as any)[__EFFECTIVE_LABEL__];
    }

    /**
     * Returns a copy of the sigil type label lineage for this instance's constructor.
     *
     * @returns readonly array of labels representing the type lineage.
     */
    getSigilLabelLineage(): readonly string[] {
      return [...(this as any)[__LINEAGE__]];
    }

    /**
     * Returns a copy of the sigil type label lineage set for this instance's constructor.
     *
     * @returns readonly array of labels representing the type lineage.
     */
    getSigilLabelSet(): Readonly<Set<string>> {
      return (this as any)[__LINEAGE__];
    }
  }

  handleSigil(Sigilified, label, opts);
  return Sigilified;
}

/**
 * Mixin factory that augments an existing class with Sigil runtime metadata and helpers. Accept and return 'abstract' class.
 *
 * @param Base - The base constructor to extend.
 * @param label - Optional identity label to attach to the resulting class (e.g. '@scope/pkg.ClassName').
 *                If not passed a random label is generated instead.
 * @param opts - Options object to override any global options if needed.
 * @returns A new abstract constructor that extends `Base` and includes Sigil statics/instance methods.
 * @throws Error if `Base` is already sigilified.
 */
export function SigilifyAbstract<B extends ConstructorAbstract, L extends string>(
  Base: B,
  label?: L,
  opts?: SigilOptions
) {
  if (hasOwnSigil(Base))
    throw new Error(
      `[Sigil Error] Base class '${Base.name}' with label '${Base.SigilLabel}' is already sigilified`
    );

  abstract class Sigilified extends Base implements ISigilInstance {
    /**
     * Class-level identity label constant for this sigil constructor.
     */
    static get SigilLabel(): L {
      handleSigil(this);
      return (this as any).prototype?.[__LABEL__];
    }

    /**
     * Class-level human-readable label constant for this sigil constructor, last passed label in 'Sigil' chain by developer.
     */
    static get SigilEffectiveLabel(): L {
      handleSigil(this);
      return (this as any).prototype?.[__EFFECTIVE_LABEL__];
    }

    /**
     * Linearized sigil type label chain for the current constructor.
     *
     * Useful for debugging and performing strict lineage comparisons.
     *
     * @returns An array of labels representing parent → child type labels.
     */
    static get SigilLabelLineage(): readonly string[] {
      handleSigil(this);
      return [...((this as any).prototype?.[__LINEAGE__] ?? [])];
    }

    /**
     * Sigil type label set for the current constructor.
     * Useful for debugging.
     *
     * @returns A Readonly Set of labels that represent the type lineage.
     */
    static get SigilLabelSet(): Readonly<Set<string>> {
      handleSigil(this);
      return (this as any).prototype?.[__LINEAGE__];
    }

    /**
     * Compile-time nominal brand that encodes the class sigil labels object.
     */
    declare readonly [sigil]: Prettify<
      {
        Sigil: true;
      } & {
        [K in L]: true;
      }
    >;

    constructor(...args: any[]) {
      super(...args);
      const ctor = new.target;
      handleSigil(ctor);
    }

    /**
     * Runtime predicate indicating whether `obj` is an instance produced by a sigil class.
     *
     * @param obj - The value to test.
     * @returns `true` if `obj` is a sigil instance.
     */
    static isSigilified(obj: unknown): obj is ISigilInstance {
      return isSigilInstance(obj);
    }

    /**
     * Check whether `other` is (or inherits from) the instance represented by the
     * calling constructor.
     *
     * This replaces `instanceof` so that checks remain valid across bundles/realms
     * and when subclassing.
     *
     * @typeParam T - The specific sigil constructor (`this`).
     * @param this - The constructor performing the type check.
     * @param other - The object to test.
     * @returns A type guard asserting `other` is an instance of the constructor.
     */
    static isOfType<T>(this: T, other: unknown): other is GetPrototype<T> {
      if (other == null || typeof other !== 'object') return false;
      return (other as any)[(this as any).prototype?.[__SIGIL__]] === true;
    }

    /**
     * Check whether `other` is exactly the same instance represented by the
     * calling constructor.
     *
     * @typeParam T - The specific sigil constructor (`this`).
     * @param this - The constructor performing the type check.
     * @param other - The object to test.
     * @returns A type guard asserting `other` is an instance of the constructor.
     */
    static isExactType<T>(this: T, other: unknown): other is GetPrototype<T> {
      if (other == null || typeof other !== 'object') return false;
      if ((this as any).prototype?.[__LINEAGE__].size !== (other as any)[__LINEAGE__]?.size)
        return false;
      return (other as any)[(this as any).prototype?.[__SIGIL__]] === true;
    }

    /**
     * Check whether `other` is (or inherits from) the instance represented by the
     * calling constructor.
     *
     * This replaces `instanceof` so that checks remain valid across bundles/realms
     * and when subclassing.
     *
     * @typeParam T - The specific sigil constructor (`this`).
     * @param this - The constructor performing the type check.
     * @param other - The object to test.
     * @returns A type guard asserting `other` is an instance of the constructor.
     */
    isOfType<T>(this: T, other: unknown): other is T {
      if (other == null || typeof other !== 'object') return false;
      return (other as any)[(this as any)[__SIGIL__]] === true;
    }

    /**
     * Check whether `other` is exactly the same instance represented by the
     * calling constructor.
     *
     * @typeParam T - The specific sigil constructor (`this`).
     * @param this - The constructor performing the type check.
     * @param other - The object to test.
     * @returns A type guard asserting `other` is an instance of the constructor.
     */
    isExactType<T>(this: T, other: unknown): other is T {
      if (other == null || typeof other !== 'object') return false;
      if ((this as any)[__LINEAGE__].size !== (other as any)[__LINEAGE__]?.size) return false;
      return (other as any)[(this as any)[__SIGIL__]] === true;
    }

    /**
     * Returns the identity sigil label of this instance's constructor.
     *
     * @returns The label string if passed (e.g. '@scope/pkg.ClassName'), random label if not passed (e.g. '@Sigil-auto:ClassName:mm2gkdwn:0:g1sq').
     */
    getSigilLabel(): string {
      return (this as any)[__LABEL__];
    }

    /**
     * Returns the human-readable sigil label of this instance's constructor.
     *
     * @returns The last passed label string (e.g. '@scope/pkg.ClassName').
     */
    getSigilEffectiveLabel(): string {
      return (this as any)[__EFFECTIVE_LABEL__];
    }

    /**
     * Returns a copy of the sigil type label lineage for this instance's constructor.
     *
     * @returns readonly array of labels representing the type lineage.
     */
    getSigilLabelLineage(): readonly string[] {
      return [...(this as any)[__LINEAGE__]];
    }

    /**
     * Returns a copy of the sigil type label lineage set for this instance's constructor.
     *
     * @returns readonly array of labels representing the type lineage.
     */
    getSigilLabelSet(): Readonly<Set<string>> {
      return (this as any)[__LINEAGE__];
    }
  }

  handleSigil(Sigilified, label, opts);
  return Sigilified;
}
