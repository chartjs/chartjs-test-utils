import Context from './context';
import matchers from './matchers';
import {_acquireChart, _releaseChart, injectCSS} from './utils';

export * from './fixture';
export {afterEvent, waitForResize, triggerMouseEvent} from './utils';

// Keep track of all acquired charts to automatically release them after each specs
var charts = {};

/**
 * Injects a new canvas (and div wrapper) and creates the associated Chart instance
 * using the given config. Additional options allow tweaking elements generation.
 * @param {object} [config] - Chart config.
 * @param {object} [options] - Chart acquisition options.
 * @param {object} [options.canvas] - Canvas attributes.
 * @param {object} [options.wrapper] - Canvas wrapper attributes.
 * @param {boolean} [options.useOffscreenCanvas] - use an OffscreenCanvas instead of the normal HTMLCanvasElement.
 * @param {boolean} [options.useShadowDOM] - use shadowDom
 * @param {boolean} [options.persistent] - If true, the chart will not be released after the spec.
 */
export function acquireChart(config, options) {
  var chart = _acquireChart(config, options);
  charts[chart.id] = chart;
  return chart;
}

export function releaseChart(chart) {
  _releaseChart(chart);
  delete charts[chart.id];
}

export function createMockContext() {
  return new Context();
}

export function injectWrapperCSS() {
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

export function addMatchers() {
  jasmine.addMatchers(matchers);
}

export function releaseCharts() {
  Object.keys(charts).forEach(function(id) {
    var chart = charts[id];
    if (!(chart.$test || {}).persistent) {
      _releaseChart(chart);
    }
  });
}
