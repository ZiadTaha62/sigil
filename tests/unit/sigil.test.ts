import {
  Sigil,
  SigilError,
  Sigilify,
  SigilifyAbstract,
  withSigil,
  WithSigil,
  isSigilCtor,
  isSigilInstance,
  updateSigilOptions,
  DEFAULT_LABEL_REGEX,
} from '../../src';

describe('Sigil core runtime behavior', () => {
  beforeEach(() => {
    updateSigilOptions({
      labelValidation: null,
      autofillLabels: true,
    });
  });

  afterEach(() => {
    updateSigilOptions({
      labelValidation: null,
      autofillLabels: true,
    });
  });

  /** ----------------------
   *  Mixin
   * ---------------------- */

  test('[Mixin] Sigilify factory returns a sigilified constructor', () => {
    class Class {}
    const Ctor = Sigilify(Class, '@test/Ctor');

    abstract class AbsClass {}
    const AbsCtor = SigilifyAbstract(AbsClass, '@test/AbsCtor');

    expect(Ctor).toBeDefined();
    expect(AbsCtor).toBeDefined();
    expect(Ctor.SigilLabel).toBe('@test/Ctor');
    expect(AbsCtor.SigilLabel).toBe('@test/AbsCtor');
    expect(Ctor.SigilEffectiveLabel).toBe('@test/Ctor');
    expect(AbsCtor.SigilEffectiveLabel).toBe('@test/AbsCtor');
    expect(Ctor.SigilLabelLineage).toEqual(['Sigil', '@test/Ctor']);
    expect(AbsCtor.SigilLabelLineage).toEqual(['Sigil', '@test/AbsCtor']);
    expect(Ctor.SigilLabelSet).toEqual(new Set(['Sigil', '@test/Ctor']));
    expect(AbsCtor.SigilLabelSet).toEqual(new Set(['Sigil', '@test/AbsCtor']));

    const inst = new Ctor();
    //@ts-expect-error - Extending abstract class
    const absInst = new AbsCtor() as InstanceType<typeof AbsCtor>;

    expect(inst).toBeDefined();
    expect(absInst).toBeDefined();
    expect(inst.getSigilLabel()).toBe('@test/Ctor');
    expect(absInst.getSigilLabel()).toBe('@test/AbsCtor');
    expect(inst.getSigilEffectiveLabel()).toBe('@test/Ctor');
    expect(absInst.getSigilEffectiveLabel()).toBe('@test/AbsCtor');
    expect(inst.getSigilLabelLineage()).toEqual(['Sigil', '@test/Ctor']);
    expect(absInst.getSigilLabelLineage()).toEqual(['Sigil', '@test/AbsCtor']);
    expect(inst.getSigilLabelSet()).toEqual(new Set(['Sigil', '@test/Ctor']));
    expect(absInst.getSigilLabelSet()).toEqual(new Set(['Sigil', '@test/AbsCtor']));
  });

  /** ----------------------
   *  Decorators and HOFs
   * ---------------------- */

  test("[Decorators and HOFs] 'WithSigil' decorator attaches runtime metadata", () => {
    @WithSigil('@test/User')
    class User extends Sigil {}

    expect(User).toBeDefined();
    expect(User.SigilLabel).toBe('@test/User');
    expect(User.SigilEffectiveLabel).toBe('@test/User');
    expect(User.SigilLabelLineage).toEqual(['Sigil', '@test/User']);
    expect(User.SigilLabelSet).toEqual(new Set(['Sigil', '@test/User']));

    const u = new User();
    expect(u).toBeDefined();
    expect(u.getSigilLabel()).toBe('@test/User');
    expect(u.getSigilEffectiveLabel()).toBe('@test/User');
    expect(u.getSigilLabelLineage()).toEqual(['Sigil', '@test/User']);
    expect(u.getSigilLabelSet()).toEqual(new Set(['Sigil', '@test/User']));
  });

  test("[Decorators and HOFs] 'withSigil' HOF attaches runtime metadata", () => {
    class _User extends Sigil {}
    const User = withSigil(_User, '@test/User');

    expect(User).toBeDefined();
    expect(User.SigilLabel).toBe('@test/User');
    expect(User.SigilEffectiveLabel).toBe('@test/User');
    expect(User.SigilLabelLineage).toEqual(['Sigil', '@test/User']);
    expect(User.SigilLabelSet).toEqual(new Set(['Sigil', '@test/User']));

    const u = new User();
    expect(u).toBeDefined();
    expect(u.getSigilLabel()).toBe('@test/User');
    expect(u.getSigilEffectiveLabel()).toBe('@test/User');
    expect(u.getSigilLabelLineage()).toEqual(['Sigil', '@test/User']);
    expect(u.getSigilLabelSet()).toEqual(new Set(['Sigil', '@test/User']));
  });

  /** ----------------------
   *  Lazy evaluation
   * ---------------------- */

  test("[Lazy evaluation] Normal, evaluation on '@WithSigil', autofillLabels true", () => {
    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    @WithSigil('C')
    class C extends B {} // <-- label passed, evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on '@WithSigil', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      @WithSigil('C')
      class C extends B {} // <-- label passed, evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'B' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on 'withSigil', autofillLabels true", () => {
    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class _C extends B {} // <-- label passed, evaluate C & B
    const C = withSigil(_C, 'C'); // <-- label passed, evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on 'withSigil', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      class _C extends B {}
      const C = withSigil(_C, 'C'); // <-- label passed, evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'B' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on 'new', autofillLabels true", () => {
    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    const c = new C(); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on 'new', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      const c = new C(); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabel', autofillLabels true", () => {
    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabel; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabel', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.SigilLabel; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilEffectiveLabel', autofillLabels true", () => {
    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilEffectiveLabel; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilEffectiveLabel', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.SigilEffectiveLabel; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabelLineage', autofillLabels true", () => {
    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabelLineage; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabelLineage', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.SigilLabelLineage; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabelSet', autofillLabels true", () => {
    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabelSet; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabelSet', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.SigilLabelSet; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'isOfType()', autofillLabels true", () => {
    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.isOfType({}); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'isOfType()', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.isOfType({}); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'isExactType()', autofillLabels true", () => {
    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.isExactType({}); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'isExactType()', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @WithSigil('A')
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.isExactType({}); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on '@WithSigil', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    @WithSigil('C')
    class C extends B {} // <-- label passed, evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on '@WithSigil', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      @WithSigil('C')
      class C extends B {} // <-- label passed, evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'B' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on 'withSigil', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class _C extends B {} // <-- label passed, evaluate C & B
    const C = withSigil(_C, 'C'); // <-- label passed, evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on 'withSigil', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      class _C extends B {}
      const C = withSigil(_C, 'C'); // <-- label passed, evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'B' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on 'new', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    const c = new C(); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on 'new', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      const c = new C(); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabel', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabel; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabel', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.SigilLabel; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilEffectiveLabel', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilEffectiveLabel; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilEffectiveLabel', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.SigilEffectiveLabel; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabelLineage', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabelLineage; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabelLineage', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.SigilLabelLineage; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabelSet', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabelSet; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabelSet', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.SigilLabelSet; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'isOfType()', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.isOfType({}); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'isOfType()', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.isOfType({}); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'isExactType()', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.isExactType({}); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'isExactType()', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    @WithSigil('A')
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@WithSigil'
    expect(() => {
      C.isExactType({}); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  /** ----------------------
   *  Options
   * ---------------------- */

  test('[Options] Label validation', () => {
    updateSigilOptions({ labelValidation: DEFAULT_LABEL_REGEX });
    expect(() => {
      @WithSigil('@vicin/sigil.X')
      class X extends Sigil {}
    }).not.toThrow();
    expect(() => {
      @WithSigil('X')
      class X extends Sigil {}
    }).toThrow(
      "[Sigil Error] Invalid identity label 'X'. Make sure that supplied label matches validation regex or function"
    );
    updateSigilOptions({ labelValidation: (l: string) => l.length > 5 });
    expect(() => {
      @WithSigil('@vicin/sigil.X')
      class X extends Sigil {}
    }).not.toThrow();
    expect(() => {
      @WithSigil('X')
      class X extends Sigil {}
    }).toThrow(
      "[Sigil Error] Invalid identity label 'X'. Make sure that supplied label matches validation regex or function"
    );
  });

  /** ----------------------
   *  Lineage
   * ---------------------- */

  test('[Lineage] Normal, constructors', () => {
    // create classes
    class Base extends Sigil {}
    class Sub extends Base {}
    class Grand extends Sub {}

    // create instances
    const baseInst = new Base();
    const subInst = new Sub();
    const grandInst = new Grand();

    // normal instanceof like checks
    expect(Base.isOfType(baseInst)).toBe(true);
    expect(Base.isOfType(subInst)).toBe(true);
    expect(Base.isOfType(grandInst)).toBe(true);
    expect(Sub.isOfType(baseInst)).toBe(false);
    expect(Sub.isOfType(subInst)).toBe(true);
    expect(Sub.isOfType(grandInst)).toBe(true);
    expect(Grand.isOfType(baseInst)).toBe(false);
    expect(Grand.isOfType(subInst)).toBe(false);
    expect(Grand.isOfType(grandInst)).toBe(true);

    // Exact checks
    expect(Base.isExactType(baseInst)).toBe(true);
    expect(Base.isExactType(subInst)).toBe(false);
    expect(Base.isExactType(grandInst)).toBe(false);
    expect(Sub.isExactType(baseInst)).toBe(false);
    expect(Sub.isExactType(subInst)).toBe(true);
    expect(Sub.isExactType(grandInst)).toBe(false);
    expect(Grand.isExactType(baseInst)).toBe(false);
    expect(Grand.isExactType(subInst)).toBe(false);
    expect(Grand.isExactType(grandInst)).toBe(true);
  });

  test('[Lineage] Normal, instances', () => {
    // create classes
    class Base extends Sigil {}
    class Sub extends Base {}
    class Grand extends Sub {}

    // create instances
    const baseInst = new Base();
    const subInst = new Sub();
    const grandInst = new Grand();

    // normal instanceof like checks
    expect(baseInst.isOfType(baseInst)).toBe(true);
    expect(baseInst.isOfType(subInst)).toBe(true);
    expect(baseInst.isOfType(grandInst)).toBe(true);
    expect(subInst.isOfType(baseInst)).toBe(false);
    expect(subInst.isOfType(subInst)).toBe(true);
    expect(subInst.isOfType(grandInst)).toBe(true);
    expect(grandInst.isOfType(baseInst)).toBe(false);
    expect(grandInst.isOfType(subInst)).toBe(false);
    expect(grandInst.isOfType(grandInst)).toBe(true);

    // Exact checks
    expect(baseInst.isExactType(baseInst)).toBe(true);
    expect(baseInst.isExactType(subInst)).toBe(false);
    expect(baseInst.isExactType(grandInst)).toBe(false);
    expect(subInst.isExactType(baseInst)).toBe(false);
    expect(subInst.isExactType(subInst)).toBe(true);
    expect(subInst.isExactType(grandInst)).toBe(false);
    expect(grandInst.isExactType(baseInst)).toBe(false);
    expect(grandInst.isExactType(subInst)).toBe(false);
    expect(grandInst.isExactType(grandInst)).toBe(true);
  });

  test('[Lineage] Abstract, constructors', () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    // create classes
    class Base extends AbsSigil {}
    class Sub extends Base {}
    class Grand extends Sub {}

    // create instances
    const baseInst = new Base();
    const subInst = new Sub();
    const grandInst = new Grand();

    // normal instanceof like checks
    expect(Base.isOfType(baseInst)).toBe(true);
    expect(Base.isOfType(subInst)).toBe(true);
    expect(Base.isOfType(grandInst)).toBe(true);
    expect(Sub.isOfType(baseInst)).toBe(false);
    expect(Sub.isOfType(subInst)).toBe(true);
    expect(Sub.isOfType(grandInst)).toBe(true);
    expect(Grand.isOfType(baseInst)).toBe(false);
    expect(Grand.isOfType(subInst)).toBe(false);
    expect(Grand.isOfType(grandInst)).toBe(true);

    // Exact checks
    expect(Base.isExactType(baseInst)).toBe(true);
    expect(Base.isExactType(subInst)).toBe(false);
    expect(Base.isExactType(grandInst)).toBe(false);
    expect(Sub.isExactType(baseInst)).toBe(false);
    expect(Sub.isExactType(subInst)).toBe(true);
    expect(Sub.isExactType(grandInst)).toBe(false);
    expect(Grand.isExactType(baseInst)).toBe(false);
    expect(Grand.isExactType(subInst)).toBe(false);
    expect(Grand.isExactType(grandInst)).toBe(true);
  });

  test('[Lineage] Abstract, instances', () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    // create classes
    class Base extends AbsSigil {}
    class Sub extends Base {}
    class Grand extends Sub {}

    // create instances
    const baseInst = new Base();
    const subInst = new Sub();
    const grandInst = new Grand();

    // normal instanceof like checks
    expect(baseInst.isOfType(baseInst)).toBe(true);
    expect(baseInst.isOfType(subInst)).toBe(true);
    expect(baseInst.isOfType(grandInst)).toBe(true);
    expect(subInst.isOfType(baseInst)).toBe(false);
    expect(subInst.isOfType(subInst)).toBe(true);
    expect(subInst.isOfType(grandInst)).toBe(true);
    expect(grandInst.isOfType(baseInst)).toBe(false);
    expect(grandInst.isOfType(subInst)).toBe(false);
    expect(grandInst.isOfType(grandInst)).toBe(true);

    // Exact checks
    expect(baseInst.isExactType(baseInst)).toBe(true);
    expect(baseInst.isExactType(subInst)).toBe(false);
    expect(baseInst.isExactType(grandInst)).toBe(false);
    expect(subInst.isExactType(baseInst)).toBe(false);
    expect(subInst.isExactType(subInst)).toBe(true);
    expect(subInst.isExactType(grandInst)).toBe(false);
    expect(grandInst.isExactType(baseInst)).toBe(false);
    expect(grandInst.isExactType(subInst)).toBe(false);
    expect(grandInst.isExactType(grandInst)).toBe(true);
  });

  test('[Lineage] Normal, Return false on non objects', () => {
    class A extends Sigil {}
    const a = new A();

    expect(A.isOfType('str')).toBe(false);
    expect(A.isOfType(1)).toBe(false);
    expect(A.isOfType(true)).toBe(false);
    expect(A.isOfType(null)).toBe(false);
    expect(A.isOfType(undefined)).toBe(false);
    expect(A.isExactType('str')).toBe(false);
    expect(A.isExactType(1)).toBe(false);
    expect(A.isExactType(true)).toBe(false);
    expect(A.isExactType(null)).toBe(false);
    expect(A.isExactType(undefined)).toBe(false);
    expect(a.isOfType('str')).toBe(false);
    expect(a.isOfType(1)).toBe(false);
    expect(a.isOfType(true)).toBe(false);
    expect(a.isOfType(null)).toBe(false);
    expect(a.isOfType(undefined)).toBe(false);
    expect(a.isExactType('str')).toBe(false);
    expect(a.isExactType(1)).toBe(false);
    expect(a.isExactType(true)).toBe(false);
    expect(a.isExactType(null)).toBe(false);
    expect(a.isExactType(undefined)).toBe(false);
  });

  test('[Lineage] Abstract, Return false on non objects', () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, 'AbsSigil');

    class A extends AbsSigil {}
    const a = new A();

    expect(A.isOfType('str')).toBe(false);
    expect(A.isOfType(1)).toBe(false);
    expect(A.isOfType(true)).toBe(false);
    expect(A.isOfType(null)).toBe(false);
    expect(A.isOfType(undefined)).toBe(false);
    expect(A.isExactType('str')).toBe(false);
    expect(A.isExactType(1)).toBe(false);
    expect(A.isExactType(true)).toBe(false);
    expect(A.isExactType(null)).toBe(false);
    expect(A.isExactType(undefined)).toBe(false);
    expect(a.isOfType('str')).toBe(false);
    expect(a.isOfType(1)).toBe(false);
    expect(a.isOfType(true)).toBe(false);
    expect(a.isOfType(null)).toBe(false);
    expect(a.isOfType(undefined)).toBe(false);
    expect(a.isExactType('str')).toBe(false);
    expect(a.isExactType(1)).toBe(false);
    expect(a.isExactType(true)).toBe(false);
    expect(a.isExactType(null)).toBe(false);
    expect(a.isExactType(undefined)).toBe(false);
  });

  /** ----------------------
   *  Inspectors
   * ---------------------- */

  test("[Inspectors] 'isSigilCtor' and 'isSigilInstance' helpers", () => {
    class _X extends Sigil {}
    const X = withSigil(_X, '@test/X');

    class Y {}

    const x = new X();
    const y = new Y();

    expect(isSigilCtor(X)).toBe(true);
    expect(isSigilInstance(x)).toBe(true);

    // Plain object is not a sigil instance
    expect(isSigilCtor(Y)).toBe(false);
    expect(isSigilInstance(y)).toBe(false);
  });

  test('[Inspectors] SigilLabel & SigilEffectiveLabel', () => {
    class _Base extends Sigil {}
    const Base = withSigil(_Base, '@test/Base');

    class Sub extends Base {}

    expect(Base.SigilLabel).toBe('@test/Base');
    expect(Sub.SigilLabel).toMatch('@Sigil-auto:');
    expect(Base.SigilEffectiveLabel).toBe('@test/Base');
    expect(Sub.SigilEffectiveLabel).toBe('@test/Base');
  });

  /** ----------------------
   *  Errors
   * ---------------------- */

  test('[Errors] Throw on double siglify', () => {
    class Class {}
    const Ctor = Sigilify(Class, '@test/Ctor');
    abstract class AbsClass {}
    const AbsCtor = SigilifyAbstract(AbsClass, '@test/AbsCtor');

    expect(() => Sigilify(Ctor, '@test/Ctor')).toThrow(
      "[Sigil Error] Class 'Sigilified' with label '@test/Ctor' is already sigilified"
    );
    expect(() => SigilifyAbstract(AbsCtor, '@test/AbsCtor')).toThrow(
      "[Sigil Error] Class 'Sigilified' with label '@test/AbsCtor' is already sigilified"
    );
  });

  test('[Errors] Throw when decorator or HOF is used on non-sigil class', () => {
    expect(() => {
      @WithSigil('X')
      class X {}
    }).toThrow(
      "[Sigil Error] 'WithSigil' decorator accept only Sigil classes but used on class 'X'"
    );

    expect(() => {
      withSigil(class X {}, 'X');
    }).toThrow("[Sigil Error] 'withSigil' HOF accept only Sigil classes but used on class 'X'");
  });

  test('[Errors] Throw when decorator or HOF is used on the same class more than once', () => {
    expect(() => {
      @WithSigil('B')
      @WithSigil('A')
      class A extends Sigil {}
    }).toThrow("[Sigil Error] Class 'A' with label 'A' is already sigilified");

    expect(() => {
      class _A extends Sigil {}
      withSigil(_A, 'A');
      withSigil(_A, 'B');
    }).toThrow("[Sigil Error] Class '_A' with label 'A' is already sigilified");
  });

  test('[Errors] Throw if no label passed and autofillLabels is false', () => {
    updateSigilOptions({ autofillLabels: false });
    class X extends Sigil {}
    expect(() => {
      new X();
    }).toThrow(
      "[Sigil Error] Class 'X' is not sigilified with 'autofillLabels' setted to 'false', Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test('[Errors] Throw if same label is passed in the same sigil chain', () => {
    @WithSigil('A')
    class A extends Sigil {}

    expect(() => {
      @WithSigil('A')
      class B extends A {}
    }).toThrow(
      "[Sigil Error] Attempt to assign label 'A' to class 'B' but label is already used by parent 'A', Make sure that every class has a unique label"
    );
  });

  test('[Errors] Throw on invalid options', () => {
    expect(() => {
      updateSigilOptions({ autofillLabels: {} as any });
    }).toThrow("'updateSigilOptions.autofillLabels' must be boolean");
    expect(() => {
      updateSigilOptions({ labelValidation: false as any });
    }).toThrow("'updateSigilOptions.labelValidation' must be null, function or RegExp");
  });

  test("[Errors] Throw on using '@Sigil-auto' prefix", () => {
    expect(() => {
      @WithSigil('@Sigil-auto:X')
      class X extends Sigil {}
    }).toThrow("'@Sigil-auto' is a prefex reserved by the library");
  });

  /** ----------------------
   *  Classes
   * ---------------------- */

  test("[Classes] 'Sigil'", () => {
    expect(Sigil).toBeDefined();
    expect(Sigil.SigilLabel).toBe('Sigil');
    expect(Sigil.SigilEffectiveLabel).toBe('Sigil');
    expect(Sigil.SigilLabelLineage).toEqual(['Sigil']);
    expect(Sigil.SigilLabelSet).toEqual(new Set(['Sigil']));

    const inst = new Sigil();

    expect(inst).toBeDefined();
    expect(inst.getSigilLabel()).toBe('Sigil');
    expect(inst.getSigilEffectiveLabel()).toBe('Sigil');
    expect(inst.getSigilLabelLineage()).toEqual(['Sigil']);
    expect(inst.getSigilLabelSet()).toEqual(new Set(['Sigil']));
  });

  test("[Classes] 'SigilError'", () => {
    expect(SigilError).toBeDefined();
    expect(SigilError.SigilLabel).toBe('SigilError');
    expect(SigilError.SigilEffectiveLabel).toBe('SigilError');
    expect(SigilError.SigilLabelLineage).toEqual(['Sigil', 'SigilError']);
    expect(SigilError.SigilLabelSet).toEqual(new Set(['Sigil', 'SigilError']));

    const inst = new SigilError();

    expect(inst).toBeDefined();
    expect(inst.getSigilLabel()).toBe('SigilError');
    expect(inst.getSigilEffectiveLabel()).toBe('SigilError');
    expect(inst.getSigilLabelLineage()).toEqual(['Sigil', 'SigilError']);
    expect(inst.getSigilLabelSet()).toEqual(new Set(['Sigil', 'SigilError']));
    expect(inst instanceof Error).toBe(true);
  });
});
