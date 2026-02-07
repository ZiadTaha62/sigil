/**
 * Generic type for class constructors used by the Sigil utilities.
 *
 * - `T` is the instance type produced by the constructor.
 * - `P` is the tuple of parameter types accepted by the constructor.
 *
 * @template T - Instance type produced by the constructor (defaults to `object`).
 * @template P - Parameter tuple type for the constructor.
 */
export type Constructor<T = object, P extends any[] = any[]> = new (
  ...args: P
) => T;

/**
 * Static-side interface describing methods and properties added to a class
 * constructor when it is sigilized.
 *
 * The properties and methods described here mirror the getters and static
 * predicates implemented by the `Sigilify` mixin.
 *
 * @template L - Narrow string literal type representing the label.
 * @template US - Optinal original Untyped Sigil constructor type being augmented.
 */
export interface ISigilStatic<
  L extends string = string,
  US extends Function = never,
> {
  /**
   * Compile-time nominal brand that encodes the class label `L` plus parent's brand keys `BrandOf<P>`.
   *
   * - Provides a *type-only* unique marker that makes instances nominally
   *   distinct by label and allows propagation/merging of brand keys across inheritance.
   * - Runtime: **no runtime value is required**; this property exists only for the type system.
   *
   * @remarks
   * Consumers should not read or set this property at runtime. It is used by helper
   * types (e.g. `SigilBrandOf`, `TypedSigil`) to extract/propagate compile-time brands.
   */
  readonly __SIGIL_BRAND__: Prettify<{ [k in L]: true } & SigilBrandOf<US>>;

  /** Class-level label constant (human readable). */
  readonly SigilLabel: string;

  /** Class-level unique symbol used as the runtime type identifier. */
  readonly SigilType: symbol;

  /**
   * Copy of the linearized sigil type symbol chain for the current constructor.
   * Useful for debugging and strict lineage comparisons.
   */
  readonly SigilTypeLineage: readonly symbol[];

  /**
   * Copy of the sigil type symbol set for the current constructor. Useful for
   * O(1) membership checks and debugging.
   */
  readonly SigilTypeSet: Readonly<Set<symbol>>;

  /**
   * Runtime check that determines whether `obj` is an instance produced by a
   * sigil class.
   *
   * Note: the concrete implementation provided by the mixin delegates to
   * `isSigilInstance`.
   *
   * @param obj - Value to test.
   * @returns Type guard narrowing `obj` to `ISigil`.
   */
  isSigilified(obj: unknown): obj is ISigil;

  /**
   * Check whether `other` is (or inherits from) the type represented by the
   * calling constructor. Uses the other instance's `SigilTypeSet` to check
   * membership. Works in O(1) and is reliable as long as `OPTIONS.skipLabelInheritanceCheck` is `false`.
   *
   * This replaces `instanceof` so that checks remain valid across bundles/realms
   * and when subclassing.
   *
   * @typeParam T - The specific sigil constructor (`this`).
   * @param this - The constructor performing the type check.
   * @param other - The object to test.
   * @returns A type guard asserting `other` is an instance of the constructor.
   */
  isOfType<T extends ISigil>(this: T, other: unknown): other is InstanceType<T>;

  /**
   * Strict lineage comparison: verifies that the calling constructor's type
   * lineage (by symbol) matches the `other`'s lineage element-by-element.
   *
   * Works in O(n) where `n` is the lineage length and is useful when order
   * and exact ancestry must be confirmed. reliable when `OPTIONS.skipLabelInheritanceCheck` is `false`.
   *
   * @typeParam T - The specific sigil constructor (`this`).
   * @param this - The constructor performing the strict check.
   * @param other - The object to test.
   * @returns A type guard asserting `other` is an instance whose lineage matches exactly.
   */
  isOfTypeStrict<T extends ISigil>(
    this: T,
    other: unknown
  ): other is InstanceType<T>;
}

/**
 * Instance-side interface describing properties present on sigil instances.
 * The methods mirror the instance helpers injected by the mixin.
 *
 * @template L - Narrow string literal type for the label returned by `getSigilLabel`.
 * @template US - Optinal original Untyped Sigil constructor type being augmented.
 */
export interface ISigilInstance<
  L extends string = string,
  US extends Function = never,
> {
  /**
   * Compile-time nominal brand that encodes the class label `L` plus parent's brand keys `BrandOf<P>`.
   *
   * - Provides a *type-only* unique marker that makes instances nominally
   *   distinct by label and allows propagation/merging of brand keys across inheritance.
   * - Runtime: **no runtime value is required**; this property exists only for the type system.
   *
   * @remarks
   * Consumers should not read or set this property at runtime. It is used by helper
   * types (e.g. `SigilBrandOf`, `TypedSigil`) to extract/propagate compile-time brands.
   */
  readonly __SIGIL_BRAND__: Prettify<{ [k in L]: true } & SigilBrandOf<US>>;
  /** Returns human-readable sigil label of the class constructor. */
  getSigilLabel(): string;
  /** Returns runtime sigil type symbol of the class constructor. */
  getSigilType(): symbol;
  /** Returns copy of sigil type symbol lineage of the class constructor. */
  getSigilTypeLineage(): readonly symbol[];
  /** Returns copy of sigil type symbol set of the class constructor. */
  getSigilTypeSet(): Readonly<Set<symbol>>;
}

/**
 * Combined constructor + static interface for a sigil class.
 *
 * This composes the instance-side shape (Constructor<ISigilInstance<L>>) with
 * the static-side interface (ISigilStatic<L>), matching the runtime shape added
 * by `Sigilify`.
 *
 * @template L - Narrow string literal type for the label.
 * @template US - Optinal original Untyped Sigil constructor type being augmented.
 */
export type ISigil<
  L extends string = string,
  US extends Function = never,
> = Constructor<ISigilInstance<L, US>> & ISigilStatic<L, US>;

/**
 * Extract the compile-time brand map from a sigil constructor `S`.
 *
 * @typeParam S - A sigil constructor type (e.g. `typeof SomeSigilClass`).
 * @returns The brand record carried on the constructor's instance type (e.g. `{ User: true, Admin: true }`).
 *
 * @remarks
 * - This helper is used purely at the type level to compute the set of brand keys
 *   that should be propagated to derived sigils.
 * - If `S` does not carry a `__SIGIL_BRAND__`, the resulting type is `never` and `IfNever<>`
 *   collapses it to an empty record.
 */
export type SigilBrandOf<S> = IfNever<
  S extends { readonly __SIGIL_BRAND__: infer Brand } ? Prettify<Brand> : never,
  Record<string, true>
>;

/**
 * Combine an existing sigil constructor type `S` with a **new** label `L`,
 * while inheriting/propagating compile-time brands from an optional parent sigil `P`.
 *
 * @template US - The original Untyped Sigil constructor type being augmented.
 * @template L - The new label literal to associate with the resulting constructor.
 */
export type TypedSigil<US extends Function, L extends string = string> = US &
  ISigil<L, US>;

/**
 * Generic helper extract instance of the class even in protected and private constructors.
 */
export type GetInstance<T> = T extends { prototype: infer R }
  ? Prettify<R & { __SIGIL_BRAND__: SigilBrandOf<T> }>
  : never;

/** Helper type to prettify value. */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** Helper type to replace 'never' with another type */
type IfNever<T, R = {}> = [T] extends [never] ? R : T;
