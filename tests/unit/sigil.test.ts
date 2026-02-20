import {
  Sigil,
  Sigilify,
  withSigil,
  WithSigil,
  isSigilCtor,
  isSigilInstance,
  updateOptions,
  withSigilTyped,
} from '../../src';

describe('Sigil core runtime behavior', () => {
  // Reset registry and options between tests to isolate state
  beforeEach(() => {
    // Reset dev options to defaults that enable DEV checks
    updateOptions({
      autofillLabels: false,
      skipLabelInheritanceCheck: false,
      devMarker: true,
    });
  });

  afterEach(() => {
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

    const inst = new Ctor();
    // static helper
    expect(inst.getSigilLabel()).toBe('@test/Ctor');
    // instance helper
    expect(inst.getSigilLabel()).toBe('@test/Ctor');
  });

  test('WithSigil decorator attaches runtime metadata', () => {
    @WithSigil('@test/User')
    class User extends Sigil {}

    expect(User).toBeDefined();
    expect(User.SigilLabel).toBe('@test/User');

    const u = new User();
    // static helper
    expect(User.isSigilified(u)).toBe(true);
    // instance helper
    expect(u.getSigilLabel()).toBe('@test/User');
  });

  test('withSigil HOF attaches runtime metadata', () => {
    class _User extends Sigil {}
    const User = withSigil(_User, '@test/User');

    expect(User).toBeDefined();
    expect(User.SigilLabel).toBe('@test/User');

    const u = new User();
    // static helper
    expect(User.isSigilified(u)).toBe(true);
    // instance helper
    expect(u.getSigilLabel()).toBe('@test/User');
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
  });

  test('Empty label autofill', () => {
    @WithSigil()
    class X extends Sigil {}
    expect(X.SigilLabel).toMatch('@Sigil.auto-');

    class _Y extends Sigil {}
    const Y = withSigil(_Y);
    expect(Y.SigilLabel).toMatch('@Sigil.auto-');
  });

  test('lineage: subclass is recognized as subtype of base via isOfType of constructors', () => {
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
    const typeSet = subInst.getSigilLabelSet();
    expect(typeSet.has(Base.SigilLabel)).toBe(true);
    expect(typeSet.has(Sub.SigilLabel)).toBe(true);
  });

  test('lineage: subclass is recognized as subtype of base via isOfType of instances', () => {
    // create base
    class _Base extends Sigil {}
    const Base = withSigil(_Base, '@test/Base');

    class _Sub extends Base {}
    const Sub = withSigil(_Sub, '@test/Sub');

    const subInst = new Sub();
    const baseInst = new Base();

    // Sub should be recognized as of Base type (subtype)
    expect(baseInst.isOfType(subInst)).toBe(true);
    // Base is not a strict subtype of Sub
    expect(subInst.isOfType(baseInst)).toBe(false);

    // isOfTypeStrict checks exact lineage (only true for same label)
    // Base.isOfTypeStrict(Base) should be true; Sub.isOfTypeStrict(Base) should be false
    expect(baseInst.isOfTypeStrict(baseInst)).toBe(true);
    expect(subInst.isOfTypeStrict(baseInst)).toBe(false);

    // instance-level sets
    const typeSet = subInst.getSigilLabelSet();
    expect(typeSet.has(baseInst.getSigilLabel())).toBe(true);
    expect(typeSet.has(subInst.getSigilLabel())).toBe(true);
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
});
