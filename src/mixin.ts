import { handleSigilExplicit, handleSigilLazy, isSigilCtor } from './helpers';
import type { SigilOptions } from './options';
import { __SIGIL__, __LABEL__, __EFFECTIVE_LABEL__, __DEPTH__ } from './symbols';
import type { Constructor, ConstructorAbstract, GetPrototype, sigil, ExtendSigil } from './types';

/**
 * Helper function to extend Base class with Sigil Class that should be present at the start of each Sigil chain
 * @param Base - The base constructor to extend.
 * @returns Base Sigil class at the start of each Sigil chain
 */
export function BaseSigilify(Base: ConstructorAbstract) {
  class Sigil extends Base {
    /**
     * Class-level identity label constant for this sigil constructor.
     */
    static get SigilLabel(): string {
      handleSigilLazy(this);
      return (this as any).prototype[__LABEL__];
    }

    /**
     * Class-level human-readable label constant for this sigil constructor, last passed label in 'Sigil' chain by developer.
     */
    static get SigilEffectiveLabel(): string {
      handleSigilLazy(this);
      return (this as any).prototype[__EFFECTIVE_LABEL__];
    }

    /**
     * Linearized sigil type label chain for the current constructor.
     *
     * Useful for debugging and performing strict lineage comparisons.
     *
     * @returns An array of labels representing parent → child type labels.
     */
    static get SigilLabelLineage(): readonly string[] {
      handleSigilLazy(this);
      const lineage = [];
      let c = this;
      while (c && typeof c === 'function' && (c.prototype as any)[__SIGIL__]) {
        lineage.unshift(c.SigilLabel);
        c = Object.getPrototypeOf(c);
      }
      return lineage;
    }

    /**
     * Sigil type label set for the current constructor.
     * Useful for debugging.
     *
     * @deprecated To minize API and bundle size, internally this method is 'new Set(this.SigilLabelLineage)' only. will be removed in v4
     * @returns A Readonly Set of labels that represent the type lineage.
     */
    static get SigilLabelSet(): Readonly<Set<string>> {
      return new Set(this.SigilLabelLineage);
    }

    /**
     * Compile-time nominal brand that encodes the class sigil labels object.
     */
    declare readonly [sigil]: {
      Sigil: true;
    };

    constructor(...args: any[]) {
      super(...args);
      const ctor = new.target;
      handleSigilLazy(ctor);
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
      handleSigilLazy(this as any);
      if (other == null || typeof other !== 'object') return false;
      return (other as any)[(this as any).prototype[__SIGIL__]] === true;
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
      handleSigilLazy(this as any);
      if (other == null || typeof other !== 'object') return false;
      if ((this as any).prototype[__DEPTH__] !== (other as any)[__DEPTH__]) return false;
      return (other as any)[(this as any).prototype[__SIGIL__]] === true;
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
      if ((this as any)[__DEPTH__] !== (other as any)[__DEPTH__]) return false;
      return (other as any)[(this as any)[__SIGIL__]] === true;
    }

    /**
     * Returns the identity sigil label of this instance's constructor.
     *
     * @returns The label string if passed (e.g. '@scope/pkg.ClassName'), random label if not passed (e.g. '@Sigil-auto:ClassName:1:pnf11bgl').
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
      const lineage: string[] = [];
      let proto = Object.getPrototypeOf(this);
      while (proto && proto[__SIGIL__]) {
        lineage.unshift(proto[__LABEL__]);
        proto = Object.getPrototypeOf(proto);
      }
      return lineage;
    }

    /**
     * Returns a copy of the sigil type label lineage set for this instance's constructor.
     *
     * @deprecated To minize API and bundle size, internally this method is 'new Set(this.SigilLabelLineage)' only. will be removed in v4
     * @returns readonly array of labels representing the type lineage.
     */
    getSigilLabelSet(): Readonly<Set<string>> {
      return new Set(this.getSigilLabelLineage());
    }
  }

  handleSigilExplicit(Sigil, 'Sigil', { skipLabelUniquenessCheck: true });
  return Sigil;
}

/**
 * Mixin factory that augments an existing class with Sigil runtime metadata and helpers.
 *
 * @param Base - The base constructor to extend.
 * @param label - Identity label to attach to the resulting class (e.g. '@scope/pkg.ClassName').
 * @param opts - Options object to override any global options if needed.
 * @returns A new constructor that extends `Base` and includes Sigil statics/instance methods.
 * @throws Error if `Base` is already sigilified.
 */
export function Sigilify<L extends string>(Base: Constructor, label: L, opts?: SigilOptions) {
  if (isSigilCtor(Base))
    throw new Error(
      `[Sigil Error] Class '${Base.name}' with label '${Base.SigilLabel}' is already sigilified`
    );

  const BaseSigil = BaseSigilify(Base);
  class Sigilified extends BaseSigil {
    declare [sigil]: ExtendSigil<L, InstanceType<typeof BaseSigil>>;
  }

  handleSigilExplicit(Sigilified, label, opts);
  return Sigilified;
}

/**
 * Mixin factory that augments an existing class with Sigil runtime metadata and helpers. Accept and return 'abstract' class.
 *
 * @param Base - The base constructor to extend.
 * @param label - Identity label to attach to the resulting class (e.g. '@scope/pkg.ClassName').
 * @param opts - Options object to override any global options if needed.
 * @returns A new abstract constructor that extends `Base` and includes Sigil statics/instance methods.
 * @throws Error if `Base` is already sigilified.
 */
export function SigilifyAbstract<L extends string>(
  Base: ConstructorAbstract,
  label: L,
  opts?: SigilOptions
) {
  if (isSigilCtor(Base))
    throw new Error(
      `[Sigil Error] Class '${Base.name}' with label '${Base.SigilLabel}' is already sigilified`
    );

  const BaseSigil = BaseSigilify(Base);
  abstract class Sigilified extends BaseSigil {
    declare [sigil]: ExtendSigil<L, InstanceType<typeof BaseSigil>>;
  }

  handleSigilExplicit(Sigilified, label, opts);
  return Sigilified;
}
