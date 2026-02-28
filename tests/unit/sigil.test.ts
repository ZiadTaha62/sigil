import {
  Sigil,
  SigilError,
  Sigilify,
  SigilifyAbstract,
  attachSigil,
  AttachSigil,
  isSigilCtor,
  isSigilInstance,
  updateSigilOptions,
  RECOMMENDED_LABEL_REGEX,
  getSigilLabels,
  withSigil,
  WithSigil,
  DEFAULT_LABEL_REGEX,
} from '../../src';

let labels = new Set<string>();

function generateRandomLabel(): string {
  const label = Math.random().toString(36).slice(2, 10);
  if (labels.has(label)) return generateRandomLabel();
  labels.add(label);
  return label;
}

describe('Sigil core runtime behavior', () => {
  beforeEach(() => {
    updateSigilOptions({
      autofillLabels: true,
      labelValidation: null,
      skipLabelUniquenessCheck: false,
    });
  });

  afterEach(() => {
    updateSigilOptions({
      autofillLabels: true,
      labelValidation: null,
      skipLabelUniquenessCheck: false,
    });
  });

  /** ----------------------
   *  Inspection
   * ---------------------- */

  test("[Inspection] 'getSigilLabels'", () => {
    @AttachSigil('X')
    class X extends Sigil {} // <-- explicit label
    class Y extends Sigil {} // <-- random generated label, should not be added to set
    new Y();

    expect(getSigilLabels()).toEqual(['Sigil', 'SigilError', 'X']);
  });

  test("[Inspection] 'isSigilCtor' and 'isSigilInstance' helpers", () => {
    @AttachSigil(generateRandomLabel())
    class X extends Sigil {}
    class Y {}

    const x = new X();
    const y = new Y();

    expect(isSigilCtor(X)).toBe(true);
    expect(isSigilInstance(x)).toBe(true);

    // Plain object is not a sigil instance
    expect(isSigilCtor(Y)).toBe(false);
    expect(isSigilInstance(y)).toBe(false);
  });

  test('[Inspection] SigilLabel & SigilEffectiveLabel', () => {
    const label = '@test/[Inspection] SigilLabel & SigilEffectiveLabel';

    @AttachSigil(label)
    class X extends Sigil {}

    class Y extends X {}

    expect(X.SigilLabel).toBe(label);
    expect(Y.SigilLabel).toMatch('@Sigil-auto:');
    expect(X.SigilEffectiveLabel).toBe(label);
    expect(Y.SigilEffectiveLabel).toBe(label);
  });

  /** ----------------------
   *  Mixin
   * ---------------------- */

  test('[Mixin] Sigilify factory returns a sigilified constructor', () => {
    const label = '@test/[Mixin] Ctor';
    const absLabel = '@test/[Mixin] AbsCtor';

    class Class {}
    const Ctor = Sigilify(Class, label);

    abstract class AbsClass {}
    const AbsCtor = SigilifyAbstract(AbsClass, absLabel);

    expect(Ctor).toBeDefined();
    expect(AbsCtor).toBeDefined();
    expect(Ctor.SigilLabel).toBe(label);
    expect(AbsCtor.SigilLabel).toBe(absLabel);
    expect(Ctor.SigilEffectiveLabel).toBe(label);
    expect(AbsCtor.SigilEffectiveLabel).toBe(absLabel);
    expect(Ctor.SigilLabelLineage).toEqual(['Sigil', label]);
    expect(AbsCtor.SigilLabelLineage).toEqual(['Sigil', absLabel]);
    expect(Ctor.SigilLabelSet).toEqual(new Set(['Sigil', label]));
    expect(AbsCtor.SigilLabelSet).toEqual(new Set(['Sigil', absLabel]));

    const inst = new Ctor();
    //@ts-expect-error - Extending abstract class
    const absInst = new AbsCtor() as InstanceType<typeof AbsCtor>;

    expect(inst).toBeDefined();
    expect(absInst).toBeDefined();
    expect(inst.getSigilLabel()).toBe(label);
    expect(absInst.getSigilLabel()).toBe(absLabel);
    expect(inst.getSigilEffectiveLabel()).toBe(label);
    expect(absInst.getSigilEffectiveLabel()).toBe(absLabel);
    expect(inst.getSigilLabelLineage()).toEqual(['Sigil', label]);
    expect(absInst.getSigilLabelLineage()).toEqual(['Sigil', absLabel]);
    expect(inst.getSigilLabelSet()).toEqual(new Set(['Sigil', label]));
    expect(absInst.getSigilLabelSet()).toEqual(new Set(['Sigil', absLabel]));
  });

  /** ----------------------
   *  Attach function and decorator
   * ---------------------- */

  test("[Attach function and decorator] 'AttachSigil' decorator attaches runtime metadata", () => {
    const label = "@test/[Attach function and decorator] 'AttachSigil'";

    @AttachSigil(label)
    class User extends Sigil {}

    expect(User).toBeDefined();
    expect(User.SigilLabel).toBe(label);
    expect(User.SigilEffectiveLabel).toBe(label);
    expect(User.SigilLabelLineage).toEqual(['Sigil', label]);
    expect(User.SigilLabelSet).toEqual(new Set(['Sigil', label]));

    const u = new User();
    expect(u).toBeDefined();
    expect(u.getSigilLabel()).toBe(label);
    expect(u.getSigilEffectiveLabel()).toBe(label);
    expect(u.getSigilLabelLineage()).toEqual(['Sigil', label]);
    expect(u.getSigilLabelSet()).toEqual(new Set(['Sigil', label]));
  });

  test("[Attach function and decorator] 'attachSigil' function attaches runtime metadata", () => {
    const label = "@test/[Attach function and decorator] 'attachSigil'";

    class User extends Sigil {}
    attachSigil(User, label);

    expect(User).toBeDefined();
    expect(User.SigilLabel).toBe(label);
    expect(User.SigilEffectiveLabel).toBe(label);
    expect(User.SigilLabelLineage).toEqual(['Sigil', label]);
    expect(User.SigilLabelSet).toEqual(new Set(['Sigil', label]));

    const u = new User();
    expect(u).toBeDefined();
    expect(u.getSigilLabel()).toBe(label);
    expect(u.getSigilEffectiveLabel()).toBe(label);
    expect(u.getSigilLabelLineage()).toEqual(['Sigil', label]);
    expect(u.getSigilLabelSet()).toEqual(new Set(['Sigil', label]));
  });

  /** ----------------------
   *  Lazy evaluation
   * ---------------------- */

  test("[Lazy evaluation] Normal, evaluation on '@AttachSigil', autofillLabels true", () => {
    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    @AttachSigil(generateRandomLabel())
    class C extends B {} // <-- label passed, evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on '@AttachSigil', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      @AttachSigil(generateRandomLabel())
      class C extends B {} // <-- label passed, evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'B' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on 'attachSigil', autofillLabels true", () => {
    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- label passed, evaluate C & B
    attachSigil(C, generateRandomLabel()); // <-- label passed, evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on 'attachSigil', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      class C extends B {}
      attachSigil(C, generateRandomLabel()); // <-- label passed, evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'B' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on 'new', autofillLabels true", () => {
    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    const c = new C(); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on 'new', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      const c = new C(); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabel', autofillLabels true", () => {
    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabel; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabel', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.SigilLabel; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilEffectiveLabel', autofillLabels true", () => {
    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilEffectiveLabel; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilEffectiveLabel', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.SigilEffectiveLabel; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabelLineage', autofillLabels true", () => {
    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabelLineage; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabelLineage', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.SigilLabelLineage; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabelSet', autofillLabels true", () => {
    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabelSet; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'SigilLabelSet', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.SigilLabelSet; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'isOfType()', autofillLabels true", () => {
    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.isOfType({}); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'isOfType()', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.isOfType({}); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Normal, evaluation on static 'isExactType()', autofillLabels true", () => {
    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.isExactType({}); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Normal, evaluation on static 'isExactType()', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    @AttachSigil(generateRandomLabel())
    class A extends Sigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.isExactType({}); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on '@AttachSigil', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    @AttachSigil(generateRandomLabel())
    class C extends B {} // <-- label passed, evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on '@AttachSigil', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      @AttachSigil(generateRandomLabel())
      class C extends B {} // <-- label passed, evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'B' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on 'attachSigil', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- label passed, evaluate C & B
    attachSigil(C, generateRandomLabel()); // <-- label passed, evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on 'attachSigil', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      class C extends B {}
      attachSigil(C, generateRandomLabel()); // <-- label passed, evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'B' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on 'new', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    const c = new C(); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on 'new', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      const c = new C(); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabel', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabel; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabel', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.SigilLabel; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilEffectiveLabel', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilEffectiveLabel; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilEffectiveLabel', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.SigilEffectiveLabel; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabelLineage', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabelLineage; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabelLineage', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.SigilLabelLineage; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabelSet', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.SigilLabelSet; // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'SigilLabelSet', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.SigilLabelSet; // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'isOfType()', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.isOfType({}); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'isOfType()', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.isOfType({}); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'isExactType()', autofillLabels true", () => {
    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    C.isExactType({}); // <-- evaluate C & B

    // There is no expect to do here but evaluation will be prominent when autofillLabels is set to false
  });

  test("[Lazy evaluation] Abstract, evaluation on static 'isExactType()', autofillLabels false", () => {
    updateSigilOptions({ autofillLabels: false });

    abstract class Abs {}
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

    @AttachSigil(generateRandomLabel())
    class A extends AbsSigil {} // <-- Label passed, evaluate A
    class B extends A {} // <-- lazily evaluated
    class C extends B {} // <-- lazily evaluated

    // Error is thrown the moment whe use '@AttachSigil'
    expect(() => {
      C.isExactType({}); // <-- evaluate C & B
    }).toThrow(
      "[Sigil Error] Class 'C' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  /** ----------------------
   *  Options
   * ---------------------- */

  test('[Options] autofillLabels', () => {
    updateSigilOptions({ autofillLabels: false });

    expect(() => {
      class A extends Sigil {}
      new A();
    }).toThrow(
      "[Sigil Error] Class 'A' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );

    updateSigilOptions({ autofillLabels: true });

    expect(() => {
      class A extends Sigil {}
      new A();
    }).not.toThrow();
  });

  test('[Options] LabelValidation', () => {
    const validRegexLabel = '@test/Options.LabelValidation';
    const validFuncLabel = 'SomeLabelMoreThan10';
    const randomLabel = generateRandomLabel();

    updateSigilOptions({ labelValidation: RECOMMENDED_LABEL_REGEX });

    expect(() => {
      @AttachSigil(validRegexLabel)
      class A extends Sigil {}
    }).not.toThrow();
    expect(() => {
      @AttachSigil(randomLabel)
      class A extends Sigil {}
    }).toThrow(
      `[Sigil Error] Invalid Sigil label '${randomLabel}'. Make sure that supplied label matches validation regex or function`
    );

    updateSigilOptions({ labelValidation: (l: string) => l.length > 10 });

    expect(() => {
      @AttachSigil(validFuncLabel)
      class X extends Sigil {}
    }).not.toThrow();
    expect(() => {
      @AttachSigil(randomLabel)
      class X extends Sigil {}
    }).toThrow(
      `[Sigil Error] Invalid Sigil label '${randomLabel}'. Make sure that supplied label matches validation regex or function`
    );
  });

  test('[Options] skipLabelUniquenessCheck', () => {
    updateSigilOptions({ skipLabelUniquenessCheck: false });

    expect(() => {
      @AttachSigil('Sigil')
      class A extends Sigil {}
    }).toThrow(
      `[Sigil Error] Passed label 'Sigil' to class 'A' is re-used, passed labels must be unique`
    );

    updateSigilOptions({ skipLabelUniquenessCheck: true });

    expect(() => {
      @AttachSigil('Sigil')
      class X extends Sigil {}
    }).not.toThrow();
  });

  test('[Options] passed per-function options override global options', () => {
    expect(() => {
      class X {}
      Sigilify(X, generateRandomLabel(), { labelValidation: RECOMMENDED_LABEL_REGEX });
    }).toThrow();
    expect(() => {
      class X {}
      Sigilify(X, undefined as any, { autofillLabels: false });
    }).toThrow();
    expect(() => {
      class X {}
      Sigilify(X, 'Sigil', { skipLabelUniquenessCheck: true });
    }).not.toThrow();
    expect(() => {
      abstract class X {}
      SigilifyAbstract(X, generateRandomLabel(), { labelValidation: RECOMMENDED_LABEL_REGEX });
    }).toThrow();
    expect(() => {
      abstract class X {}
      SigilifyAbstract(X, undefined as any, { autofillLabels: false });
    }).toThrow();
    expect(() => {
      abstract class X {}
      SigilifyAbstract(X, 'Sigil', { skipLabelUniquenessCheck: true });
    }).not.toThrow();
    expect(() => {
      class X extends Sigil {}
      attachSigil(X, generateRandomLabel(), { labelValidation: RECOMMENDED_LABEL_REGEX });
    }).toThrow();
    expect(() => {
      class X extends Sigil {}
      attachSigil(X, undefined as any, { autofillLabels: false });
    }).toThrow();
    expect(() => {
      class X extends Sigil {}
      attachSigil(X, 'Sigil', { skipLabelUniquenessCheck: true });
    }).not.toThrow();
    expect(() => {
      @AttachSigil(generateRandomLabel(), { labelValidation: RECOMMENDED_LABEL_REGEX })
      class X extends Sigil {}
    }).toThrow();
    expect(() => {
      @AttachSigil(undefined as any, { autofillLabels: false })
      class X extends Sigil {}
    }).toThrow();
    expect(() => {
      @AttachSigil('Sigil', { skipLabelUniquenessCheck: true })
      class X extends Sigil {}
    }).not.toThrow();
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
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

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
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

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
    const AbsSigil = SigilifyAbstract(Abs, generateRandomLabel());

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
   *  Errors
   * ---------------------- */

  test('[Errors] Throw on double siglify', () => {
    const label = generateRandomLabel();
    const absLabel = generateRandomLabel();

    class Class {}
    const Ctor = Sigilify(Class, label);
    abstract class AbsClass {}
    const AbsCtor = SigilifyAbstract(AbsClass, absLabel);

    expect(() => Sigilify(Ctor, label)).toThrow(
      `[Sigil Error] Class 'Sigilified' with label '${label}' is already sigilified`
    );
    expect(() => SigilifyAbstract(AbsCtor, absLabel)).toThrow(
      `[Sigil Error] Class 'Sigilified' with label '${absLabel}' is already sigilified`
    );
  });

  test('[Errors] Throw when decorator or function is used on non-sigil class', () => {
    expect(() => {
      @AttachSigil(generateRandomLabel())
      class X {}
    }).toThrow(
      "[Sigil Error] 'AttachSigil' decorator accept only Sigil classes but used on class 'X'"
    );

    expect(() => {
      attachSigil(class X {}, generateRandomLabel());
    }).toThrow(
      "[Sigil Error] 'attachSigil' function accept only Sigil classes but used on class 'X'"
    );
  });

  test('[Errors] Throw when decorator or function is used on the same class more than once', () => {
    const labelFun = generateRandomLabel();
    const labelDec = generateRandomLabel();

    expect(() => {
      @AttachSigil(labelDec)
      @AttachSigil(labelDec)
      class A extends Sigil {}
    }).toThrow(`[Sigil Error] Class 'A' with label '${labelDec}' is already sigilified`);

    expect(() => {
      class A extends Sigil {}
      attachSigil(A, labelFun);
      attachSigil(A, labelFun);
    }).toThrow(`[Sigil Error] Class 'A' with label '${labelFun}' is already sigilified`);
  });

  test('[Errors] Throw if no label passed and autofillLabels is false', () => {
    updateSigilOptions({ autofillLabels: false });

    class X extends Sigil {}

    expect(() => {
      new X();
    }).toThrow(
      "[Sigil Error] Class 'X' is not sigilified, Make sure to sigilify all Sigil classes or set 'autofillLabels' to 'true'"
    );
  });

  test('[Errors] Throw if same label is passed twice to sigil', () => {
    expect(() => {
      @AttachSigil('Sigil') // Already passed by lib
      class A extends Sigil {}
    }).toThrow(
      "[Sigil Error] Passed label 'Sigil' to class 'A' is re-used, passed labels must be unique"
    );

    const label = generateRandomLabel();

    @AttachSigil(label)
    class A extends Sigil {}

    expect(() => {
      @AttachSigil(label) // External re-used label
      class B extends A {}
    }).toThrow(
      `[Sigil Error] Passed label '${label}' to class 'B' is re-used, passed labels must be unique`
    );
  });

  test('[Errors] Throw on invalid label format', () => {
    updateSigilOptions({ labelValidation: RECOMMENDED_LABEL_REGEX });

    const randomLabel = generateRandomLabel();

    expect(() => {
      @AttachSigil(randomLabel)
      class X extends Sigil {}
    }).toThrow(
      `[Sigil Error] Invalid Sigil label '${randomLabel}'. Make sure that supplied label matches validation regex or function`
    );
  });

  test("[Errors] Throw on using '@Sigil-auto' prefix", () => {
    expect(() => {
      @AttachSigil(`@Sigil-auto:${generateRandomLabel()}`)
      class X extends Sigil {}
    }).toThrow("'@Sigil-auto' is a prefex reserved by the library");
  });

  test('[Errors] Throw on invalid options', () => {
    expect(() => {
      updateSigilOptions({ autofillLabels: {} as any });
    }).toThrow("'updateSigilOptions.autofillLabels' must be boolean");
    expect(() => {
      updateSigilOptions({ labelValidation: false as any });
    }).toThrow("'updateSigilOptions.labelValidation' must be null, function or RegExp");
    expect(() => {
      updateSigilOptions({ skipLabelUniquenessCheck: 123 as any });
    }).toThrow("'updateSigilOptions.skipLabelUniquenessCheck' must be boolean");
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

  /** ----------------------
   *  Edge cases
   * ---------------------- */
  test("[Edge cases] 'attachSigil' function explicit evaluation after lazy evaluation", () => {
    const label = generateRandomLabel();

    class A extends Sigil {}
    new A();

    expect(A.SigilLabel).toMatch('@Sigil-auto:');

    expect(() => {
      attachSigil(A, label);
    }).not.toThrow();

    expect(A.SigilLabel).toBe(label);
  });

  test("[Edge cases] 'attachSigil' function append metadate only and can be treated as side-effect", () => {
    const label = generateRandomLabel();
    class A extends Sigil {}
    attachSigil(A, label);

    expect(A.SigilLabel).toBe(label);
  });

  test("[Edge cases] 'AttachSigil' decorator using IIFE static initializer", () => {
    const label = generateRandomLabel();
    let labelInsideIIF: string = '';

    @AttachSigil(label)
    class A extends Sigil {
      static M = (() => {
        labelInsideIIF = A.SigilLabel;
      })();
    }

    expect(A.SigilLabel).toBe(label);
    expect(labelInsideIIF).toBe(label);
  });

  test("[Edge cases] 'attachSigil' function using IIFE static initializer", () => {
    const label = generateRandomLabel();
    let labelInsideIIF: string = '';

    class A extends Sigil {
      static M = (() => {
        labelInsideIIF = A.SigilLabel;
      })();
    }

    attachSigil(A, label);

    expect(A.SigilLabel).toBe(label);
    expect(labelInsideIIF).toMatch('@Sigil-auto:');
  });

  test("[Edge cases] 'AttachSigil' decorator using static block", () => {
    const label = generateRandomLabel();
    let labelInsideBlockA: string = '';
    let labelInsideBlockThis: string = '';

    @AttachSigil(label)
    class A extends Sigil {
      static {
        labelInsideBlockA = A.SigilLabel;
        labelInsideBlockThis = this.SigilLabel;
      }
    }

    expect(A.SigilLabel).toBe(label);
    expect(labelInsideBlockA).toBe(label);
    expect(labelInsideBlockThis).toBe(label);
  });

  test("[Edge cases] 'attachSigil' function using static block", () => {
    const label = generateRandomLabel();
    let labelInsideBlockA: string = '';
    let labelInsideBlockThis: string = '';

    class A extends Sigil {
      static {
        labelInsideBlockA = A.SigilLabel;
        labelInsideBlockThis = this.SigilLabel;
      }
    }

    attachSigil(A, label);

    expect(A.SigilLabel).toBe(label);
    expect(labelInsideBlockA).toMatch('@Sigil-auto:');
    expect(labelInsideBlockThis).toMatch('@Sigil-auto:');
  });

  /** ----------------------
   *  Deprecated
   * ---------------------- */

  test("[Deprecated] 'DEFAULT_LABEL_REGEX'", () => {
    updateSigilOptions({ labelValidation: DEFAULT_LABEL_REGEX });

    const validRegexLabel = '@test/Deprecated.DefaultLabelRegex';
    const randomLabel = generateRandomLabel();

    expect(() => {
      @AttachSigil(validRegexLabel)
      class X extends Sigil {}
    }).not.toThrow();
    expect(() => {
      @AttachSigil(randomLabel)
      class X extends Sigil {}
    }).toThrow(
      `[Sigil Error] Invalid Sigil label '${randomLabel}'. Make sure that supplied label matches validation regex or function`
    );
  });

  test("[Deprecated] 'WithSigil'", () => {
    const label = "@test/[Deprecated] 'WithSigil'";

    @WithSigil(label)
    class User extends Sigil {}

    expect(User).toBeDefined();
    expect(User.SigilLabel).toBe(label);
    expect(User.SigilEffectiveLabel).toBe(label);
    expect(User.SigilLabelLineage).toEqual(['Sigil', label]);
    expect(User.SigilLabelSet).toEqual(new Set(['Sigil', label]));

    const u = new User();
    expect(u).toBeDefined();
    expect(u.getSigilLabel()).toBe(label);
    expect(u.getSigilEffectiveLabel()).toBe(label);
    expect(u.getSigilLabelLineage()).toEqual(['Sigil', label]);
    expect(u.getSigilLabelSet()).toEqual(new Set(['Sigil', label]));
  });

  test("[Deprecated] 'withSigil'", () => {
    const label = "@test/[Deprecated] 'withSigil'";

    class User extends Sigil {}
    withSigil(User, label);

    expect(User).toBeDefined();
    expect(User.SigilLabel).toBe(label);
    expect(User.SigilEffectiveLabel).toBe(label);
    expect(User.SigilLabelLineage).toEqual(['Sigil', label]);
    expect(User.SigilLabelSet).toEqual(new Set(['Sigil', label]));

    const u = new User();
    expect(u).toBeDefined();
    expect(u.getSigilLabel()).toBe(label);
    expect(u.getSigilEffectiveLabel()).toBe(label);
    expect(u.getSigilLabelLineage()).toEqual(['Sigil', label]);
    expect(u.getSigilLabelSet()).toEqual(new Set(['Sigil', label]));
  });
});
