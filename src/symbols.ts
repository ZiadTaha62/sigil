/**
 * Symbol to uniquely identify sigil classes.
 *
 * @constant {symbol}
 */
export const __SIGIL__ = Symbol.for('@vicin/sigil.__SIGIL__');

/**
 * Symbol used to store the identity label for a sigil constructor.
 *
 * Stored on the constructor as a non-enumerable property.
 *
 * @constant {symbol}
 */
export const __LABEL__ = Symbol.for('@vicin/sigil.__LABEL__');

/**
 * Symbol used to store the human-readable label for a sigil constructor, it can be inherited if no label is deined.
 *
 * Stored on the constructor as a non-enumerable property.
 *
 * @constant {symbol}
 */
export const __EFFECTIVE_LABEL__ = Symbol.for('@vicin/sigil.__EFFECTIVE_LABEL__');

/**
 * Symbol used to store the depth inside Sigil chain. used in exact checks
 *
 * @constant {symbol}
 */
export const __DEPTH__ = Symbol.for('@vicin/sigil.__DEPTH__');
