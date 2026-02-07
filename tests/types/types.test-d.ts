import { expectAssignable } from 'tsd';
import { GetInstance, Sigil, withSigilTyped } from '../../src';

// Class X extends Sigil
class _X extends Sigil {}
const X = withSigilTyped(_X, 'X');
type X = GetInstance<typeof X>;

// Class Y extends class X
class _Y extends X {}
const Y = withSigilTyped(_Y, 'Y');
type Y = GetInstance<typeof Y>;

// Class Z extends Sigil
class _Z extends Sigil {}
const Z = withSigilTyped(_Z, 'Z');
type Z = GetInstance<typeof Z>;

// 1. Y extends X (True)
// Y should be assignable to X
expectAssignable<X>(new Y());

// 2. X extends Y (False)
// This should trigger a type error because X is the base and Y is the subtype
// @ts-expect-error
expectAssignable<Y>(new X());

// 3. X extends Z (False)
// Separate branches of Sigil should not be compatible
// @ts-expect-error
expectAssignable<Z>(new X());

// 4. Y extends Z (False)
// Separate branches of Sigil should not be compatible
// @ts-expect-error
expectAssignable<Z>(new Y());
