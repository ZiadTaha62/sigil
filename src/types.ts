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
   * Useful for debugging.
   */
  readonly SigilLabelLineage: readonly string[];

  /**
   * Copy of the sigil type label set for the current constructor.
   * Useful for debugging.
   */
  readonly SigilLabelSet: Readonly<Set<string>>;

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
  isOfType<T extends ISigilStatic>(this: T, other: unknown): other is GetPrototype<T>;

  /**
   * Check whether `other` is exactly the same instance represented by the
   * calling constructor.
   *
   * @typeParam T - The specific sigil constructor (`this`).
   * @param this - The constructor performing the type check.
   * @param other - The object to test.
   * @returns A type guard asserting `other` is an instance of the constructor.
   */
  isExactType<T extends ISigilStatic>(this: T, other: unknown): other is GetPrototype<T>;
}

/**
 * Instance-side interface describing properties present on sigil instances.
 * The methods mirror the instance helpers injected by the mixin.
 *
 * @template L - Narrow string literal type for the label returned by `getSigilLabel`.
 * @template P - Optinal parent to extend its '[sigil]'.
 */
export interface ISigilInstance<L extends string = string, P extends Function = never> {
  /** Compile-time nominal brand that encodes the class label `L` plus parent's sigil labels `SigilOf<P>`. */
  readonly [sigil]: Prettify<{ Sigil: true } & IfNever<SigilOf<P>, {}> & { [k in L]: true }>;
  /** Returns identity sigil label of the class constructor. */
  getSigilLabel(): string;
  /** Returns human-readable sigil label of the class constructor. */
  getSigilEffectiveLabel(): string;
  /** Returns copy of sigil type label lineage of the class constructor. */
  getSigilLabelLineage(): readonly string[];
  /** Returns copy of sigil type label set of the class constructor. */
  getSigilLabelSet(): Readonly<Set<string>>;
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
  isOfType<T extends ISigilInstance>(this: T, other: unknown): other is T;

  /**
   * Check whether `other` is exactly the same instance represented by the
   * calling constructor.
   *
   * @typeParam T - The specific sigil constructor (`this`).
   * @param this - The constructor performing the type check.
   * @param other - The object to test.
   * @returns A type guard asserting `other` is an instance of the constructor.
   */
  isExactType<T extends ISigilInstance>(this: T, other: unknown): other is T;
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

/** Update '[sigil]' field for nominal typing */
export type ExtendSigil<L extends string, P extends ISigilInstance> = Prettify<
  IfNever<SigilOf<P>, {}> & { [K in L]: true }
>;

/**
 * Extract the compile-time label map from a sigil instance `S`.
 *
 * @typeParam S - A sigil instance type.
 * @returns The sigil label record (e.g. `{ User: true, Admin: true }`) or never if not Sigil class instance.
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

/**
 * Helper type to get prototype of class
 *
 * @template T - Class constructor.
 */
export type GetPrototype<T> = T extends { prototype: infer P } ? P : never;
