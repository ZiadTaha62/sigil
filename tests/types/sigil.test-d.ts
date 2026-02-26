import { expectAssignable } from 'tsd';
import { Sigil, type sigil, type ExtendSigil } from '../../src';

// Class X extends Sigil
class X extends Sigil {
  declare [sigil]: ExtendSigil<'X', Sigil>;
}

// Class Y extends class X
class Y extends X {
  declare [sigil]: ExtendSigil<'Y', X>;
}

// Class Z extends Sigil
class Z extends Sigil {
  declare [sigil]: ExtendSigil<'Z', Sigil>;
}

// 1. Y extends X (True)
// Y should be assignable to X
expectAssignable<X>(new Y());

// 2. X extends Y (False)
// @ts-expect-error - This should trigger a type error because X is the base and Y is the subtype
expectAssignable<Y>(new X());

// 3. X extends Z (False)
// @ts-expect-error - Separate branches of Sigil should not be compatible
expectAssignable<Z>(new X());

// 4. Y extends Z (False)
// @ts-expect-error - Separate branches of Sigil should not be compatible
expectAssignable<Z>(new Y());
