import {
  Sigil,
  Sigilify,
  withSigil,
  WithSigil,
  isSigilCtor,
  isSigilInstance,
  REGISTRY,
  updateOptions,
  withSigilTyped,
  typed,
} from '../../dist';

// Isolate tests from each other
REGISTRY.replaceRegistry(new Map());
REGISTRY.clear();

describe('Sigil core runtime behavior', () => {
  // Reset registry and options between tests to isolate state
  beforeEach(() => {
    // Reset dev options to defaults that enable DEV checks
    updateOptions({
      autofillLabels: false,
      skipLabelInheritanceCheck: false,
      devMarker: true,
    });

    // Clear registry
    REGISTRY.clear();
  });

  afterEach(() => {
    // Always leave registry in a clean state
    REGISTRY.clear();

    // Restore options to a safe default
    updateOptions({
      autofillLabels: false,
      skipLabelInheritanceCheck: false,
      devMarker: true,
    });
  });

  test('Sigilify factory returns a sigilized constructor', () => {
    const Ctor = Sigilify(class {}, '@test/Ctor');

    expect(Ctor.SigilLabel).toBe('@test/Ctor');
    expect(Ctor).toBeDefined();
    expect(Ctor.SigilLabel).toBe('@test/Ctor');
    expect(typeof Ctor.SigilType).toBe('symbol');

    const inst = new Ctor();
    // static helper
    expect(inst.getSigilLabel()).toBe('@test/Ctor');
    // instance helper
    expect(inst.getSigilLabel()).toBe('@test/Ctor');
    expect(inst.getSigilType()).toBe(Ctor.SigilType);
    // registry should contain the label
    expect(REGISTRY.has('@test/Ctor')).toBe(true);
    // registry.get should return the constructor (loose check)
    expect(REGISTRY.get('@test/Ctor')).toBe(Ctor);
  });

  test('WithSigil decorator attaches runtime metadata', () => {
    @WithSigil('@test/User')
    class User extends Sigil {}

    expect(User).toBeDefined();
    expect(User.SigilLabel).toBe('@test/User');
    expect(typeof User.SigilType).toBe('symbol');

    const u = new User();
    // static helper
    expect(User.isSigilified(u)).toBe(true);
    // instance helper
    expect(u.getSigilLabel()).toBe('@test/User');
    expect(u.getSigilType()).toBe(User.SigilType);
    // registry should contain the label
    expect(REGISTRY.has('@test/User')).toBe(true);
    // registry.get should return the constructor (loose check)
    expect(REGISTRY.get('@test/User')).toBe(User);
  });

  test('withSigil HOF attaches runtime metadata', () => {
    class _User extends Sigil {}
    const User = withSigil(_User, '@test/User');

    expect(User).toBeDefined();
    expect(User.SigilLabel).toBe('@test/User');
    expect(typeof User.SigilType).toBe('symbol');

    const u = new User();
    // static helper
    expect(User.isSigilified(u)).toBe(true);
    // instance helper
    expect(u.getSigilLabel()).toBe('@test/User');
    expect(u.getSigilType()).toBe(User.SigilType);
    // registry should contain the label
    expect(REGISTRY.has('@test/User')).toBe(true);
    // registry.get should return the constructor (loose check)
    expect(REGISTRY.get('@test/User')).toBe(User);
  });

  test('Double siglify throws', () => {
    const Ctor = Sigilify(class {}, '@test/Ctor');
    expect(() => Sigilify(Ctor, '@test/Ctor')).toThrow(
      "[Sigil Error] 'Sigilify(@test/Ctor)' already siglified."
    );
  });

  test('Decorator and HOF throws on non-sigil class', () => {
    expect(() => {
      @WithSigil('X')
      class X {}
    }).toThrow("[Sigil Error] 'WithSigil' decorator accept only Sigil classes");

    expect(() => {
      withSigil(class X {}, 'X');
    }).toThrow("[Sigil Error] 'withSigil' HOF accept only Sigil classes");

    expect(() => {
      withSigilTyped(class X {}, 'X');
    }).toThrow("[Sigil Error] 'withSigilTyped' HOF accept only Sigil classes");

    expect(() => {
      typed(class X {}, 'X');
    }).toThrow("[Sigil Error] 'typed' HOF accept only Sigil classes");
  });

  test('duplicate labels throws', () => {
    class _A extends Sigil {}
    withSigil(_A, '@test/Dup');

    // A second class with same label should throw during sigil registration in DEV
    class _B extends Sigil {}
    expect(() => withSigil(_B, '@test/Dup')).toThrow(
      "[Sigil Error] Duplicate label '@test/Dup' (different classes: _A vs _B)"
    );
  });

  test('Empty label autofill', () => {
    @WithSigil()
    class X extends Sigil {}
    expect(X.SigilLabel).toMatch('@Sigil.auto-');

    class _Y extends Sigil {}
    const Y = withSigil(_Y);
    expect(Y.SigilLabel).toMatch('@Sigil.auto-');
  });

  test('lineage: subclass is recognized as subtype of base via isOfType', () => {
    // create base
    class _Base extends Sigil {}
    const Base = withSigil(_Base, '@test/Base');

    class _Sub extends Base {}
    const Sub = withSigil(_Sub, '@test/Sub');

    const subInst = new Sub();
    const baseInst = new Base();

    // Sub should be recognized as of Base type (subtype)
    expect(Base.isOfType(subInst)).toBe(true);
    // Base is not a strict subtype of Sub
    expect(Sub.isOfType(baseInst)).toBe(false);

    // isOfTypeStrict checks exact lineage (only true for same label)
    // Base.isOfTypeStrict(Base) should be true; Sub.isOfTypeStrict(Base) should be false
    expect(Base.isOfTypeStrict(baseInst)).toBe(true);
    expect(Sub.isOfTypeStrict(baseInst)).toBe(false);

    // instance-level sets
    const typeSet = subInst.getSigilTypeSet();
    expect(typeSet.has(Base.SigilType)).toBe(true);
    expect(typeSet.has(Sub.SigilType)).toBe(true);
  });

  test('isSigilCtor and isSigilInstance helpers', () => {
    class _X extends Sigil {}
    const X = withSigil(_X, '@test/X');

    const xi = new X();
    expect(isSigilCtor(X)).toBe(true);
    expect(isSigilInstance(xi)).toBe(true);

    // Plain object is not a sigil instance
    expect(isSigilInstance({})).toBe(false);
  });

  test('free registry', () => {
    REGISTRY.replaceRegistry(null);
  });
});
