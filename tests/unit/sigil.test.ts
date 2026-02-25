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
    });
  });

  afterEach(() => {
    updateSigilOptions({
      autofillLabels: true,
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
      "[Sigil Error] Class 'Sigilified' with label '@test/Ctor' is already sigilified"
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

  test('lineage: constructors', () => {
    // create base
    class _Base extends Sigil {}
    const Base = withSigil(_Base, '@test/Base');

    class _Sub extends Base {}
    const Sub = withSigil(_Sub, '@test/Sub');

    const subInst = new Sub();
    const baseInst = new Base();

    // normanl instanceof like checks
    expect(Base.isOfType(baseInst)).toBe(true);
    expect(Base.isOfType(subInst)).toBe(true);
    expect(Sub.isOfType(baseInst)).toBe(false);
    expect(Sub.isOfType(subInst)).toBe(true);

    // Exact checks
    expect(Base.isExactType(baseInst)).toBe(true);
    expect(Base.isExactType(subInst)).toBe(false);
    expect(Sub.isExactType(baseInst)).toBe(false);
    expect(Sub.isExactType(subInst)).toBe(true);

    // sets
    const baseSet = baseInst.getSigilLabelSet();
    const subSet = subInst.getSigilLabelSet();
    expect(JSON.stringify(Array.from(baseSet))).toBe(
      JSON.stringify(Array.from(new Set(['Sigil', '@test/Base'])))
    );
    expect(JSON.stringify(Array.from(subSet))).toBe(
      JSON.stringify(Array.from(new Set(['Sigil', '@test/Base', '@test/Sub'])))
    );
  });

  test('lineage: instances', () => {
    // create base
    class _Base extends Sigil {}
    const Base = withSigil(_Base, '@test/Base');

    class _Sub extends Base {}
    const Sub = withSigil(_Sub, '@test/Sub');

    const subInst = new Sub();
    const baseInst = new Base();

    // normanl instanceof like checks
    expect(baseInst.isOfType(baseInst)).toBe(true);
    expect(baseInst.isOfType(subInst)).toBe(true);
    expect(subInst.isOfType(baseInst)).toBe(false);
    expect(subInst.isOfType(subInst)).toBe(true);

    // Exact checks
    expect(baseInst.isExactType(baseInst)).toBe(true);
    expect(baseInst.isExactType(subInst)).toBe(false);
    expect(subInst.isExactType(baseInst)).toBe(false);
    expect(subInst.isExactType(subInst)).toBe(true);

    // sets
    const baseSet = baseInst.getSigilLabelSet();
    const subSet = subInst.getSigilLabelSet();
    expect(JSON.stringify(Array.from(baseSet))).toBe(
      JSON.stringify(Array.from(new Set(['Sigil', '@test/Base'])))
    );
    expect(JSON.stringify(Array.from(subSet))).toBe(
      JSON.stringify(Array.from(new Set(['Sigil', '@test/Base', '@test/Sub'])))
    );
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

  test('SigilLabel & SigilEffectiveLabel', () => {
    class _Base extends Sigil {}
    const Base = withSigil(_Base, '@test/Base');

    class Sub extends Base {}

    expect(Base.SigilLabel).toBe('@test/Base');
    expect(new Base().getSigilLabel()).toBe('@test/Base');
    expect(Sub.SigilLabel).toMatch('@Sigil-auto:');
    expect(new Sub().getSigilLabel()).toMatch('@Sigil-auto:');
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
});
