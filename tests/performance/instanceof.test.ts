/**
 * Performance test: compare `instanceof` vs Sigil's `isOfType` and `isOfTypeStrict`.
 *
 * Scenarios:
 *   - depth 0 (simple class)
 *   - depth 3
 *   - depth 5
 *   - depth 10
 *
 * Notes:
 *  - This measures micro-op throughput; runs with dev checks off to approximate production.
 *  - Use --runInBand and --expose-gc for more stable results if desired.
 */

import { Sigil, withSigil, updateOptions } from '../../src';

const CHECK_ITERATIONS = 200_000; // number of check ops per measured run
const WARMUP_ITER = 1000;

type Row = {
  scenario: string;
  'instanceof total ms': number;
  'instanceof per-op ms': number;
  'sigil instanceof total ms': number;
  'sigil instanceof per-op ms': number;
  'isOfType ctor total ms': number;
  'isOfType ctor per-op ms': number;
  'isOfTypeStrict ctor total ms': number;
  'isOfTypeStrict ctor per-op ms': number;
  'isOfType instance total ms': number;
  'isOfType instance per-op ms': number;
  'isOfTypeStrict instance total ms': number;
  'isOfTypeStrict instance per-op ms': number;
};

function nowNs(): bigint {
  return process.hrtime.bigint();
}
const hrToMs = (ns: bigint) => Number(ns) / 1_000_000;

function uniqueLabel(base: string) {
  return `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a plain inheritance chain of given depth.
 * Returns { BaseCtor, FinalCtor, instance } where BaseCtor is the topmost ancestor.
 */
function buildPlainChain(depth: number) {
  class Base {}
  let Prev = Base;
  for (let i = 0; i < depth; i++) {
    // create subclass that extends Prev
    // keep it simple and small

    const Sub = new Function(
      'Prev',
      `return class extends Prev { constructor(...a){ super(...a); } }`
    )(Prev);
    Prev = Sub;
  }
  const Final = Prev;
  const inst = new Final();
  return { BaseCtor: Base, FinalCtor: Final, instance: inst };
}

/** Build a Sigil chain of given depth where each stage is sigilified.
 * Returns { BaseCtor, FinalCtor, instance } where BaseCtor is the topmost (sigil'd) ancestor.
 */
function buildSigilChain(depth: number) {
  class Base extends Sigil {}
  const labeledBase = withSigil(Base, uniqueLabel('sigil-base'));
  let Prev = labeledBase;
  for (let i = 0; i < depth; i++) {
    const Sub = new Function(
      'Prev',
      `return class extends Prev { constructor(...a){ super(...a); } }`
    )(Prev);
    const label = uniqueLabel(`sigil-depth${i}`);
    const SigilSub = withSigil(Sub, label);
    Prev = SigilSub;
  }
  const Final = Prev;
  const inst = new Final();
  return {
    BaseCtor: labeledBase,
    FinalCtor: Final,
    instance: inst,
  };
}

/** Micro-benchmark helper: run fn() iterations times, return total ms */
function benchCheck(fn: () => void, iterations: number): number {
  // warm up a bit
  for (let i = 0; i < Math.min(WARMUP_ITER, iterations); i++) fn();

  const start = nowNs();
  for (let i = 0; i < iterations; i++) fn();

  const end = nowNs();
  return hrToMs(end - start);
}

describe('Perf: instanceof vs isOfType vs isOfTypeStrict', () => {
  beforeAll(() => {
    updateOptions({ autofillLabels: true });
  });

  afterAll(() => {
    updateOptions({ autofillLabels: false });
  });

  test('identity checks across depths (logged results)', async () => {
    const rows: Row[] = [];

    const depths = [0, 3, 5, 10];

    for (const depth of depths) {
      // === Plain chain ===
      const plain = buildPlainChain(depth);
      // check: plain.instance instanceof Base
      const plainInstanceOfFn = () => {
        plain.instance instanceof plain.BaseCtor;
      };
      // measure plain instanceof
      const plainInstanceOfMs = benchCheck(plainInstanceOfFn, CHECK_ITERATIONS);

      // === Sigil chain ctor ===
      const sig = buildSigilChain(depth);

      // 3 checks for sigil:
      // 1) instanceof (still works in same realm)
      const sigInstanceOfFn = () => {
        sig.instance instanceof sig.BaseCtor;
      };

      // 2) isOfType
      const isOfTypeCtorFn = () => {
        sig.BaseCtor.isOfType(sig.instance);
      };

      // 3) isOfTypeStrict
      const isOfTypeStrictCtorFn = () => {
        sig.BaseCtor.isOfTypeStrict(sig.instance);
      };

      const sigInstanceOfMs = benchCheck(sigInstanceOfFn, CHECK_ITERATIONS);
      const isOfTypeCtorMs = benchCheck(isOfTypeCtorFn, CHECK_ITERATIONS);
      const isOfTypeStricCortMs = benchCheck(isOfTypeStrictCtorFn, CHECK_ITERATIONS);

      // === Sigil chain instance ===
      const sigInst = new sig.BaseCtor();

      // 2) isOfType
      const isOfTypeInstFn = () => {
        sigInst.isOfType(sig.instance);
      };

      // 3) isOfTypeStrict
      const isOfTypeInstCtorFn = () => {
        sigInst.isOfTypeStrict(sig.instance);
      };

      const isOfTypeInstMs = benchCheck(isOfTypeInstFn, CHECK_ITERATIONS);
      const isOfTypeStricInstMs = benchCheck(isOfTypeInstCtorFn, CHECK_ITERATIONS);

      // Push results

      rows.push({
        scenario: `depth ${depth}`,
        'instanceof total ms': plainInstanceOfMs,
        'instanceof per-op ms': plainInstanceOfMs / CHECK_ITERATIONS,
        'sigil instanceof total ms': sigInstanceOfMs,
        'sigil instanceof per-op ms': sigInstanceOfMs / CHECK_ITERATIONS,
        'isOfType ctor total ms': isOfTypeCtorMs,
        'isOfType ctor per-op ms': isOfTypeCtorMs / CHECK_ITERATIONS,
        'isOfTypeStrict ctor total ms': isOfTypeStricCortMs,
        'isOfTypeStrict ctor per-op ms': isOfTypeStricCortMs / CHECK_ITERATIONS,
        'isOfType instance total ms': isOfTypeInstMs,
        'isOfType instance per-op ms': isOfTypeInstMs / CHECK_ITERATIONS,
        'isOfTypeStrict instance total ms': isOfTypeStricInstMs,
        'isOfTypeStrict instance per-op ms': isOfTypeStricInstMs / CHECK_ITERATIONS,
      });
    }

    // Print results in a friendly table
    console.log('\n=== instanceof vs Sigil.isOfType / isOfTypeStrict ===');
    console.table(
      rows.map((r) => ({
        scenario: r.scenario,
        'instanceof total ms': r['instanceof total ms'].toFixed(3),
        'instanceof per-op ms': r['instanceof per-op ms'].toFixed(6),
        'sigil instanceof total ms': r['sigil instanceof total ms'].toFixed(3),
        'sigil instanceof per-op ms': r['sigil instanceof per-op ms'].toFixed(6),
      }))
    );
    console.table(
      rows.map((r) => ({
        scenario: r.scenario,
        'isOfType ctor total ms': r['isOfType ctor total ms'].toFixed(3),
        'isOfType ctor per-op ms': r['isOfType ctor per-op ms'].toFixed(6),
        'isOfTypeStrict ctor total ms': r['isOfTypeStrict ctor total ms'].toFixed(3),
        'isOfTypeStrict ctor per-op ms': r['isOfTypeStrict ctor per-op ms'].toFixed(6),
      }))
    );
    console.table(
      rows.map((r) => ({
        scenario: r.scenario,
        'isOfType instance total ms': r['isOfType instance total ms'].toFixed(3),
        'isOfType instance per-op ms': r['isOfType instance per-op ms'].toFixed(6),
        'isOfTypeStrict instance total ms': r['isOfTypeStrict instance total ms'].toFixed(3),
        'isOfTypeStrict instance per-op ms': r['isOfTypeStrict instance per-op ms'].toFixed(6),
      }))
    );

    // Pass test (measurement only)
    expect(true).toBe(true);
  }, 120000);
});

//
// These are the typical run values with 'CHECK_ITERATIONS = 200_000':
//
//  ┌─────────┬────────────┬─────────────────────┬──────────────────────┬───────────────────────────┬────────────────────────────┐
//  │ (index) │ scenario   │ instanceof total ms │ instanceof per-op ms │ sigil instanceof total ms │ sigil instanceof per-op ms │
//  ├─────────┼────────────┼─────────────────────┼──────────────────────┼───────────────────────────┼────────────────────────────┤
//  │ 0       │ 'depth 0'  │ '2.292'             │ '0.000011'           │ '3.856'                   │ '0.000019'                 │
//  │ 1       │ 'depth 3'  │ '7.091'             │ '0.000035'           │ '11.634'                  │ '0.000058'                 │
//  │ 2       │ 'depth 5'  │ '7.290'             │ '0.000036'           │ '12.031'                  │ '0.000060'                 │
//  │ 3       │ 'depth 10' │ '9.179'             │ '0.000046'           │ '13.091'                  │ '0.000065'                 │
//  └─────────┴────────────┴─────────────────────┴──────────────────────┴───────────────────────────┴────────────────────────────┘
//  ┌─────────┬────────────┬───────────────────┬────────────────────┬─────────────────────────┬──────────────────────────┐
//  │ (index) │ scenario   │ isOfType ctor total ms │ isOfType ctor per-op ms │ isOfTypeStrict ctor total ms │ isOfTypeStrict ctor per-op ms │
//  ├─────────┼────────────┼───────────────────┼────────────────────┼─────────────────────────┼──────────────────────────┤
//  │ 0       │ 'depth 0'  │ '4.570'           │ '0.000023'         │ '5.059'                 │ '0.000025'               │
//  │ 1       │ 'depth 3'  │ '8.342'           │ '0.000042'         │ '9.765'                 │ '0.000049'               │
//  │ 2       │ 'depth 5'  │ '9.731'           │ '0.000049'         │ '11.292'                │ '0.000056'               │
//  │ 3       │ 'depth 10' │ '9.859'           │ '0.000049'         │ '11.328'                │ '0.000057'               │
//  └─────────┴────────────┴───────────────────┴────────────────────┴─────────────────────────┴──────────────────────────┘
//
// From this is we can conclude:
//
//  1. 'instanceof' being native is more performant than 'isOfType' and 'isOfTypeStrict'.
//  2. As the depth increases the percentage difference between 'instanceof' and 'isOfType'/'isOfTypeStrict' decreases.
//  3. The change is about '0.00001 ms' in most cases, making it practically negligible.
//
