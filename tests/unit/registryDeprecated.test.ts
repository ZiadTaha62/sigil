import { Sigil, withSigil, REGISTRY } from '../../dist';

// Isolate tests from each other
REGISTRY.replaceRegistry(new Map());
REGISTRY.clear();

//
// NOTE: This suite intentionally relies on shared registry state and is order dependent
//
describe('REGISTRY basic operations', () => {
  const labelA = '@test/A';
  const labelB = '@test/B';

  const testMap = new Map();

  test('Create class A and check registry for it', () => {
    class _A extends Sigil {}
    const A = withSigil(_A, labelA);

    expect(REGISTRY.has(labelA)).toBe(true);
    expect(REGISTRY.get(labelA)).toBe(A);
    expect(REGISTRY.size).toBe(1);

    testMap.set(labelA, A);
  });

  test('Create class B and check registry for it', () => {
    class _B extends Sigil {}
    const B = withSigil(_B, labelB);

    expect(REGISTRY.has(labelB)).toBe(true);
    expect(REGISTRY.get(labelB)).toBe(B);
    expect(REGISTRY.size).toBe(2);

    testMap.set(labelB, B);
  });

  test('Check registry contains both class A and B', () => {
    expect(REGISTRY.has(labelA)).toBe(true);
    expect(REGISTRY.get(labelA)).toBe(testMap.get(labelA));

    expect(REGISTRY.has(labelB)).toBe(true);
    expect(REGISTRY.get(labelB)).toBe(testMap.get(labelB));

    expect(REGISTRY.size).toBe(2);
  });

  test('Unregister class A and check registry for it', () => {
    const removed = REGISTRY.unregister(labelA);
    expect(removed).toBe(true);
    expect(REGISTRY.has(labelA)).toBe(false);
    expect(REGISTRY.size).toBe(1);
  });

  test('Clear registry and check for class A and B', () => {
    REGISTRY.clear();

    expect(REGISTRY.has(labelA)).toBe(false);
    expect(REGISTRY.has(labelB)).toBe(false);
    expect(REGISTRY.size).toBe(0);
  });

  test('Check replaceRegistry populate new map with old classes', () => {
    class _A extends Sigil {}
    const A = withSigil(_A, labelA);
    class _B extends Sigil {}
    const B = withSigil(_B, labelB);

    const myMap = new Map();
    REGISTRY.replaceRegistry(myMap);

    expect(myMap.has(labelA)).toBe(true);
    expect(myMap.get(labelA)).toBe(A);
    expect(myMap.has(labelB)).toBe(true);
    expect(myMap.get(labelB)).toBe(B);

    // cleanup
    REGISTRY.clear();
  });

  test('Check replaceRegistry update new map with new classes', () => {
    const myMap = new Map();
    REGISTRY.replaceRegistry(myMap);

    class _A extends Sigil {}
    const A = withSigil(_A, labelA);

    expect(myMap.has(labelA)).toBe(true);
    expect(myMap.get(labelA)).toBe(A);
  });

  test('Null registry', () => {
    REGISTRY.replaceRegistry(null);
    expect(REGISTRY.has(labelA)).toBe(false);
    class _A extends Sigil {}
    const A = withSigil(_A, labelA);
    expect(REGISTRY.has(labelA)).toBe(false);
  });

  test('free registry', () => {
    REGISTRY.replaceRegistry(null);
  });
});
