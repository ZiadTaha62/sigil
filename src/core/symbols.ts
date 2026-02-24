/**
 * Symbol to uniquely identify sigil classes.
 *
 * @internal
 * @constant {symbol}
 */
export const __SIGIL__ = Symbol.for('@vicin/sigil.__SIGIL__');

/**
 * Symbol to uniquely identify the base of sigil classes.
 *
 * When attached to a constructor it indicates that the constructor is a
 * sigil base and should be treated specially by inheritance checks.
 *
 * @internal
 * @constant {symbol}
 */
export const __SIGIL_BASE__ = Symbol.for('@vicin/sigil.__SIGIL_BASE__');

/**
 * Symbol to mark constructors that were explicitly decorated with `WithSigil()`.
 *
 * This differs from `__SIGIL__` in that `__DECORATED__` indicates explicit
 * decoration (as opposed to automatically assigned labels).
 *
 * @internal
 * @constant {symbol}
 */
export const __DECORATED__ = Symbol.for('@vicin/sigil.__DECORATED__');

/**
 * Symbol to mark that inheritance checks for a given constructor have been completed.
 *
 * This is used to avoid repeated DEV-time validation on subsequent instance creations.
 *
 * @internal
 * @constant {symbol}
 */
export const __INHERITANCE_CHECKED__ = Symbol.for('@vicin/sigil.__INHERITANCE_CHECKED__');

/**
 * Symbol used to store the identity label for a sigil constructor.
 *
 * Stored on the constructor as a non-enumerable property.
 *
 * @internal
 * @constant {symbol}
 */
export const __LABEL__ = Symbol.for('@vicin/sigil.__LABEL__');

/**
 * Symbol used to store the human-readable label for a sigil constructor, it can be inherited if no label is deined.
 *
 * Stored on the constructor as a non-enumerable property.
 *
 * @internal
 * @constant {symbol}
 */
export const __EFFECTIVE_LABEL__ = Symbol.for('@vicin/sigil.__EFFECTIVE_LABEL__');

/**
 * Symbol used to store the linearized label lineage for a sigil constructor.
 *
 * This is an array of labels (strings) representing the inheritance path of labels.
 *
 * @internal
 * @constant {symbol}
 */
export const __LABEL_LINEAGE__ = Symbol.for('@vicin/sigil.__LABEL_LINEAGE__');

/**
 * Symbol used to store the set of labels for a sigil constructor.
 *
 * This is a `Set<string>` that mirrors `__LABEL_LINEAGE__` for fast membership checks.
 *
 * @internal
 * @constant {symbol}
 */
export const __LABEL_SET__ = Symbol.for('@vicin/sigil.__LABEL_SET__');
