import { OPTIONS, type SigilOptions } from './options';
import type { ISigil } from './types';

/** --------------------------------
 *  Default registry
 * -------------------------------- */

/**
 * Global registry key used on `globalThis` to store a map of Sigil labels and reference to there classes.
 *
 * We use `Symbol.for` so the same key survives across bundles that share the
 * global symbol registry (useful for HMR/dev workflows).
 *
 * @internal
 * @constant {symbol}
 */
const __SIGIL_REGISTRY__ = Symbol.for('@Sigil.__SIGIL_REGISTRY__');

/**
 * Lazily initialize and return the global label registry Map.
 *
 * The registry is stored on `globalThis` so it survives module reloads during HMR.
 * If registry checks are intentionally disabled, users can replace the active registry
 * with `null` via `REGISTRY.replaceRegistry(null)`.
 *
 * @returns A Map<string, ISigil> representing the active registry (created if missing).
 */
const getGlobalRegistry = (): Map<string, ISigil> => {
  if (!(__SIGIL_REGISTRY__ in globalThis)) {
    (globalThis as any)[__SIGIL_REGISTRY__] = new Map<string, ISigil>();
  }
  return (globalThis as any)[__SIGIL_REGISTRY__] as Map<string, ISigil>;
};

/**
 * Update global map stored.
 */
const updateGlobalRegistry = (map: Map<string, ISigil> | null): void => {
  (globalThis as any)[__SIGIL_REGISTRY__] = map;
};

/** --------------------------------
 *  Registry class
 * -------------------------------- */

/**
 * Small wrapper around a shared registry Set that provides safe operations
 * and hot-reload-friendly behavior.
 *
 * Responsibilities:
 * - Query the current registry (may be `null` to indicate disabled checks).
 * - Register / unregister labels in a controlled manner.
 * - Query class constructors using there 'SigilLabel'.
 * - Support hot-reload tolerant registration (avoid throwing in DEV).
 * - Replace / merge registries when a new Map is provided by the consumer.
 *
 * This class intentionally keeps a minimal API so consumers can use a single
 * shared instance (`REGISTRY`) or instantiate their own if needed.
 */
class Registry {
  /** Internal pointer to the active registry (may be null to indicate checks disabled). */
  private _registry: Map<string, ISigil> | null = getGlobalRegistry();

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
   * @returns `true` if present; `false` otherwise or when registry is disabled.
   */
  has(label: string): boolean {
    return !!this._registry && this._registry.has(label);
  }

  /**
   * Get class constructor using its label.
   *
   * @param label - Label appended to Sigil class.
   * @returns Reference to Sigil class constructor.
   */
  get(label: string): ISigil | undefined {
    if (!this._registry) return;
    return this._registry.get(label);
  }

  /**
   * Register a label and class constructor in the active registry.
   *
   * Behavior:
   * - If the registry is disabled (`null`), this is a no-op.
   * - If the label already exists then:
   *     - In DEV builds: prints a console warning (HMR friendly) and returns early.
   *     - In non-DEV builds: throws an Error to prevent duplicate registration.
   *
   * @param label - Label string to register (e.g. '@scope/pkg.ClassName').
   * @param Class - Constructor of the class being registered.
   * @param opts - Optional per-call overrides.
   */
  register(
    label: string,
    Class: ISigil,
    opts?: Pick<SigilOptions, 'devMarker'>
  ): void {
    if (!this._registry) return;

    if (this._registry.has(label)) {
      if (opts?.devMarker ?? OPTIONS.devMarker)
        // The console is intentional
        // eslint-disable-next-line no-console
        console.warn(
          `[Sigil] Duplicate label "${label}" may be due to HMR — ignore if you are sure that it's defined once.`
        );
      else
        throw new Error(
          `[Sigil Error] Duplicate label '${label}' detected. Labels must be unique.`
        );
    } else this._registry.set(label, Class);
  }

  /**
   * Unregister a previously registered class.
   *
   * @param label - The label to remove from the registry.
   * @returns `true` if the label was present and removed; `false` otherwise (or when registry is disabled).
   */
  unregister(label: string): boolean {
    if (!this._registry) return false;
    return this._registry.delete(label);
  }

  /**
   * Clear the registry completely.
   *
   * Useful for test teardown, or when explicitly resetting state during development.
   * No-op when the registry is disabled.
   */
  clear(): void {
    if (!this._registry) return;
    this._registry.clear();
  }

  /**
   * Replace the active registry with `newRegistry`.
   *
   * When replacing, any existing entries are merged into `newRegistry` so that
   * registrations are not lost automatically. This design choice preserves
   * previously registered labels while allowing callers to supply a custom Set
   * instance (for example, a Set shared between worker threads or an external
   * synchronization mechanism).
   *
   * Important notes:
   * - Replacing the registry transfers existing entries into `newRegistry` when both are non-null.
   * - The global default Set stored on `globalThis` is *not* updated by this method; responsibility
   *   for further management of the `newRegistry` (such as re-exposing it on `globalThis`) lies with the caller.
   * - If you want to *disable* registry checks, call `replaceRegistry(null)`.
   *
   * @param newRegistry - New Set<string> instance to use as the active registry, or `null` to disable checks.
   */
  replaceRegistry(newRegistry: Map<string, ISigil> | null): void {
    const old = this._registry;
    if (old && newRegistry) for (const [l, c] of old) newRegistry.set(l, c);
    updateGlobalRegistry(newRegistry);
    this._registry = newRegistry;
  }

  /**
   * Get the size (number of entries) of the active registry.
   *
   * @returns The number of registered labels, or 0 when registry is disabled.
   */
  get size(): number {
    return this._registry ? this._registry.size : 0;
  }
}

/**
 * Convenience singleton instance for consumers that prefer a single shared API.
 *
 * Use `REGISTRY` to register/unregister labels, inspect the registry, and (optionally)
 * replace the active Set by calling `REGISTRY.replaceRegistry(...)`.
 */
export const REGISTRY = new Registry();
