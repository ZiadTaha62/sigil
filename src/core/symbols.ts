/**
 * Symbol to uniquely identify sigil classes.
 *
 * Uses `Symbol.for()` so the symbol is stable across multiple bundles/realms
 * that share the same global symbol registry.
 *
 * @internal
 * @constant {symbol}
 */
export const __SIGIL__ = Symbol.for('@Sigil.__SIGIL__');

/**
 * Symbol to uniquely identify the base of sigil classes.
 *
 * When attached to a constructor it indicates that the constructor is a
 * sigil base and should be treated specially by inheritance checks.
 *
 * @internal
 * @constant {symbol}
 */
export const __SIGIL_BASE__ = Symbol.for('@Sigil.__SIGIL_BASE__');

/**
 * Symbol to mark constructors that were explicitly decorated with `WithSigil()`.
 *
 * This differs from `__SIGIL__` in that `__DECORATED__` indicates explicit
 * decoration (as opposed to automatically assigned labels).
 *
 * @internal
 * @constant {symbol}
 */
export const __DECORATED__ = Symbol.for('@Sigil.__DECORATED__');

/**
 * Symbol to mark that inheritance checks for a given constructor have been completed.
 *
 * This is used to avoid repeated DEV-time validation on subsequent instance creations.
 *
 * @internal
 * @constant {symbol}
 */
export const __INHERITANCE_CHECKED__ = Symbol.for(
  '@Sigil.__INHERITANCE_CHECKED__'
);

/**
 * Symbol used to store the human-readable label for a sigil constructor.
 *
 * Stored on the constructor as a non-enumerable property.
 *
 * @internal
 * @constant {symbol}
 */
export const __LABEL__ = Symbol.for('@Sigil.__LABEL__');

/**
 * Symbol used to store the linearized label lineage for a sigil constructor.
 *
 * This is an array of labels (strings) representing the inheritance path of labels.
 *
 * @internal
 * @constant {symbol}
 */
export const __LABEL_LINEAGE__ = Symbol.for('@Sigil.__LABEL_LINEAGE__');

/**
 * Symbol used to store the set of labels for a sigil constructor.
 *
 * This is a `Set<string>` that mirrors `__LABEL_LINEAGE__` for fast membership checks.
 *
 * @internal
 * @constant {symbol}
 */
export const __LABEL_SET__ = Symbol.for('@Sigil.__LABEL_SET__');

/**
 * Symbol used to store the runtime type symbol for a sigil constructor.
 *
 * This symbol (usually created via `Symbol.for(label)`) is the canonical runtime
 * identifier used by `isOfType` checks.
 *
 * @internal
 * @constant {symbol}
 */
export const __TYPE__ = Symbol.for('@Sigil.__TYPE__');

/**
 * Symbol used to store the linearized sigil type symbol chain for a constructor.
 *
 * The value stored is an array of `symbol`s representing parent → child type symbols,
 * useful for strict lineage comparisons.
 *
 * @internal
 * @constant {symbol}
 */
export const __TYPE_LINEAGE__ = Symbol.for('@Sigil.__TYPE_LINEAGE__');

/**
 * Symbol used to store the sigil type symbol set for a constructor.
 *
 * The value stored is a `Set<symbol>` built from `__TYPE_LINEAGE__` for O(1) membership checks.
 *
 * @internal
 * @constant {symbol}
 */
export const __TYPE_SET__ = Symbol.for('@Sigil.__TYPE_SET__');
