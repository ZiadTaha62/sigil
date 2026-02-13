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
import { OPTIONS } from './options';
import { __LABEL__, __TYPE__, __TYPE_LINEAGE__, __TYPE_SET__ } from './symbols';
import type {
  Constructor,
  ISigil,
  SigilOptions,
  Prettify,
  GetInstance,
  ConstructorAbstract,
} from './types';

/**
 * Mixin factory that augments an existing class with Sigil runtime metadata and
 * helpers.
 *
 * The returned class:
 * - registers a stable symbol for the provided `label` (via `WithSigil`)
 * - exposes static helpers such as `SigilLabel`, `SigilType`, `isOfType`, and `isOfTypeStrict`
 * - exposes instance helpers such as `getSigilLabel`, `getSigilType`, etc.
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
  if (isSigilCtor(Base))
    throw new Error(`[Sigil Error] 'Sigilify(${label})' already siglified.`);

  // generate random label if not passed and verify it
  let l: string;
  if (label) {
    verifyLabel(label, opts);
    l = label;
  } else l = generateRandomLabel();

  // extend actual class
  class Sigilified extends Base {
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
     * Class-level unique runtime symbol used as the type identifier.
     *
     * This symbol is created with `Symbol.for(label)` during decoration so it is
     * stable across realms that share the same global symbol registry.
     */
    static get SigilType(): symbol {
      return (this as any)[__TYPE__];
    }

    /**
     * Copy of the linearized sigil type symbol chain for the current constructor.
     *
     * Useful for debugging and performing strict lineage comparisons.
     *
     * @returns An array of symbols representing parent → child type symbols.
     */
    static get SigilTypeLineage(): readonly symbol[] {
      return [...((this as any)[__TYPE_LINEAGE__] ?? [])];
    }

    /**
     * Copy of the sigil type symbol set for the current constructor.
     *
     * Useful for quick membership checks (O(1) lookups) and debugging.
     *
     * @returns A Readonly Set of symbols that represent the type lineage.
     */
    static get SigilTypeSet(): Readonly<Set<symbol>> {
      const set: Set<symbol> = new Set();
      for (const s of (this as any)[__TYPE_SET__]) set.add(s);
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
        if (opts?.devMarker ?? OPTIONS.devMarker)
          throw new Error(
            `[Sigil Error] 'Sigilify(${label})' instance without constructor`
          );
        return;
      }

      // Perform dev-only inheritance validation to ensure labels are unique across the chain.
      checkInheritance(ctor);
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
     * - Uses the other instance's `__TYPE_SET__` for O(1) membership test.
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
      if (!isSigilInstance(other)) return false;

      const otherCtor = getConstructor(other);
      if (!otherCtor) return false;
      const otherSet = otherCtor[__TYPE_SET__] as Set<symbol> | undefined;
      return !!otherSet && otherSet.has((this as any).SigilType);
    }

    /**
     * Strict lineage check: compares the type symbol lineage arrays element-by-element.
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
      if (!isSigilInstance(other)) return false;

      const otherCtor = getConstructor(other);
      if (!otherCtor) return false;
      const otherLineage = otherCtor[__TYPE_LINEAGE__] as readonly symbol[];
      const thisLineage = (this as any)[__TYPE_LINEAGE__] as readonly symbol[];
      return (
        !!otherLineage && thisLineage.every((s, i) => s === otherLineage[i])
      );
    }

    /**
     * Returns the human-readable sigil label of this instance's constructor.
     *
     * @returns The label string (e.g. '@scope/pkg.ClassName') or '@Sigil.unknown' in DEV when constructor is missing.
     */
    getSigilLabel(): string {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (opts?.devMarker ?? OPTIONS.devMarker)
          throw new Error(
            `[Sigil Error] 'Sigilify(${label})' instance without constructor`
          );
        return '@Sigil.unknown';
      }
      return ctor.SigilLabel;
    }

    /**
     * Returns the runtime sigil type symbol of this instance's constructor.
     *
     * @returns The symbol that identifies this type at runtime.
     */
    getSigilType(): symbol {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (opts?.devMarker ?? OPTIONS.devMarker)
          throw new Error(
            `[Sigil Error] 'Sigilify(${label})' instance without constructor`
          );
        return Symbol.for('@Sigil.unknown');
      }
      return ctor.SigilType;
    }

    /**
     * Returns a copy of the sigil type symbol lineage for this instance's constructor.
     *
     * @returns readonly array of symbols representing the type lineage.
     */
    getSigilTypeLineage(): readonly symbol[] {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (opts?.devMarker ?? OPTIONS.devMarker)
          throw new Error(
            `[Sigil Error] 'Sigilify(${label})' instance without constructor`
          );
        return [Symbol.for('@Sigil.unknown')];
      }
      return ctor.SigilTypeLineage;
    }

    /**
     * Returns a readonly copy of the sigil type symbol set for this instance's constructor.
     *
     * @returns A Readonly Set of symbols representing the type lineage for O(1) membership tests.
     */
    getSigilTypeSet(): Readonly<Set<symbol>> {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (opts?.devMarker ?? OPTIONS.devMarker)
          throw new Error(
            `[Sigil Error] 'Sigilify(${label})' instance without constructor`
          );
        return new Set([Symbol.for('@Sigil.unknown')]);
      }
      return ctor.SigilTypeSet;
    }
  }

  // Attach sigil metadata to constructor (registers label, sets symbols, marks decorated)
  decorateCtor(Sigilified, l, opts, true);

  // Mark the returned constructor as sigil (runtime flag) and as a base.
  markSigil(Sigilified);
  markSigilBase(Sigilified);

  return Sigilified;
}

/**
 * Mixin factory that augments an existing class with Sigil runtime metadata and
 * helpers. Accept and return 'abstract' class.
 *
 * The returned class:
 * - registers a stable symbol for the provided `label` (via `WithSigil`)
 * - exposes static helpers such as `SigilLabel`, `SigilType`, `isOfType`, and `isOfTypeStrict`
 * - exposes instance helpers such as `getSigilLabel`, `getSigilType`, etc.
 *
 * @param Base - The base constructor to extend.
 * @param label - Optional identity label to attach to the resulting class (e.g. '@scope/pkg.ClassName').
 *                If not passed a random label is generated instead.
 * @param opts - Options object to override any global options if needed.
 * @returns A new abstract constructor that extends `Base` and includes Sigil statics/instance methods.
 * @throws Error if `Base` is already sigilized.
 */
export function SigilifyAbstract<
  B extends ConstructorAbstract,
  L extends string,
>(Base: B, label?: L, opts?: SigilOptions) {
  // if siglified throw
  if (isSigilCtor(Base))
    throw new Error(`[Sigil Error] 'Sigilify(${label})' already siglified.`);

  // generate random label if not passed and verify it
  let l: string;
  if (label) {
    verifyLabel(label, opts);
    l = label;
  } else l = generateRandomLabel();

  // extend actual class
  abstract class Sigilified extends Base {
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
     * Class-level unique runtime symbol used as the type identifier.
     *
     * This symbol is created with `Symbol.for(label)` during decoration so it is
     * stable across realms that share the same global symbol registry.
     */
    static get SigilType(): symbol {
      return (this as any)[__TYPE__];
    }

    /**
     * Copy of the linearized sigil type symbol chain for the current constructor.
     *
     * Useful for debugging and performing strict lineage comparisons.
     *
     * @returns An array of symbols representing parent → child type symbols.
     */
    static get SigilTypeLineage(): readonly symbol[] {
      return [...((this as any)[__TYPE_LINEAGE__] ?? [])];
    }

    /**
     * Copy of the sigil type symbol set for the current constructor.
     *
     * Useful for quick membership checks (O(1) lookups) and debugging.
     *
     * @returns A Readonly Set of symbols that represent the type lineage.
     */
    static get SigilTypeSet(): Readonly<Set<symbol>> {
      const set: Set<symbol> = new Set();
      for (const s of (this as any)[__TYPE_SET__]) set.add(s);
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
        if (opts?.devMarker ?? OPTIONS.devMarker)
          throw new Error(
            `[Sigil Error] 'Sigilify(${label})' instance without constructor`
          );
        return;
      }

      // Perform dev-only inheritance validation to ensure labels are unique across the chain.
      checkInheritance(ctor);
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
     * - Uses the other instance's `__TYPE_SET__` for O(1) membership test.
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
      if (!isSigilInstance(other)) return false;

      const otherCtor = getConstructor(other);
      if (!otherCtor) return false;
      const otherSet = otherCtor[__TYPE_SET__] as Set<symbol> | undefined;
      return !!otherSet && otherSet.has((this as any).SigilType);
    }

    /**
     * Strict lineage check: compares the type symbol lineage arrays element-by-element.
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
      if (!isSigilInstance(other)) return false;

      const otherCtor = getConstructor(other);
      if (!otherCtor) return false;
      const otherLineage = otherCtor[__TYPE_LINEAGE__] as readonly symbol[];
      const thisLineage = (this as any)[__TYPE_LINEAGE__] as readonly symbol[];
      return (
        !!otherLineage && thisLineage.every((s, i) => s === otherLineage[i])
      );
    }

    /**
     * Returns the human-readable sigil label of this instance's constructor.
     *
     * @returns The label string (e.g. '@scope/pkg.ClassName') or '@Sigil.unknown' in DEV when constructor is missing.
     */
    getSigilLabel(): string {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (opts?.devMarker ?? OPTIONS.devMarker)
          throw new Error(
            `[Sigil Error] 'Sigilify(${label})' instance without constructor`
          );
        return '@Sigil.unknown';
      }
      return ctor.SigilLabel;
    }

    /**
     * Returns the runtime sigil type symbol of this instance's constructor.
     *
     * @returns The symbol that identifies this type at runtime.
     */
    getSigilType(): symbol {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (opts?.devMarker ?? OPTIONS.devMarker)
          throw new Error(
            `[Sigil Error] 'Sigilify(${label})' instance without constructor`
          );
        return Symbol.for('@Sigil.unknown');
      }
      return ctor.SigilType;
    }

    /**
     * Returns a copy of the sigil type symbol lineage for this instance's constructor.
     *
     * @returns readonly array of symbols representing the type lineage.
     */
    getSigilTypeLineage(): readonly symbol[] {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (opts?.devMarker ?? OPTIONS.devMarker)
          throw new Error(
            `[Sigil Error] 'Sigilify(${label})' instance without constructor`
          );
        return [Symbol.for('@Sigil.unknown')];
      }
      return ctor.SigilTypeLineage;
    }

    /**
     * Returns a readonly copy of the sigil type symbol set for this instance's constructor.
     *
     * @returns A Readonly Set of symbols representing the type lineage for O(1) membership tests.
     */
    getSigilTypeSet(): Readonly<Set<symbol>> {
      const ctor = getConstructor(this);
      if (!ctor) {
        if (opts?.devMarker ?? OPTIONS.devMarker)
          throw new Error(
            `[Sigil Error] 'Sigilify(${label})' instance without constructor`
          );
        return new Set([Symbol.for('@Sigil.unknown')]);
      }
      return ctor.SigilTypeSet;
    }
  }

  // Attach sigil metadata to constructor (registers label, sets symbols, marks decorated)
  decorateCtor(Sigilified, l, opts, true);

  // Mark the returned constructor as sigil (runtime flag) and as a base.
  markSigil(Sigilified);
  markSigilBase(Sigilified);

  return Sigilified;
}
