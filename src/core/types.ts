/** -----------------------------------------
 *  Class and instance
 * ----------------------------------------- */

/**
 * Static-side interface describing methods and properties added to a class
 * constructor when it is sigilized.
 *
 * The properties and methods described here mirror the getters and static
 * predicates implemented by the `Sigilify` mixin.
 *
 * @template L - Narrow string literal type representing the label.
 * @template P - Optinal parent to extend its '__SIGIL_BRAND__'.
 */
export interface ISigilStatic<L extends string = string, P extends Function = never> {
  /**
   * Compile-time nominal brand that encodes the class label `L` plus parent's brand keys `BrandOf<P>`.
   *
   * - HAVE NO RUN-TIME VALUE (undefined)
   * - Provides a *type-only* unique marker that makes instances nominally
   *   distinct by label and allows propagation/merging of brand keys across inheritance.
   */
  readonly __SIGIL_BRAND__: Prettify<{ [k in L]: true } & SigilBrandOf<P>>;

  /** Class-level label constant (human readable). */
  readonly SigilLabel: string;

  /**
   * Copy of the linearized sigil type label chain for the current constructor.
   * Useful for debugging and strict lineage comparisons.
   */
  readonly SigilLabelLineage: readonly string[];

  /**
   * Copy of the sigil type label set for the current constructor. Useful for
   * O(1) membership checks and debugging.
   */
  readonly SigilLabelSet: Readonly<Set<string>>;

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
   * calling constructor. Uses the other instance's `SigilLabelSet` to check
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
  isOfType<T extends ISigilStatic>(this: T, other: unknown): other is GetInstance<T>;

  /**
   * Strict lineage comparison: verifies that the calling constructor's type
   * lineage (by label) matches the `other`'s lineage element-by-element.
   *
   * Works in O(n) where `n` is the lineage length and is useful when order
   * and exact ancestry must be confirmed. reliable when `OPTIONS.skipLabelInheritanceCheck` is `false`.
   *
   * @typeParam T - The specific sigil constructor (`this`).
   * @param this - The constructor performing the strict check.
   * @param other - The object to test.
   * @returns A type guard asserting `other` is an instance whose lineage matches exactly.
   */
  isOfTypeStrict<T extends ISigilStatic>(this: T, other: unknown): other is GetInstance<T>;
}

/**
 * Instance-side interface describing properties present on sigil instances.
 * The methods mirror the instance helpers injected by the mixin.
 *
 * @template L - Narrow string literal type for the label returned by `getSigilLabel`.
 * @template P - Optinal parent to extend its '__SIGIL_BRAND__'.
 */
export interface ISigilInstance<L extends string = string, P extends Function = never> {
  /**
   * Compile-time nominal brand that encodes the class label `L` plus parent's brand keys `BrandOf<P>`.
   *
   * - HAVE NO RUN-TIME VALUE (undefined)
   * - Provides a *type-only* unique marker that makes instances nominally
   *   distinct by label and allows propagation/merging of brand keys across inheritance.
   */
  readonly __SIGIL_BRAND__: Prettify<{ [k in L]: true } & SigilBrandOf<P>>;
  /** Returns human-readable sigil label of the class constructor. */
  getSigilLabel(): string;
  /** Returns copy of sigil type label lineage of the class constructor. */
  getSigilLabelLineage(): readonly string[];
  /** Returns copy of sigil type label set of the class constructor. */
  getSigilLabelSet(): Readonly<Set<string>>;
  /**
   * Check whether `other` is (or inherits from) the type represented by the
   * calling constructor. Uses the other instance's `SigilLabelSet` to check
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
  isOfType<T extends ISigilInstance>(this: T, other: unknown): other is GetInstance<T>;
  /**
   * Strict lineage comparison: verifies that the calling constructor's type
   * lineage (by label) matches the `other`'s lineage element-by-element.
   *
   * Works in O(n) where `n` is the lineage length and is useful when order
   * and exact ancestry must be confirmed. reliable when `OPTIONS.skipLabelInheritanceCheck` is `false`.
   *
   * @typeParam T - The specific sigil constructor (`this`).
   * @param this - The constructor performing the strict check.
   * @param other - The object to test.
   * @returns A type guard asserting `other` is an instance whose lineage matches exactly.
   */
  isOfTypeStrict<T extends ISigilInstance>(this: T, other: unknown): other is GetInstance<T>;
}

/**
 * Combined constructor + static interface for a sigil class.
 *
 * @template L - Narrow string literal type for the label.
 * @template P - Optinal parent to extend its '__SIGIL_BRAND__'.
 */
export type ISigil<L extends string = string, P extends Function = never> = ConstructorAbstract<
  ISigilInstance<L, P>
> &
  ISigilStatic<L, P>;

/** -----------------------------------------
 *  HOF pattern types
 * ----------------------------------------- */

/**
 * Combine an existing sigil constructor type `S` with a **new** label `L`,
 * while inheriting/propagating compile-time brands from an optional parent sigil `P`.
 *
 * @template S - The original Untyped Sigil constructor type being augmented.
 * @template L - The new label literal to associate with the resulting constructor.
 */
export type TypedSigil<S extends Function, L extends string = string> = S &
  AppendLabel<L> &
  ConstructorAbstract<AppendLabel<L>>;

/**
 * Generic helper extract instance of the class even in protected and private constructors.
 * @remark Return same type is passed type has no 'prototype'
 */
export type GetInstance<T> = T extends { prototype: infer R }
  ? PrettifyBrand<R & { __SIGIL_BRAND__: SigilBrandOf<T> }>
  : T;

/** Helper to append label into a class. */
type AppendLabel<L extends string> = {
  readonly __SIGIL_BRAND__: Prettify<{ [K in L]: true }>;
};

/** -----------------------------------------
 *  Manual pattern types
 * ----------------------------------------- */

/** Update '__SIGIL_BRAND__' field when manual typing is used. */
export type UpdateSigilBrand<L extends string, P extends ISigilInstance> = Prettify<
  SigilBrandOf<P> & { [K in L]: true }
>;

/** -----------------------------------------
 *  Generic types
 * ----------------------------------------- */

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
  S extends { readonly __SIGIL_BRAND__: infer Brand } ? Brand : never,
  Record<string, true>
>;

/**
 * Generic type for class constructors used by the Sigil utilities.
 *
 * - `T` is the instance type produced by the constructor.
 * - `P` is the tuple of parameter types accepted by the constructor.
 *
 * @template T - Instance type produced by the constructor (defaults to `object`).
 * @template P - Parameter tuple type for the constructor.
 */
export type Constructor<T = object, P extends any[] = any[]> = new (...args: P) => T;

/**
 * Generic type for class constructors used by the Sigil utilities. for 'abstract classes'.
 *
 * - `T` is the instance type produced by the constructor.
 * - `P` is the tuple of parameter types accepted by the constructor.
 *
 * @template T - Instance type produced by the constructor (defaults to `object`).
 * @template P - Parameter tuple type for the constructor.
 */
export type ConstructorAbstract<T = object, P extends any[] = any[]> = abstract new (
  ...args: P
) => T;

/** Helper type to prettify value */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** Helper type to prettify value, handles nested '__SIGIL_BRAND__' field */
export type PrettifyBrand<T> = {
  [K in keyof T]: K extends '__SIGIL_BRAND__' ? PrettifyBrand<T[K]> : T[K];
} & {};

/** Helper type to replace 'never' with another type */
type IfNever<T, R = {}> = [T] extends [never] ? R : T;
