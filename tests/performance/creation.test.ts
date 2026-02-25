/**
 * Performance comparisons:
 * - measures class-definition time and instance creation time
 * - compares Sigil (withSigil/Sigil base) vs normal plain classes
 */

import { Sigil, Sigilify, withSigil, updateSigilOptions } from '../../src';

const DEF_ITERATIONS = 2000;
const INST_ITERATIONS = 10000;
const WARMUP_ITER = 500;

type Measured = {
  label: string;
  defMs: number;
  instMs: number;
  defPerOpMs: number;
  instPerOpMs: number;
};

const hrToMs = (ns: bigint) => Number(ns) / 1_000_000;

function nowNs(): bigint {
  return process.hrtime.bigint();
}

function uniqueLabel(base: string, idx = 0) {
  return `${base}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}${idx ? `-${idx}` : ''}`;
}

/** Create a plain (normal) class factory with given props & methods counts */
function createPlainClassFactory(
  propsCount: number,
  methodsCount: number
): new (...args: any[]) => any {
  // create named dynamic class
  // Use Function constructor so we can generate different shapes programmatically
  const propAssignments = Array.from({ length: propsCount })
    .map((_, i) => `this.p${i} = ${i};`)
    .join('\n');

  const methodDefs = Array.from({ length: methodsCount })
    .map((_, i) => `m${i}(){return ${i};}`)
    .join('\n');

  // Create class source
  const src = `
    return class {
      constructor(){ ${propAssignments} }
      ${methodDefs}
    }
  `;

  return new Function(src)() as any;
}

/** Create a Sigilized class by wrapping the plain class using withSigil or Sigilify */
function createSigilClassFactory(
  propsCount: number,
  methodsCount: number,
  label: string
): new (...args: any[]) => any {
  const Plain = createPlainClassFactory(propsCount, methodsCount);
  // Use Sigilify to attach sigil metadata directly to an ad-hoc class
  return Sigilify(Plain, label);
}

/** Create an extended plain class chain of given depth.
 * Each stage adds 2 props and 1 method (cumulative).
 */
function createPlainExtendedChain(depth: number) {
  let Prev: any = class {};
  let totalProps = 0;
  let totalMethods = 0;

  for (let d = 1; d <= depth; d++) {
    totalProps += 2;
    totalMethods += 1;

    // make subclass extending Prev with added props & methods
    const propAssignments = Array.from({ length: totalProps })
      .map((_, i) => `this.p${i} = ${i};`)
      .join('\n');

    const methodDefs = Array.from({ length: totalMethods })
      .map((_, i) => `m${i}(){return ${i};}`)
      .join('\n');

    const cls = new Function(
      'Prev',
      `return class extends Prev {
         constructor(...args){
           super(...args);
           ${propAssignments}
         }
         ${methodDefs}
       }`
    )(Prev);

    Prev = cls;
  }
  return Prev;
}

/** Create an extended sigilified class chain of given depth.
 * Each stage adds 2 props and 1 method (cumulative).
 * Each created class is wrapped with withSigil.
 */
function createSigilExtendedChain(depth: number, baseLabel: string) {
  // base must extend Sigil
  class Base extends Sigil {}
  const labeledBase = withSigil(Base, uniqueLabel(`${baseLabel}-base`));
  let Prev = labeledBase;
  let totalProps = 0;
  let totalMethods = 0;

  for (let d = 1; d <= depth; d++) {
    totalProps += 2;
    totalMethods += 1;

    // create subclass extending Prev
    const clsFactory = new Function(
      'Prev',
      `return class extends Prev {
         constructor(...args){
           super(...args);
           ${Array.from({ length: totalProps })
             .map((_, i) => `this.p${i} = ${i};`)
             .join('\n')}
         }
         ${Array.from({ length: totalMethods })
           .map((_, i) => `m${i}(){return ${i};}`)
           .join('\n')}
       }`
    );

    const Sub = clsFactory(Prev);
    const label = uniqueLabel(`${baseLabel}-depth${d}`);
    const SigilSub = withSigil(Sub, label);
    Prev = SigilSub;
  }

  return Prev;
}

/** Measure definition time (creating classes) and instance creation.
 * - defOp: function that performs one class creation operation (e.g., define a class)
 * - instFactory: function that given the created class returns a factory to instantiate instances
 */
async function benchmarkScenario(
  name: string,
  defOp: () => any,
  instOpFactory: (ctor: any) => () => any,
  defIterations = DEF_ITERATIONS,
  instIterations = INST_ITERATIONS
): Promise<Measured> {
  // Warm-up
  for (let i = 0; i < WARMUP_ITER; i++) {
    const ctor = defOp();
    const instFactory = instOpFactory(ctor);
    instFactory();
  }

  // Measure definition time
  const defStart = nowNs();
  const createdCtors: any[] = [];
  for (let i = 0; i < defIterations; i++) {
    const ctor = defOp();
    createdCtors.push(ctor);
  }
  const defEnd = nowNs();
  const defNs = defEnd - defStart;
  const defMs = hrToMs(defNs);

  // Measure instantiation time across all created ctors (round-robin)
  const instStart = nowNs();
  for (let i = 0; i < instIterations; i++) {
    const ctor = createdCtors[i % createdCtors.length];
    const instFactory = instOpFactory(ctor);
    instFactory();
  }
  const instEnd = nowNs();
  const instNs = instEnd - instStart;
  const instMs = hrToMs(instNs);

  return {
    label: name,
    defMs,
    instMs,
    defPerOpMs: defMs / defIterations,
    instPerOpMs: instMs / instIterations,
  };
}

describe('Performance: class creation comparisons (Sigil vs Plain)', () => {
  // Try to remove dev-only overhead for clearer perf comparisons.
  beforeAll(() => {
    updateSigilOptions({ autofillLabels: true });
  });

  afterAll(() => {
    updateSigilOptions({ autofillLabels: false });
  });

  // Keep tests non-flaky: don't assert thresholds, just print numbers.
  test('creation scenarios (logged results)', async () => {
    const results: Measured[] = [];

    // 1: empty class
    results.push(
      await benchmarkScenario(
        'Empty plain class',
        () => createPlainClassFactory(0, 0),
        (Ctor) => () => new Ctor()
      )
    );

    results.push(
      await benchmarkScenario(
        'Empty Sigil class',
        () => createSigilClassFactory(0, 0, uniqueLabel('sigil-empty')),
        (Ctor) => () => new Ctor()
      )
    );

    // 2: small (5 props, 3 methods)
    results.push(
      await benchmarkScenario(
        'Small plain class (5 props, 3 methods)',
        () => createPlainClassFactory(5, 3),
        (Ctor) => () => new Ctor()
      )
    );

    results.push(
      await benchmarkScenario(
        'Small Sigil class (5 props, 3 methods)',
        () => createSigilClassFactory(5, 3, uniqueLabel('sigil-small')),
        (Ctor) => () => new Ctor()
      )
    );

    // 3: large (15 props, 10 methods)
    results.push(
      await benchmarkScenario(
        'Large plain class (15 props, 10 methods)',
        () => createPlainClassFactory(15, 10),
        (Ctor) => () => new Ctor()
      )
    );

    results.push(
      await benchmarkScenario(
        'Large Sigil class (15 props, 10 methods)',
        () => createSigilClassFactory(15, 10, uniqueLabel('sigil-large')),
        (Ctor) => () => new Ctor()
      )
    );

    // 4: extended depth 3 (each stage adds 2 props + 1 method cumulatively)
    results.push(
      await benchmarkScenario(
        "Extended plain depth '3' with 2 props and 1 method every extend",
        () => createPlainExtendedChain(3),
        (Ctor) => () => new Ctor()
      )
    );

    results.push(
      await benchmarkScenario(
        "Extended Sigil depth '3' with 2 props and 1 method every extend",
        () => createSigilExtendedChain(3, uniqueLabel('sigil-chain3')),
        (Ctor) => () => new Ctor()
      )
    );

    // 5: extended depth 5
    results.push(
      await benchmarkScenario(
        "Extended plain depth '5' with 2 props and 1 method every extend",
        () => createPlainExtendedChain(5),
        (Ctor) => () => new Ctor()
      )
    );

    results.push(
      await benchmarkScenario(
        "Extended Sigil depth '5' with 2 props and 1 method every extend",
        () => createSigilExtendedChain(5, uniqueLabel('sigil-chain5')),
        (Ctor) => () => new Ctor()
      )
    );

    // 6: extended depth 10
    results.push(
      await benchmarkScenario(
        "Extended plain depth '10' with 2 props and 1 method every extend",
        () => createPlainExtendedChain(10),
        (Ctor) => () => new Ctor()
      )
    );

    results.push(
      await benchmarkScenario(
        "Extended Sigil depth '10' with 2 props and 1 method every extend",
        () => createSigilExtendedChain(10, uniqueLabel('sigil-chain10')),
        (Ctor) => () => new Ctor()
      )
    );

    // Print nicely
    console.log('\n=== Sigil vs Plain class creation performance ===');
    console.table(
      results.map((r) => ({
        scenario: r.label,
        'def total ms': r.defMs.toFixed(3),
        'def per op ms': r.defPerOpMs.toFixed(6),
        'inst total ms': r.instMs.toFixed(3),
        'inst per op ms': r.instPerOpMs.toFixed(6),
      }))
    );

    // keep test green; this test is measurement-only
    expect(true).toBe(true);
  }, 120000 /* generous timeout for perf runs */);
});

//
// These are the typical run values with 'DEF_ITERATIONS = 2000' and 'INST_ITERATIONS = 10000' on 'node v20.12.0':
//
//  ┌─────────┬────────────────────────────────────────────────────────────────────┬──────────────┬───────────────┬───────────────┬────────────────┐
//  │ (index) │ scenario                                                           │ def total ms │ def per op ms │ inst total ms │ inst per op ms │
//  ├─────────┼────────────────────────────────────────────────────────────────────┼──────────────┼───────────────┼───────────────┼────────────────┤
//  │ 0       │ 'Empty plain class'                                                │ '20.997'     │ '0.010499'    │ '1.990'       │ '0.000199'     │
//  │ 1       │ 'Empty Sigil class'                                                │ '137.299'    │ '0.068649'    │ '30.439'      │ '0.003044'     │
//  │ 2       │ 'Small plain class (5 props, 3 methods)'                           │ '41.411'     │ '0.020706'    │ '33.022'      │ '0.003302'     │
//  │ 3       │ 'Small Sigil class (5 props, 3 methods)'                           │ '144.699'    │ '0.072349'    │ '72.384'      │ '0.007238'     │
//  │ 4       │ 'Large plain class (15 props, 10 methods)'                         │ '44.717'     │ '0.022358'    │ '91.712'      │ '0.009171'     │
//  │ 5       │ 'Large Sigil class (15 props, 10 methods)'                         │ '156.978'    │ '0.078489'    │ '141.178'     │ '0.014118'     │
//  │ 6       │ "Extended plain depth '3' with 2 props and 1 method every extend"  │ '109.147'    │ '0.054574'    │ '88.216'      │ '0.008822'     │
//  │ 7       │ "Extended Sigil depth '3' with 2 props and 1 method every extend"  │ '477.195'    │ '0.238598'    │ '134.108'     │ '0.013411'     │
//  │ 8       │ "Extended plain depth '5' with 2 props and 1 method every extend"  │ '195.991'    │ '0.097995'    │ '203.162'     │ '0.020316'     │
//  │ 9       │ "Extended Sigil depth '5' with 2 props and 1 method every extend"  │ '825.003'    │ '0.412501'    │ '260.257'     │ '0.026026'     │
//  │ 10      │ "Extended plain depth '10' with 2 props and 1 method every extend" │ '406.002'    │ '0.203001'    │ '581.994'     │ '0.058199'     │
//  │ 11      │ "Extended Sigil depth '10' with 2 props and 1 method every extend" │ '1538.582'   │ '0.769291'    │ '660.908'     │ '0.066091'     │
//  └─────────┴────────────────────────────────────────────────────────────────────┴──────────────┴───────────────┴───────────────┴────────────────┘
//
// From this is we can conclude:
//
//  1. Class declaration of sigil starts at minimal '0.068649 ms' for each class and increases with 'extends' depth mainly: '0.072349' -> '0.078489'
//     -> '0.238598' -> '0.412501' -> '0.769291'.
//     This is predictable as with each 'extends' multiple Object.defineProperty and new 'Set' is defined with increasing length are defined,
//     however this is one-time cost only for each class so it have practically zore actual run-time overhead.
//
//  2. Class instance creation of sigil have fixed per instance overhead of about '0.005 ms'. this is due to creation of 'Sigil' instance methods
//     as 'asOfType()' 'getSigilLabel()' etc... . this overhead bloats small classes but as class is populated the overhead percentage is reduced.
//
//
