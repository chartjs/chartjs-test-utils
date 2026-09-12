import assert from 'node:assert';
import {describe, it} from 'vitest';

import {createMockContext} from '../../src/index.js';

describe('createMockContext', function() {
  it('should record calls and property assignments', function() {
    const ctx = createMockContext();

    ctx.fillStyle = 'red';
    ctx.fillRect(1, 2, 3, 4);

    assert.deepStrictEqual(ctx.getCalls(), [
      {name: 'setFillStyle', args: ['red']},
      {name: 'fillRect', args: [1, 2, 3, 4]}
    ]);
    assert.strictEqual(ctx.fillStyle, 'red');
  });

  it('should measure text with a fixed width', function() {
    const ctx = createMockContext();

    assert.strictEqual(ctx.measureText('abc').width, 30);
    assert.strictEqual(ctx.measureText('').width, 0);

    ctx.resetCalls();
    assert.deepStrictEqual(ctx.getCalls(), []);
  });
});
