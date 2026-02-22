import {
  checkInheritance,
  decorateCtor,
  generateRandomLabel,
  getConstructor,
  isSigilCtor,
  isSigilInstance,
  markSigil,
  markSigilBase,
  verifyLabel,
} from './helpers';
import type { SigilOptions } from './options';
import { __LABEL__, __LABEL_LINEAGE__, __LABEL_SET__ } from './symbols';
import type {
  Constructor,
  ISigil,
  Prettify,
  GetInstance,
  ConstructorAbstract,
  ISigilInstance,
} from './types';
import { __DEV__ } from './constants';

/**
 * Mixin factory that augments an existing class with Sigil runtime metadata and helpers.
 *
 * @param Base - The base constructor to extend.
 * @param label - Optional identity label to attach to the resulting class (e.g. '@scope/pkg.ClassName').
 *                If not passed a random label is generated instead.
 * @param opts - Options object to override any global options if needed.
 * @returns A new abstract constructor that extends `Base` and includes Sigil statics/instance methods.
 * @throws Error if `Base` is already sigilized.
 */
export function Sigilify<B extends Constructor, L extends string>(
  Base: B,
  label?: L,
  opts?: SigilOptions
) {
  // if siglified throw
  if (isSigilCtor(Base)) throw new Error(`[Sigil Error] 'Sigilify(${label})' already siglified.`);

  // generate random label if not passed and verify it
  let l: string;
  if (label) {
    verifyLabel(label, opts);
    l = label;
  } else l = generateRandomLabel();

  // extend actual class
  class Sigilified extends Base implements ISigilInstance {
    /**
     * Compile-time nominal brand that encodes the class label `L` plus parent's brand keys `BrandOf<P>`.
     *
     * - HAVE NO RUN-TIME VALUE (undefined)
     * - Provides a *type-only* unique marker that makes instances nominally
     *   distinct by label and allows propagation/merging of brand keys across inheritance.
     */
    declare static readonly __SIGIL_BRAND__: Prettify<
      {
        Sigil: true;
      } & {
        [K in L]: true;
      }
    >;

    /**
     * Class-level human-readable label constant for this sigil constructor.
     */
    static get SigilLabel(): string {
      return (this as any)[__LABEL__];
    }

    /**
     * Copy of the linearized sigil type label chain for the current constructor.
     *
     * Useful for debugging and performing strict lineage comparisons.
     *
     * @returns An array of labels representing parent → child type labels.
     */
    static get SigilLabelLineage(): readonly string[] {
      return [...((this as any)[__LABEL_LINEAGE__] ?? [])];
    }

    /**
     * Copy of the sigil type label set for the current constructor.
     *
     * Useful for quick membership checks (O(1) lookups) and debugging.
     *
     * @returns A Readonly Set of labels that represent the type lineage.
     */
    static get SigilLabelSet(): Readonly<Set<string>> {
      const set: Set<string> = new Set();
      for (const s of (this as any)[__LABEL_SET__]) set.add(s);
      return set;
    }

    /**
     * Compile-time nominal brand that encodes the class label `L` plus parent's brand keys `BrandOf<P>`.
     *
     * - HAVE NO RUN-TIME VALUE (undefined)
     * - Provides a *type-only* unique marker that makes instances nominally
     *   distinct by label and allows propagation/merging of brand keys across inheritance.
     */
    declare readonly __SIGIL_BRAND__: Prettify<
      {
        Sigil: true;
      } & {
        [K in L]: true;
      }
    >;

    constructor(...args: any[]) {
      super(...args);

      // Correct prototype chain when necessary (defensive for transpiled code / edge cases)
      if (Object.getPrototypeOf(this) !== new.target.prototype)
        Object.setPrototypeOf(this, new.target.prototype);

      // Resolve constructor; defensive null-check helps catch weird runtime cases.
      const ctor = getConstructor(this);
      if (!ctor) {
        if (__DEV__)
          throw new Error(`[Sigil Error] 'Sigilify(${label})' instance without constructor`);
        return;
      }

      // Perform dev-only inheritance validation to ensure labels are unique across the chain.
      if (__DEV__) checkInheritance(ctor);
    }

    /**
     * Runtime predicate indicating whether `obj` is an instance produced by a sigil class.
     *
     * @param obj - The value to test.
     * @returns `true` if `obj` is a sigil instance.
     */
    static isSigilified(obj: unknown): obj is ISigil {
      return isSigilInstance(obj);
    }

    /**
     * Check whether `other` is (or inherits from) the type represented by the calling constructor.
     *
     * This replaces `instanceof` so that checks remain valid across bundles/realms
     * and when subclassing.
     *
     * @typeParam T - The calling constructor type (narrowing the returned instance type).
     * @param this - The constructor performing the check.
     * @param other - The object to test.
     * @returns `true` if `other` is an instance of this type or a subtype.
     */
    static isOfType<T>(this: T, other: unknown): other is GetInstance<T> {
      if (!isSigilInstance(other)) return false;
      const otherSet = getConstructor(other)?.[__LABEL_SET__];
      const thisType = (this as any)[__LABEL__];
      return !!otherSet && otherSet.has(thisType);
    }

    /**
     * Strict lineage check: compares the type label lineage arrays element-by-element.
     *
     * @typeParam T - The calling constructor type.
     * @param this - The constructor performing the check.
     * @param other - The object to test.
     * @returns `true` if `other` has an identical lineage up to the length of this constructor's lineage.
     */
    static isOfTypeStrict<T>(this: T, other: unknown): other is GetInstance<T> {
      if (!isSigilInstance(other)) return false;
      const otherLineage = getConstructor(other)?.[__LABEL_LINEAGE__];
      const thisLineage = (this as any)[__LABEL_LINEAGE__] as readonly string[];
      return !!otherLineage && thisLineage.every((s, i) => s === otherLineage[i]);
    }

    /**
     * Check whether `other` is (or inherits from) the type instance.
     *
     * Allows 'instanceof' like checks but in instances.
     *
     * @typeParam T - The instance type.
     * @param this - The instance performing the check.
     * @param other - The object to test.
     * @returns `true` if `other` is the same instance of this type or a subtype.
     */
    isOfType<T>(this: T, other: unknown): other is GetInstance<T> {
      if (!isSigilInstance(other)) return false;
      const otherSet = getConstructor(other)?.[__LABEL_SET__];
      const thisType = getConstructor(this)[__LABEL__];
      return !!otherSet && otherSet.has(thisType);
    }

    /**
     * Strict lineage check: compares the type label lineage arrays element-by-element.
     *
     * Allows 'instanceof' like checks but in instances.
     *
     * @typeParam T - The instance type.
     * @param this - The instance performing the check.
     * @param other - The object to test.
     * @returns `true` if `other` has an identical lineage up to the length of this instance's lineage.
     */
    isOfTypeStrict<T>(this: T, other: unknown): other is GetInstance<T> {
      if (!isSigilInstance(other)) return false;
      const otherLineage = getConstructor(other)?.[__LABEL_LINEAGE__];
      const thisLineage = getConstructor(this)?.[__LABEL_LINEAGE__] as readonly string[];
      return !!otherLineage && thisLineage.every((s, i) => s === otherLineage[i]);
    }

    /**
     * Returns the human-readable sigil label of this instance's constructor.
     *
     * @returns The label string (e.g. '@scope/pkg.ClassName') or '@Sigil.unknown' in DEV when constructor is missing.
     */
    getSigilLabel(): string {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (__DEV__)
          throw new Error(`[Sigil Error] 'Sigilify(${label})' instance without constructor`);
        return '@Sigil.unknown';
      }
      return ctor.SigilLabel;
    }

    /**
     * Returns a copy of the sigil type label lineage for this instance's constructor.
     *
     * @returns readonly array of labels representing the type lineage.
     */
    getSigilLabelLineage(): readonly string[] {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (__DEV__)
          throw new Error(`[Sigil Error] 'Sigilify(${label})' instance without constructor`);
        return ['@Sigil.unknown'];
      }
      return ctor.SigilLabelLineage;
    }

    /**
     * Returns a readonly copy of the sigil type label set for this instance's constructor.
     *
     * @returns A Readonly Set of labels representing the type lineage for O(1) membership tests.
     */
    getSigilLabelSet(): Readonly<Set<string>> {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (__DEV__)
          throw new Error(`[Sigil Error] 'Sigilify(${label})' instance without constructor`);
        return new Set(['@Sigil.unknown']);
      }
      return ctor.SigilLabelSet;
    }
  }

  // Attach sigil metadata to constructor (registers label, sets labels, marks decorated)
  decorateCtor(Sigilified, l, true);

  // Mark the returned constructor as sigil (runtime flag) and as a base.
  markSigil(Sigilified);
  markSigilBase(Sigilified);

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
 * @throws Error if `Base` is already sigilized.
 */
export function SigilifyAbstract<B extends ConstructorAbstract, L extends string>(
  Base: B,
  label?: L,
  opts?: SigilOptions
) {
  // if siglified throw
  if (isSigilCtor(Base)) throw new Error(`[Sigil Error] 'Sigilify(${label})' already siglified.`);

  // generate random label if not passed and verify it
  let l: string;
  if (label) {
    verifyLabel(label, opts);
    l = label;
  } else l = generateRandomLabel();

  // extend actual class
  abstract class Sigilified extends Base implements ISigilInstance {
    /**
     * Compile-time nominal brand that encodes the class label `L` plus parent's brand keys `BrandOf<P>`.
     *
     * - HAVE NO RUN-TIME VALUE (undefined)
     * - Provides a *type-only* unique marker that makes instances nominally
     *   distinct by label and allows propagation/merging of brand keys across inheritance.
     */
    declare static readonly __SIGIL_BRAND__: Prettify<
      {
        Sigil: true;
      } & {
        [K in L]: true;
      }
    >;

    /**
     * Class-level human-readable label constant for this sigil constructor.
     */
    static get SigilLabel(): string {
      return (this as any)[__LABEL__];
    }

    /**
     * Copy of the linearized sigil type label chain for the current constructor.
     *
     * Useful for debugging and performing strict lineage comparisons.
     *
     * @returns An array of labels representing parent → child type labels.
     */
    static get SigilLabelLineage(): readonly string[] {
      return [...((this as any)[__LABEL_LINEAGE__] ?? [])];
    }

    /**
     * Copy of the sigil type label set for the current constructor.
     *
     * Useful for quick membership checks (O(1) lookups) and debugging.
     *
     * @returns A Readonly Set of labels that represent the type lineage.
     */
    static get SigilLabelSet(): Readonly<Set<string>> {
      const set: Set<string> = new Set();
      for (const s of (this as any)[__LABEL_SET__]) set.add(s);
      return set;
    }

    /**
     * Compile-time nominal brand that encodes the class label `L` plus parent's brand keys `BrandOf<P>`.
     *
     * - HAVE NO RUN-TIME VALUE (undefined)
     * - Provides a *type-only* unique marker that makes instances nominally
     *   distinct by label and allows propagation/merging of brand keys across inheritance.
     */
    declare readonly __SIGIL_BRAND__: Prettify<
      {
        Sigil: true;
      } & {
        [K in L]: true;
      }
    >;

    constructor(...args: any[]) {
      super(...args);

      // Correct prototype chain when necessary (defensive for transpiled code / edge cases)
      if (Object.getPrototypeOf(this) !== new.target.prototype)
        Object.setPrototypeOf(this, new.target.prototype);

      // Resolve constructor; defensive null-check helps catch weird runtime cases.
      const ctor = getConstructor(this);
      if (!ctor) {
        if (__DEV__)
          throw new Error(`[Sigil Error] 'Sigilify(${label})' instance without constructor`);
        return;
      }

      // Perform dev-only inheritance validation to ensure labels are unique across the chain.
      if (__DEV__) checkInheritance(ctor);
    }

    /**
     * Runtime predicate indicating whether `obj` is an instance produced by a sigil class.
     *
     * @param obj - The value to test.
     * @returns `true` if `obj` is a sigil instance.
     */
    static isSigilified(obj: unknown): obj is ISigil {
      return isSigilInstance(obj);
    }

    /**
     * Check whether `other` is (or inherits from) the type represented by the calling constructor.
     *
     * Implementation detail:
     * - Uses the other instance's `__LABEL_SET__` for O(1) membership test.
     * - O(1) and reliable as long as `OPTIONS.skipLabelInheritanceCheck` is `false`.
     *
     * This replaces `instanceof` so that checks remain valid across bundles/realms
     * and when subclassing.
     *
     * @typeParam T - The calling constructor type (narrowing the returned instance type).
     * @param this - The constructor performing the check.
     * @param other - The object to test.
     * @returns `true` if `other` is an instance of this type or a subtype.
     */
    static isOfType<T>(this: T, other: unknown): other is GetInstance<T> {
      if (!isSigilInstance(other) || !isSigilCtor(this)) return false;
      const otherSet = getConstructor(other)?.[__LABEL_SET__];
      const thisType = (this as any)[__LABEL__];
      return !!otherSet && otherSet.has(thisType);
    }

    /**
     * Strict lineage check: compares the type label lineage arrays element-by-element.
     *
     * Implementation detail:
     * - Works in O(n) time where n is the depth of the lineage.
     * - Reliable when `OPTIONS.skipLabelInheritanceCheck` is `false`.
     *
     * @typeParam T - The calling constructor type.
     * @param this - The constructor performing the check.
     * @param other - The object to test.
     * @returns `true` if `other` has an identical lineage up to the length of this constructor's lineage.
     */
    static isOfTypeStrict<T>(this: T, other: unknown): other is GetInstance<T> {
      if (!isSigilInstance(other) || !isSigilCtor(this)) return false;
      const otherLineage = getConstructor(other)?.[__LABEL_LINEAGE__];
      const thisLineage = (this as any)[__LABEL_LINEAGE__] as readonly string[];
      return !!otherLineage && thisLineage.every((s, i) => s === otherLineage[i]);
    }

    /**
     * Check whether `other` is (or inherits from) the type instance.
     *
     * Allows 'instanceof' like checks but in instances.
     *
     * @typeParam T - The instance type.
     * @param this - The instance performing the check.
     * @param other - The object to test.
     * @returns `true` if `other` is the same instance of this type or a subtype.
     */
    isOfType<T>(this: T, other: unknown): other is GetInstance<T> {
      if (!isSigilInstance(other) || !isSigilInstance(this)) return false;
      const otherSet = getConstructor(other)?.[__LABEL_SET__];
      const thisType = getConstructor(this)[__LABEL__];
      return !!otherSet && otherSet.has(thisType);
    }

    /**
     * Strict lineage check: compares the type label lineage arrays element-by-element.
     *
     * Allows 'instanceof' like checks but in instances.
     *
     * @typeParam T - The instance type.
     * @param this - The instance performing the check.
     * @param other - The object to test.
     * @returns `true` if `other` has an identical lineage up to the length of this instance's lineage.
     */
    isOfTypeStrict<T>(this: T, other: unknown): other is GetInstance<T> {
      if (!isSigilInstance(other) || !isSigilInstance(this)) return false;
      const otherLineage = getConstructor(other)?.[__LABEL_LINEAGE__];
      const thisLineage = getConstructor(this)?.[__LABEL_LINEAGE__] as readonly string[];
      return !!otherLineage && thisLineage.every((s, i) => s === otherLineage[i]);
    }

    /**
     * Returns the human-readable sigil label of this instance's constructor.
     *
     * @returns The label string (e.g. '@scope/pkg.ClassName') or '@Sigil.unknown' in DEV when constructor is missing.
     */
    getSigilLabel(): string {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (__DEV__)
          throw new Error(`[Sigil Error] 'Sigilify(${label})' instance without constructor`);
        return '@Sigil.unknown';
      }
      return ctor.SigilLabel;
    }

    /**
     * Returns a copy of the sigil type label lineage for this instance's constructor.
     *
     * @returns readonly array of labels representing the type lineage.
     */
    getSigilLabelLineage(): readonly string[] {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (__DEV__)
          throw new Error(`[Sigil Error] 'Sigilify(${label})' instance without constructor`);
        return ['@Sigil.unknown'];
      }
      return ctor.SigilLabelLineage;
    }

    /**
     * Returns a readonly copy of the sigil type label set for this instance's constructor.
     *
     * @returns A Readonly Set of labels representing the type lineage for O(1) membership tests.
     */
    getSigilLabelSet(): Readonly<Set<string>> {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (__DEV__)
          throw new Error(`[Sigil Error] 'Sigilify(${label})' instance without constructor`);
        return new Set(['@Sigil.unknown']);
      }
      return ctor.SigilLabelSet;
    }
  }

  // Attach sigil metadata to constructor (registers label, sets labels, marks decorated)
  decorateCtor(Sigilified, l, true);

  // Mark the returned constructor as sigil (runtime flag) and as a base.
  markSigil(Sigilified);
  markSigilBase(Sigilified);

  return Sigilified;
}
