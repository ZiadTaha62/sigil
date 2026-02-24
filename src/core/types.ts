/** -----------------------------------------
 *  Nominal identity symbol
 * ----------------------------------------- */

/**
 * Symbol used for nominal typing
 */
export declare const sigil: unique symbol;

/** -----------------------------------------
 *  Class and instance
 * ----------------------------------------- */

/**
 * Static-side interface describing methods and properties added to a class
 * constructor when it is sigilified.
 *
 * The properties and methods described here mirror the getters and static
 * predicates implemented by the `Sigilify` mixin.
 *
 * @template L - Narrow string literal type representing the label.
 * @template P - Optinal parent to extend its '[sigil]'.
 */
export interface ISigilStatic<L extends string = string> {
  /** Class-level label constant (identity). */
  readonly SigilLabel: L;

  /** Class-level label constant (human readable). */
  readonly SigilEffectiveLabel: L;

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
  isOfType<T extends ISigilStatic>(this: T, other: unknown): other is T;

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
  isOfTypeStrict<T extends ISigilStatic>(this: T, other: unknown): other is T;
}

/**
 * Instance-side interface describing properties present on sigil instances.
 * The methods mirror the instance helpers injected by the mixin.
 *
 * @template L - Narrow string literal type for the label returned by `getSigilLabel`.
 * @template P - Optinal parent to extend its '[sigil]'.
 */
export interface ISigilInstance<L extends string = string, P extends Function = never> {
  /**
   * Compile-time nominal brand that encodes the class label `L` plus parent's brand keys `BrandOf<P>`.
   *
   * - HAVE NO RUN-TIME VALUE (undefined)
   * - Provides a *type-only* unique marker that makes instances nominally
   *   distinct by label and allows propagation/merging of brand keys across inheritance.
   */
  readonly [sigil]: Prettify<IfNever<SigilOf<P>, {}> & { [k in L]: true }>;
  /** Returns identity sigil label of the class constructor. */
  getSigilLabel(): string;
  /** Returns human-readable sigil label of the class constructor. */
  getSigilEffectiveLabel(): string;
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
  isOfType<T extends ISigilInstance>(this: T, other: unknown): other is T;
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
  isOfTypeStrict<T extends ISigilInstance>(this: T, other: unknown): other is T;
}

/**
 * Combined constructor + static interface for a sigil class.
 *
 * @template L - Narrow string literal type for the label.
 * @template P - Optinal parent to extend its '[sigil]'.
 */
export type ISigil<L extends string = string, P extends Function = never> = ConstructorAbstract<
  ISigilInstance<L, P>
> &
  ISigilStatic<L>;

/** Update '[sigil]' field when manual typing is used. */
export type ExtendSigil<L extends string, P extends ISigilInstance> = Prettify<
  IfNever<SigilOf<P>, {}> & { [K in L]: true }
>;

/**
 * Extract the compile-time brand map from a sigil instance `S`.
 *
 * @typeParam S - A sigil instance type.
 * @returns The sigil brand record (e.g. `{ User: true, Admin: true }`) or never if not Sigil class instance.
 */
export type SigilOf<S> = S extends { readonly [sigil]: infer Sigil } ? Sigil : never;

/** -----------------------------------------
 *  Generic types
 * ----------------------------------------- */

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

/** Helper type to replace 'never' with another type */
type IfNever<T, R = {}> = [T] extends [never] ? R : T;
