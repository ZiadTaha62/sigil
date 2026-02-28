/**
 * Performance test: compare `instanceof` vs Sigil's `isOfType` and `isExactType`.
 *
 * Scenarios:
 *   - depth 0 (simple class)
 *   - depth 3
 *   - depth 5
 *   - depth 10
 *   - depth 15
 *
 * Notes:
 *  - This measures micro-op throughput; runs with dev checks off to approximate production.
 *  - Use --runInBand and --expose-gc for more stable results if desired.
 */

import { Sigil, attachSigil, updateSigilOptions } from '../../src';

const CHECK_ITERATIONS = 200_000; // number of check ops per measured run
const WARMUP_ITER = 1000;

type Row = {
  scenario: string;
  'instanceof total ms': number;
  'instanceof per-op ms': number;
  'isOfType ctor total ms': number;
  'isOfType ctor per-op ms': number;
  'isExactType ctor total ms': number;
  'isExactType ctor per-op ms': number;
  'isOfType instance total ms': number;
  'isOfType instance per-op ms': number;
  'isExactType instance total ms': number;
  'isExactType instance per-op ms': number;
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
  const labeledBase = attachSigil(Base, uniqueLabel('sigil-base'));
  let Prev = labeledBase;
  for (let i = 0; i < depth; i++) {
    const Sub = new Function(
      'Prev',
      `return class extends Prev { constructor(...a){ super(...a); } }`
    )(Prev);
    const label = uniqueLabel(`sigil-depth${i}`);
    const SigilSub = attachSigil(Sub, label);
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

describe('Perf: instanceof vs isOfType vs isExactType', () => {
  beforeAll(() => {
    updateSigilOptions({ autofillLabels: true });
  });

  afterAll(() => {
    updateSigilOptions({ autofillLabels: false });
  });

  test('identity checks across depths (logged results)', async () => {
    const rows: Row[] = [];

    const depths = [0, 3, 5, 10, 15];

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

      const isOfTypeCtorFn = () => {
        sig.BaseCtor.isOfType(sig.instance);
      };
      const isExactTypeCtorFn = () => {
        sig.BaseCtor.isExactType(sig.instance);
      };

      const isOfTypeCtorMs = benchCheck(isOfTypeCtorFn, CHECK_ITERATIONS);
      const isExactTypeCtorMs = benchCheck(isExactTypeCtorFn, CHECK_ITERATIONS);

      // === Sigil chain instance ===
      const sigInst = new sig.BaseCtor();

      const isOfTypeInstFn = () => {
        sigInst.isOfType(sig.instance);
      };
      const isExactTypeInstFn = () => {
        sigInst.isExactType(sig.instance);
      };

      const isOfTypeInstMs = benchCheck(isOfTypeInstFn, CHECK_ITERATIONS);
      const isExactTypeInstMs = benchCheck(isExactTypeInstFn, CHECK_ITERATIONS);

      // Push results

      rows.push({
        scenario: `depth ${depth}`,
        'instanceof total ms': plainInstanceOfMs,
        'instanceof per-op ms': plainInstanceOfMs / CHECK_ITERATIONS,
        'isOfType ctor total ms': isOfTypeCtorMs,
        'isOfType ctor per-op ms': isOfTypeCtorMs / CHECK_ITERATIONS,
        'isOfType instance total ms': isOfTypeInstMs,
        'isOfType instance per-op ms': isOfTypeInstMs / CHECK_ITERATIONS,
        'isExactType ctor total ms': isExactTypeCtorMs,
        'isExactType ctor per-op ms': isExactTypeCtorMs / CHECK_ITERATIONS,
        'isExactType instance total ms': isExactTypeInstMs,
        'isExactType instance per-op ms': isExactTypeInstMs / CHECK_ITERATIONS,
      });
    }

    // Print results in a friendly table
    console.log('\n=== instanceof vs Sigil.isOfType / isExactType ===');
    console.table(
      rows.map((r) => ({
        scenario: r.scenario,
        'instanceof total ms': r['instanceof total ms'].toFixed(3),
        'instanceof per-op ms': r['instanceof per-op ms'].toFixed(6),
      }))
    );
    console.table(
      rows.map((r) => ({
        scenario: r.scenario,
        'isOfType ctor total ms': r['isOfType ctor total ms'].toFixed(3),
        'isOfType ctor per-op ms': r['isOfType ctor per-op ms'].toFixed(6),
        'isOfType instance total ms': r['isOfType instance total ms'].toFixed(3),
        'isOfType instance per-op ms': r['isOfType instance per-op ms'].toFixed(6),
      }))
    );
    console.table(
      rows.map((r) => ({
        scenario: r.scenario,
        'isExactType ctor total ms': r['isExactType ctor total ms'].toFixed(3),
        'isExactType ctor per-op ms': r['isExactType ctor per-op ms'].toFixed(6),
        'isExactType instance total ms': r['isExactType instance total ms'].toFixed(3),
        'isExactType instance per-op ms': r['isExactType instance per-op ms'].toFixed(6),
      }))
    );

    // Pass test (measurement only)
    expect(true).toBe(true);
  }, 120000);
});

//
// These are the typical run values with 'CHECK_ITERATIONS = 200_000' on 'node v20.12.0':
//
// instanceof
//  ┌─────────┬────────────┬─────────────────────┬──────────────────────┐
//  │ (index) │ scenario   │ instanceof total ms │ instanceof per-op ms │
//  ├─────────┼────────────┼─────────────────────┼──────────────────────┤
//  │ 0       │ 'depth 0'  │ '1.933'             │ '0.000010'           │
//  │ 1       │ 'depth 3'  │ '6.433'             │ '0.000032'           │
//  │ 2       │ 'depth 5'  │ '6.702'             │ '0.000034'           │
//  │ 3       │ 'depth 10' │ '8.823'             │ '0.000044'           │
//  │ 4       │ 'depth 15' │ '11.634'            │ '0.000058'           │
//  └─────────┴────────────┴─────────────────────┴──────────────────────┘
//
// isOfType
//  ┌─────────┬────────────┬────────────────────────┬─────────────────────────┬────────────────────────────┬─────────────────────────────┐
//  │ (index) │ scenario   │ isOfType ctor total ms │ isOfType ctor per-op ms │ isOfType instance total ms │ isOfType instance per-op ms │
//  ├─────────┼────────────┼────────────────────────┼─────────────────────────┼────────────────────────────┼─────────────────────────────┤
//  │ 0       │ 'depth 0'  │ '5.096'                │ '0.000025'              │ '2.009'                    │ '0.000010'                  │
//  │ 1       │ 'depth 3'  │ '8.905'                │ '0.000045'              │ '5.428'                    │ '0.000027'                  │
//  │ 2       │ 'depth 5'  │ '9.165'                │ '0.000046'              │ '5.661'                    │ '0.000028'                  │
//  │ 3       │ 'depth 10' │ '9.027'                │ '0.000045'              │ '5.801'                    │ '0.000029'                  │
//  │ 4       │ 'depth 15' │ '12.520'               │ '0.000063'              │ '10.231'                   │ '0.000051'                  │
//  └─────────┴────────────┴────────────────────────┴─────────────────────────┴────────────────────────────┴─────────────────────────────┘
//
// isExactType (strict lineage check)
//  ┌─────────┬────────────┬───────────────────────────┬────────────────────────────┬───────────────────────────────┬────────────────────────────────┐
//  │ (index) │ scenario   │ isExactType ctor total ms │ isExactType ctor per-op ms │ isExactType instance total ms │ isExactType instance per-op ms │
//  ├─────────┼────────────┼───────────────────────────┼────────────────────────────┼───────────────────────────────┼────────────────────────────────┤
//  │ 0       │ 'depth 0'  │ '5.402'                   │ '0.000027'                 │ '2.373'                       │ '0.000012'                     │
//  │ 1       │ 'depth 3'  │ '7.513'                   │ '0.000038'                 │ '3.619'                       │ '0.000018'                     │
//  │ 2       │ 'depth 5'  │ '7.406'                   │ '0.000037'                 │ '3.725'                       │ '0.000019'                     │
//  │ 3       │ 'depth 10' │ '7.658'                   │ '0.000038'                 │ '4.221'                       │ '0.000021'                     │
//  │ 4       │ 'depth 15' │ '13.887'                  │ '0.000069'                 │ '10.688'                      │ '0.000053'                     │
//  └─────────┴────────────┴───────────────────────────┴────────────────────────────┴───────────────────────────────┴────────────────────────────────┘
//
// Conclusions (latest results with consistent implementation):
//
// • isOfType has practically the almost the same performance as native instanceof.
//    slightly **slower** on static calls and is often slightly **faster** on the instance side.
//
// • isExactType adds a tiny predictable cost but stays extremely fast
//   (< 0.00007 ms/op even at depth 15).
//
// Overall: All Sigil checks are in the same performance class as native instanceof.
// The overhead is negligible for real applications.
//
