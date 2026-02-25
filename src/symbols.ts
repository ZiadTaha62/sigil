/**
 * Symbol to uniquely identify sigil classes.
 *
 * @internal
 * @constant {symbol}
 */
export const __SIGIL__ = Symbol.for('@vicin/sigil.__SIGIL__');

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
 * Symbol used to store the label lineage set for a sigil constructor.
 *
 * This is a set of labels (strings) representing the inheritance path of labels.
 *
 * @internal
 * @constant {symbol}
 */
export const __LINEAGE__ = Symbol.for('@vicin/sigil.__LINEAGE__');
