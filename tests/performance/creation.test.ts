/**
 * Performance comparisons:
 * - measures class-definition time and instance creation time
 * - compares Sigil (withSigil/Sigil base) vs normal plain classes
 *
 * Notes:
 * - Tests intentionally log results instead of asserting thresholds.
 * - To reduce noise, Sigil dev checks are disabled via updateOptions({ devMarker: false })
 *   so this approximates production overhead. If you want DEV-mode numbers, toggle devMarker.
 *  - Use --runInBand and --expose-gc for more stable results if desired.
 */

import {
  Sigil,
  Sigilify,
  withSigil,
  updateOptions,
  REGISTRY,
} from '../../dist';

// Isolate tests from each other
REGISTRY.replaceRegistry(new Map());
REGISTRY.clear();

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

/** Create an extended sigilized class chain of given depth.
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
    updateOptions({ devMarker: false, autofillLabels: true });
    REGISTRY.clear();
  });

  afterAll(() => {
    REGISTRY.clear();
    updateOptions({ devMarker: true, autofillLabels: false });
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

  test('free registry', () => {
    REGISTRY.replaceRegistry(null);
  });
});

//
// These are the typical run values with 'DEF_ITERATIONS = 2000' and 'INST_ITERATIONS = 10000':
//
//  ┌─────────┬───────────────────────────────────────────────────────────────────┬──────────────┬───────────────┬───────────────┬────────────────┐
//  │ (index) │ scenario                                                          │ def total ms │ def per op ms │ inst total ms │ inst per op ms │
//  ├─────────┼───────────────────────────────────────────────────────────────────┼──────────────┼───────────────┼───────────────┼────────────────┤
//  │ 0       │ 'Empty plain class'                                               │ '20.135'     │ '0.010068'    │ '2.751'       │ '0.000275'     │
//  │ 1       │ 'Empty Sigil class'                                               │ '135.929'    │ '0.067964'    │ '45.221'      │ '0.004522'     │
//  │ 2       │ 'Small plain class (5 props, 3 methods)'                          │ '42.013'     │ '0.021006'    │ '34.077'      │ '0.003408'     │
//  │ 3       │ 'Small Sigil class (5 props, 3 methods)'                          │ '151.920'    │ '0.075960'    │ '86.124'      │ '0.008612'     │
//  │ 4       │ 'Large plain class (15 props, 10 methods)'                        │ '46.874'     │ '0.023437'    │ '102.673'     │ '0.010267'     │
//  │ 5       │ 'Large Sigil class (15 props, 10 methods)'                        │ '145.211'    │ '0.072605'    │ '152.859'     │ '0.015286'     │
//  │ 6       │ 'Extended plain depth '3' with 2 props and 1 method every extend  │ '111.334'    │ '0.055667'    │ '95.372'      │ '0.009537'     │
//  │ 7       │ 'Extended Sigil depth '3' with 2 props and 1 method every extend  │ '444.727'    │ '0.222363'    │ '130.634'     │ '0.013063'     │
//  │ 8       │ 'Extended plain depth '5' with 2 props and 1 method every extend  │ '182.255'    │ '0.091128'    │ '192.631'     │ '0.019263'     │
//  │ 9       │ 'Extended Sigil depth '5' with 2 props and 1 method every extend  │ '662.548'    │ '0.331274'    │ '231.658'     │ '0.023166'     │
//  │ 10      │ 'Extended plain depth '10' with 2 props and 1 method every extend │ '435.620'    │ '0.217810'    │ '575.814'     │ '0.057581'     │
//  │ 11      │ 'Extended Sigil depth '10' with 2 props and 1 method every extend │ '1275.526'   │ '0.637763'    │ '656.204'     │ '0.065620'     │
//  └─────────┴───────────────────────────────────────────────────────────────────┴──────────────┴───────────────┴───────────────┴────────────────┘
//
// From this is we can conclude:
//
//  1. Class declaration of sigil starts at minimal '0.067964 ms' for each class and increases with 'extends' depth mainly: '0.067964 -> 0.222363 -> 0.331274 -> 0637763'.
//     This is predictable as with each 'extends' new 'Set' and 'Map' are defined with increasing length, however this is one-time cost only for each class so
//     it have practically zore actual run-time overhead.
//
//  2. Class instance creation of sigil have fixed per instance overhead of about '0.005 ms'. this is due to creation of 'Sigil' instance methods as 'asOfType()'
//     'getSigilLabel()' etc... . this overhead bloats small classes but as class is populated the overhead is reduced, however in most real-life classes with real
//     properties and methods with logic, this overhead becomes negligable, especially in 'DDD' or large systems where other operations 'I/O', 'API calls' etc...
//     dominate.
//

//
// Bottom line:
// Sigil adds a measurable one-time cost at class definition and a very small per-instance cost.
// - For typical apps (few class definitions, many instances with real work), that one-time cost is acceptable.
// - For hot-path code that constructs lots of instances of extremely small objects at very high rate (millions/sec), you may want to measure/optimize further or use type-only techniques.
//
