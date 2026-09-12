import {expect, afterEach} from 'vitest';
import Context from './context.js';
import {injectCSS} from './canvas.js';
import {matchers} from './matchers.js';
import {releaseCharts, useChart} from './chart.js';

export {createCanvas, createImageData, canvasFromImageData, readImageData, injectCSS} from './canvas.js';
export {
  acquireChart,
  afterEvent,
  buildChart,
  destroyChart,
  releaseChart,
  releaseCharts,
  triggerMouseEvent,
  waitForResize
} from './chart.js';
export {createFixtures} from './fixtures.js';
export {
  matchers,
  toBeChartOfSize,
  toBeCloseToPixel,
  toBeCloseToPoint,
  toBeValidChart,
  toEqualImageData,
  toEqualOneOf,
  toEqualOptions
} from './matchers.js';
export {compareOptions} from './matchers.options.js';
export {spritingOff, spritingOn} from './spriting.js';
export {Context};

export function createMockContext() {
  return new Context();
}

function injectWrapperCSS() {
  // some style initialization to limit differences between browsers across different platforms.
  injectCSS(
    '.chartjs-wrapper, .chartjs-wrapper canvas {' +
    'border: 0;' +
    'margin: 0;' +
    'padding: 0;' +
    '}' +
    '.chartjs-wrapper {' +
    'position: absolute' +
    '}');
}

/**
 * Registers the matchers, the per-spec chart cleanup and the rendering defaults
 * the reference images were captured with. Call it once, from a setup file.
 *
 * @param {object} options
 * @param {Function} options.Chart - the `Chart` export of chart.js. Injected
 *   rather than read from a global: Karma loaded the UMD bundle into `window`,
 *   a bundler does not.
 * @param {number} [options.devicePixelRatio] - pinned to 1 by default, so the
 *   backing store matches the reference images whatever the display reports.
 * @param {boolean} [options.wrapperCSS] - inject the chart wrapper stylesheet.
 *
 * @example
 * import {Chart, registerables} from 'chart.js';
 * import {setup} from 'chartjs-test-utils';
 *
 * Chart.register(...registerables);
 * setup({Chart});
 */
export function setup({Chart, devicePixelRatio = 1, wrapperCSS = true} = {}) {
  if (!Chart) {
    throw new Error('setup() requires the Chart.js constructor: setup({Chart})');
  }

  useChart(Chart);
  Chart.defaults.devicePixelRatio = devicePixelRatio;

  if (wrapperCSS) {
    injectWrapperCSS();
  }

  expect.extend(matchers);

  afterEach(() => {
    releaseCharts();
  });
}
