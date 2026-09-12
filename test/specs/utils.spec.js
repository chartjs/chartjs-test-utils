import {describe, expect, it} from 'vitest';

import {acquireChart, createMockContext, releaseChart, triggerMouseEvent} from '../../src/index.js';

function barChart(options, ctx) {
  return acquireChart(
    {
      type: 'bar',
      data: {labels: ['a', 'b'], datasets: [{data: [1, 2]}]}
    },
    options,
    ctx
  );
}

describe('acquireChart', () => {
  it('should build a valid chart of the requested size', () => {
    const chart = barChart({canvas: {height: 128, width: 256}});

    expect(chart).toBeValidChart();
    expect(chart).toBeChartOfSize({dh: 128, dw: 256, rh: 128, rw: 256});
  });

  it('should release the chart and its wrapper', () => {
    const chart = barChart();
    const wrapper = chart.$test.wrapper;

    expect(document.body.contains(wrapper)).toBe(true);
    releaseChart(chart);
    expect(document.body.contains(wrapper)).toBe(false);
  });

  it('should release charts acquired by earlier specs', () => {
    // The charts above were released by the afterEach hook `setup()` registered.
    expect(document.querySelectorAll('.chartjs-wrapper')).toHaveLength(0);
  });
});

describe('unsupported browser features', () => {
  it('should skip the spec when the test context is available', (ctx) => {
    const transferControlToOffscreen = HTMLCanvasElement.prototype.transferControlToOffscreen;
    delete HTMLCanvasElement.prototype.transferControlToOffscreen;

    try {
      barChart({useOffscreenCanvas: true}, ctx);
    } finally {
      HTMLCanvasElement.prototype.transferControlToOffscreen = transferControlToOffscreen;
    }

    throw new Error('acquireChart should have skipped this spec');
  });

  it('should explain how to skip when no test context was passed', () => {
    const attachShadow = Element.prototype.attachShadow;
    delete Element.prototype.attachShadow;

    try {
      expect(() => barChart({useShadowDOM: true})).toThrow(/does not support the shadow DOM/);
    } finally {
      Element.prototype.attachShadow = attachShadow;
    }
  });
});

describe('triggerMouseEvent', () => {
  it('should resolve once the chart has handled the event', async () => {
    const chart = barChart();
    const element = chart.getDatasetMeta(0).data[0];

    const event = await triggerMouseEvent(chart, 'mousemove', element);

    expect(event.type).toBe('mousemove');
    expect(chart.getActiveElements().length).toBeGreaterThan(0);
  });
});

describe('matchers', () => {
  it('toBeCloseToPixel should accept sub-pixel differences', () => {
    expect(100.4).toBeCloseToPixel(100);
    expect(100).not.toBeCloseToPixel(140);
  });

  it('toBeCloseToPoint should round to two decimals', () => {
    expect({x: 1.001, y: 2.002}).toBeCloseToPoint({x: 1, y: 2});
    expect({x: 1.1, y: 2}).not.toBeCloseToPoint({x: 1, y: 2});
  });

  it('toEqualOneOf should match any of the expected values', () => {
    expect('b').toEqualOneOf(['a', 'b']);
    expect('c').not.toEqualOneOf(['a', 'b']);
  });

  it('toEqualOptions should ignore private properties', () => {
    expect({_private: true, a: 1, sub: {b: 2}}).toEqualOptions({a: 1, sub: {b: 2}});
    expect({a: 1}).not.toEqualOptions({a: 2});
  });

  it('toEqualImageData should reject a non image source', () => {
    expect(createMockContext()).not.toEqualImageData(undefined);
  });
});
