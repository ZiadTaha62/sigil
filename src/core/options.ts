import type { ISigil, SigilOptions } from './types';

/** -----------------------------------------
 *  Main options object
 * ----------------------------------------- */

/**
 * Defined SigilOptions used in the library.
 *
 * @internal
 */
export const OPTIONS: Required<SigilOptions> = {
  labelValidation: null,
  skipLabelInheritanceCheck: false,
  autofillLabels: false,
  devMarker: false,
  registry: null,
  useGlobalRegistry: false,
  storeConstructor: false,
};

/** -----------------------------------------
 *  Registry
 * ----------------------------------------- */

/**
 * Global registry key used on `globalThis` to store a map of Sigil labels and reference to their classes.
 *
 * We use `Symbol.for` so the same key survives across bundles that share the
 * global symbol registry (useful for HMR/dev workflows).
 *
 * @internal
 * @constant {symbol}
 */
const __SIGIL_REGISTRY__ = Symbol.for('@Sigil.__SIGIL_REGISTRY__');

/** Update global registry map stored. */
const updateGlobalRegistry = (map: SigilRegistry | null): void => {
  if (map === null) delete (globalThis as any)[__SIGIL_REGISTRY__];
  else (globalThis as any)[__SIGIL_REGISTRY__] = map;
};

/** Get global registry map stored. */
const getGlobalRegistry = (): SigilRegistry | null => {
  const val = (globalThis as any)[__SIGIL_REGISTRY__];
  return val === undefined ? null : (val as SigilRegistry | null);
};

/**
 * Small wrapper around a shared registry Set that provides safe operations
 * and hot-reload-friendly behavior.
 *
 * Responsibilities:
 * - Query the current registry (may be `null` to indicate disabled checks).
 * - Register / unregister labels in a controlled manner.
 * - Query class constructors using their 'SigilLabel'.
 * - Support hot-reload tolerant registration (avoid throwing in DEV).
 */
export class SigilRegistry {
  /** Internal private registry map. */
  private _registry: Map<string, ISigil | null>;

  /**
   * @param map - Map used to register 'Sigil' classes. if not passed it will be auto-generated internally.
   */
  constructor(map?: Map<string, ISigil | null>) {
    this._registry = map ?? new Map();
  }

  /**
   * Return a readonly view (array) of the current registry entries.
   *
   * @returns An array containing all registered labels, or an empty array when registry is disabled.
   */
  listLabels(): string[] {
    return this._registry ? Array.from(this._registry.keys()) : [];
  }

  /**
   * Determine whether the registry currently contains `label`.
   *
   * @param label - The label to test.
   * @returns `true` if present; `false` otherwise.
   */
  has(label: string): boolean {
    return !!this._registry && this._registry.has(label);
  }

  /**
   * Get class constructor using its label.
   *
   * @param label - Label appended to Sigil class.
   * @returns Reference to Sigil class constructor or null if stored with 'SigilOptions.storeConstructor = false'.
   */
  get(label: string): ISigil | null {
    return this._registry.get(label) ?? null;
  }

  /**
   * Register a label and class constructor in the active registry.
   *
   * If the label already exists then:
   *   - In DEV builds: prints a console warning (HMR friendly) and returns early.
   *   - In non-DEV builds: throws an Error to prevent duplicate registration.
   *
   * @param label - Label string to register (e.g. '@scope/pkg.ClassName').
   * @param Class - Constructor of the class being registered.
   * @param opts - Optional per-call overrides.
   */
  register(
    label: string,
    Class: ISigil | null,
    opts?: Pick<SigilOptions, 'devMarker' | 'storeConstructor'>
  ): void {
    if (!OPTIONS.registry) return; // DEPRECATED: support for 'REGISTRY', remove in v2.0.0
    const storeCtor = opts?.storeConstructor ?? OPTIONS.storeConstructor;
    const devMarker = opts?.devMarker ?? OPTIONS.devMarker;

    if (this._registry.has(label)) {
      const existing = this._registry.get(label);
      const isLikelyHMR = existing?.name === Class?.name;

      if (devMarker) {
        if (isLikelyHMR) {
          // The console is intentional
          // eslint-disable-next-line no-console
          console.warn(
            `[Sigil] Duplicate label "${label}" may be due to HMR — ignore if you are sure that it's defined once.`
          );
        } else {
          throw new Error(
            `[Sigil Error] Duplicate label '${label}' (different classes: ${existing?.name ?? 'unknown'} vs ${Class?.name ?? 'unknown'}).`
          );
        }
      } else {
        throw new Error(
          `[Sigil Error] Duplicate label '${label}' detected. Labels must be unique.`
        );
      }
    } else {
      this._registry.set(label, storeCtor ? Class : null);
    }
  }

  /**
   * Alias for 'SigilRegistry.register'.
   *
   * @param label - Label string to register (e.g. '@scope/pkg.ClassName').
   * @param Class - Constructor of the class being registered.
   * @param opts - Optional per-call overrides.
   */
  set(
    label: string,
    Class: ISigil | null,
    opts?: Pick<SigilOptions, 'devMarker' | 'storeConstructor'>
  ): void {
    return this.register(label, Class, opts);
  }

  /**
   * Unregister a previously registered class.
   *
   * @param label - The label to remove from the registry.
   * @returns `true` if the label was present and removed; `false` otherwise (or when registry is disabled).
   */
  unregister(label: string): boolean {
    return this._registry.delete(label);
  }

  /**
   * Alias for 'SigilRegistry.unregister'.
   *
   * @param label - The label to remove from the registry.
   * @returns `true` if the label was present and removed; `false` otherwise (or when registry is disabled).
   */
  delete(label: string): boolean {
    return this.unregister(label);
  }

  /**
   * Replace active registry with new one. deprecated use 'updateOptions({ registry: newRegistry })' instead.
   *
   * @deprecated Will be removed in v2.0.0, check https://www.npmjs.com/package/@vicin/sigil?activeTab=readme#deprecated-api for more details.
   * @param newRegistry - New Set<string> instance to use as the active registry, or `null` to disable checks.
   */
  replaceRegistry(newRegistry: Map<string, ISigil | null> | null): void {
    if (newRegistry)
      updateOptions({ registry: new SigilRegistry(newRegistry) });
    else updateOptions({ registry: newRegistry });
  }

  /**
   * Clear the registry completely.
   *
   * Useful for test teardown, or when explicitly resetting state during development.
   * No-op when the registry is disabled.
   */
  clear(): void {
    this._registry.clear();
  }

  /**
   * Merge another SigilRegistry into this one.
   *
   * Entries from `other` will be registered into this registry. Duplicate labels
   * are handled via this registry's `register` logic (i.e., will warn in DEV or
   * throw in production).
   *
   * @param other - Another `SigilRegistry` whose entries will be merged into this registry.
   */
  merge(other: SigilRegistry): void {
    if (!OPTIONS.registry) return; // DEPRECATED: support for 'REGISTRY', remove in v2.0.0
    for (const [label, ctor] of other) this.register(label, ctor);
  }

  /**
   * Return a Map-style iterator over entries: `[label, constructor]`.
   * Equivalent to calling `registry[Symbol.iterator]()`.
   *
   * @returns IterableIterator of `[label, ISigil]`.
   */
  entries(): IterableIterator<[string, ISigil | null]> {
    return this._registry.entries();
  }

  /**
   * Return an iterator over registered constructors.
   *
   * @returns IterableIterator of `ISigil` constructors.
   */
  values(): IterableIterator<ISigil | null> {
    return this._registry.values();
  }

  /**
   * Return an iterator over registered labels (keys).
   *
   * @returns IterableIterator of `string` labels.
   */
  keys(): IterableIterator<string> {
    return this._registry.keys();
  }

  /**
   * Execute a provided function once per registry entry.
   *
   * @param callback - Function invoked with `(ctor, label)` for each entry.
   * @param thisArg - Optional `this` context for the callback.
   */
  forEach(
    callback: (ctor: ISigil | null, label: string) => void,
    thisArg?: any
  ): void {
    this._registry.forEach((ctor, label) =>
      callback.call(thisArg, ctor, label)
    );
  }

  /**
   * Get the size (number of entries) of the active registry.
   *
   * @returns The number of registered labels, or 0 when registry is disabled.
   */
  get size(): number {
    return this._registry.size;
  }

  /**
   * Return an iterator over `[label, constructor]` pairs.
   *
   * This makes the registry compatible with `for..of` and other iterable helpers:
   * ```ts
   * for (const [label, ctor] of registry) { ... }
   * ```
   *
   * @returns An iterable iterator that yields `[label, ISigil]` tuples.
   */
  [Symbol.iterator](): IterableIterator<[string, ISigil | null]> {
    return this._registry[Symbol.iterator]();
  }
}

/**
 * Returns the currently configured SigilRegistry instance (or `null` if no registry is active).
 *
 * IMPORTANT: this function reflects the live `OPTIONS.registry` value and therefore
 * will reflect any changes made via `updateOptions(...)`. Consumers that need a stable
 * registry instance for mutation should call this function each time rather than
 * holding a long-lived reference to the previously returned object.
 *
 * It gets global registry if defined, otherwise returns registry stored in SigilOptions.
 *
 * @returns {SigilRegistry | null} The active registry or `null` when no registry is in use.
 */
export const getActiveRegistry = (): SigilRegistry | null => {
  const globalRegistry = getGlobalRegistry();
  if (globalRegistry) return globalRegistry;
  return OPTIONS.registry;
};

/** -----------------------------------------
 *  Deprecated registry
 * ----------------------------------------- */

/**
 * Old 'REGISTRY' alias to interact with registy.
 *
 * 'REGISTRY' is a live binding for compat; prefer getActiveRegistry() to avoid manual sync.
 * @deprecated Will be removed in v2.0.0, check https://www.npmjs.com/package/@vicin/sigil?activeTab=readme#deprecated-api for more details.
 */
let REGISTRY = OPTIONS.registry!;

/** -----------------------------------------
 *  Label validation
 * ----------------------------------------- */

/**
 * Label validation regex. Labels must follow the pattern
 * `@scope/package.ClassName` where `ClassName` begins with an uppercase
 * letter. This avoids collisions across packages and helps debugging.
 *
 * It's advised to use this regex in 'SigilOptions.labelValidation'.
 */
export const DEFAULT_LABEL_REGEX = /^@[\w-]+(?:\/[\w-]+)*\.[A-Z][A-Za-z0-9]*$/;

/** -----------------------------------------
 *  Deprecated registry
 * ----------------------------------------- */

/**
 * Update runtime options for the Sigil library.
 * Call this early during application startup if you want non-default behavior.
 *
 * Example:
 * ```ts
 * updateOptions({ autofillLabels: true, labelValidation: /^@[\w-]+\/[\w-]+\.[A-Za-z0-9]+$/ });
 * ```
 *
 * @param opts - Partial options to merge into the global `OPTIONS` object.
 * @param mergeRegistries - Boolean to merge old registry into new one directly, default is 'true'.
 */
export const updateOptions = (
  opts: SigilOptions,
  mergeRegistries: boolean = true
): void => {
  // apply side effects
  applyBeforeSideEffects(OPTIONS, opts, mergeRegistries);
  // update options
  for (const [k, v] of Object.entries(opts)) (OPTIONS as any)[k] = v;
  // apply side effects
  applyAfterSideEffects(OPTIONS);
};

/**
 * Function to apply side effects before options update.
 *
 * @param oldOpts - Old options object.
 * @param newOpts - New options object
 */
function applyBeforeSideEffects(
  oldOpts: Required<SigilOptions>,
  newOpts: SigilOptions,
  mergeRegistries: boolean
): void {
  if (mergeRegistries && newOpts.registry && oldOpts.registry)
    newOpts.registry.merge(oldOpts.registry);
}

/**
 * Function to apply side effects after options update.
 *
 * @param opts - New options object.
 */
function applyAfterSideEffects(opts: Required<SigilOptions>): void {
  if (opts.useGlobalRegistry) updateGlobalRegistry(opts.registry);
  else updateGlobalRegistry(null);

  // DEPRECATED: support for 'REGISTRY', remove in v2.0.0
  if (OPTIONS.registry) REGISTRY = OPTIONS.registry;
  else REGISTRY = new SigilRegistry();
}

/**
 * Default runtime options used by the Sigil library.
 *
 * @internal
 */
const DEFAULT_OPTIONS: Required<SigilOptions> = {
  labelValidation: null,
  skipLabelInheritanceCheck: false,
  autofillLabels: false,
  devMarker: process.env.NODE_ENV !== 'production',
  registry: new SigilRegistry(),
  useGlobalRegistry: true,
  storeConstructor: true,
};

// populate 'OPTIONS' with DEFAULT_OPTIONS
updateOptions(DEFAULT_OPTIONS);

// DEPRECATED: support for 'REGISTRY', remove in v2.0.0
export { REGISTRY };
