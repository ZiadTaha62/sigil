import {
  Sigil,
  Sigilify,
  SigilifyAbstract,
  withSigil,
  WithSigil,
  isSigilCtor,
  isSigilInstance,
  updateSigilOptions,
} from '../../src';

describe('Sigil core runtime behavior', () => {
  beforeEach(() => {
    updateSigilOptions({
      autofillLabels: true,
      skipLabelInheritanceCheck: false,
    });
  });

  afterEach(() => {
    updateSigilOptions({
      autofillLabels: true,
      skipLabelInheritanceCheck: false,
    });
  });

  test('Sigilify factory returns a sigilified constructor', () => {
    class Class {}
    const Ctor = Sigilify(Class, '@test/Ctor');

    abstract class AbsClass {}
    const AbsCtor = SigilifyAbstract(AbsClass, '@test/AbsCtor');

    expect(Ctor.SigilLabel).toBe('@test/Ctor');
    expect(AbsCtor.SigilLabel).toBe('@test/AbsCtor');
    expect(Ctor).toBeDefined();
    expect(AbsCtor).toBeDefined();
    expect(Ctor.SigilLabel).toBe('@test/Ctor');
    expect(AbsCtor.SigilLabel).toBe('@test/AbsCtor');

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
      "[Sigil Error] 'Sigilify(@test/Ctor)' already sigilified."
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

  test('SigilLabel vs SigilEffectiveLabel', () => {
    class _Base extends Sigil {}
    const Base = withSigil(_Base, '@test/Base');

    class Sub extends Base {}

    expect(Base.SigilLabel).toBe('@test/Base');
    expect(new Base().getSigilLabel()).toBe('@test/Base');
    expect(Sub.SigilLabel).toMatch('@Sigil.auto-');
    expect(new Sub().getSigilLabel()).toMatch('@Sigil.auto-');
    expect(Base.SigilEffectiveLabel).toBe('@test/Base');
    expect(new Base().getSigilEffectiveLabel()).toBe('@test/Base');
    expect(Sub.SigilEffectiveLabel).toBe('@test/Base');
    expect(new Sub().getSigilEffectiveLabel()).toBe('@test/Base');
  });

  test('Sigil throw if no label passed and autofillLabels is false', () => {
    updateSigilOptions({ autofillLabels: false });
    class X extends Sigil {}

    expect(() => new X()).toThrow();
  });

  test('Getters check lineage before returning', () => {
    class _X extends Sigil {}

    expect(_X.SigilLabel).toMatch('@Sigil.auto-');
    expect(_X.SigilEffectiveLabel).toBe('Sigil');

    const X = withSigil(_X, 'X');

    expect(_X.SigilLabel).toMatch('X');
    expect(_X.SigilEffectiveLabel).toBe('X');
    expect(X.SigilLabel).toMatch('X');
    expect(X.SigilEffectiveLabel).toBe('X');
  });
});
