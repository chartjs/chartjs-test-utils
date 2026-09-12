import assert from 'node:assert';
import {readFileSync} from 'node:fs';
import {describe, it} from 'vitest';

import {mockContextMethods} from '../../src/context.js';
import {createMockContext} from '../../src/index.js';

/** The names in one `type X = 'a' | 'b';` union in the published type entry. */
function declaredNames(unionName) {
  const entry = readFileSync(new URL('../../types/entry.d.ts', import.meta.url), 'utf8');
  const union = entry.match(new RegExp(`type ${unionName} =([^;]*);`));
  assert.ok(union, `${unionName} is not declared in types/entry.d.ts`);
  return union[1]
    .match(/'([^']+)'/g)
    .map((name) => name.slice(1, -1))
    .sort();
}

describe('createMockContext', () => {
  // The mock assigns its methods in a loop, so a declaration emit cannot see
  // them and types/entry.d.ts spells them out by hand. These two specs are
  // what keeps that list honest.
  it('should record every method the published types declare', () => {
    assert.deepStrictEqual(declaredNames('RecordedMethod'), Object.keys(mockContextMethods).sort());
  });

  it('should record every property the published types declare', () => {
    const ctx = createMockContext();
    const accessors = Object.getOwnPropertyNames(ctx)
      .filter((name) => !name.startsWith('_'))
      .filter((name) => typeof Object.getOwnPropertyDescriptor(ctx, name).get === 'function')
      .sort();

    assert.deepStrictEqual(declaredNames('RecordedProperty'), accessors);
  });

  it('should record calls and property assignments', () => {
    const ctx = createMockContext();

    ctx.fillStyle = 'red';
    ctx.fillRect(1, 2, 3, 4);

    assert.deepStrictEqual(ctx.getCalls(), [
      {name: 'setFillStyle', args: ['red']},
      {name: 'fillRect', args: [1, 2, 3, 4]}
    ]);
    assert.strictEqual(ctx.fillStyle, 'red');
  });

  it('should measure text with a fixed width', () => {
    const ctx = createMockContext();

    assert.strictEqual(ctx.measureText('abc').width, 30);
    assert.strictEqual(ctx.measureText('').width, 0);

    ctx.resetCalls();
    assert.deepStrictEqual(ctx.getCalls(), []);
  });
});
