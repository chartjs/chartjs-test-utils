/**
 * Chart acquisition and event helpers.
 *
 * `Chart` is injected through `setup()` rather than read from a global: Karma
 * loaded the UMD bundle into `window`, a bundler does not.
 */
import {spritingOff, spritingOn} from './spriting.js';

/**
 * The chart.js types are used type-only: the constructor itself is injected
 * through `setup({Chart})`, so chart.js is not a runtime dependency here. A
 * consumer of this package always has chart.js -- that is what it is for.
 * @typedef {import('chart.js').Chart} ChartInstance
 * @typedef {typeof import('chart.js').Chart} ChartConstructor
 * @typedef {object} AcquireOptions
 * @property {object} [canvas] - Canvas attributes.
 * @property {object} [wrapper] - Canvas wrapper attributes.
 * @property {boolean} [useOffscreenCanvas] - use an OffscreenCanvas instead of the normal HTMLCanvasElement.
 * @property {boolean} [useShadowDOM] - use shadowDom.
 * @property {boolean} [spriteText] - draw text from a bitmap sprite sheet.
 * @property {boolean} [persistent] - If true, the chart will not be released after the spec.
 * @typedef {{skip: (reason?: string) => void}} TestContext
 */

// Every chart acquired by a spec, so they can all be released afterwards.
const charts = {};

let Chart;

/**
 * Registers the Chart.js constructor used to build charts. Called by `setup()`.
 * @param {ChartConstructor} chartConstructor - the `Chart` export of chart.js
 */
export function useChart(chartConstructor) {
  Chart = chartConstructor;
}

/** @returns {ChartConstructor} the registered Chart.js constructor */
export function getChart() {
  return Chart;
}

/**
 * Skips the running spec, or throws when no test context was given.
 * Jasmine had a global `pending()`; in Vitest skipping is a method on the test
 * context, so a helper can only skip when the spec passes its context in.
 */
function skip(ctx, reason) {
  if (ctx && typeof ctx.skip === 'function') {
    return ctx.skip(reason);
  }
  throw new Error(
    `${reason}. Pass the test context to acquireChart to skip instead: it('...', (ctx) => acquireChart(config, options, ctx))`
  );
}

function applyAttributes(node, attributes) {
  for (const key of Object.keys(attributes)) {
    node.setAttribute(key, attributes[key]);
  }
}

/**
 * Skips the spec when the browser lacks a feature the options ask for. Checked
 * before anything is added to the document, so an aborted spec leaves no
 * wrapper behind.
 */
function checkSupport(options, ctx) {
  if (options.useShadowDOM && !Element.prototype.attachShadow) {
    skip(ctx, 'This browser does not support the shadow DOM');
  }
  if (options.useOffscreenCanvas && !HTMLCanvasElement.prototype.transferControlToOffscreen) {
    skip(ctx, 'This browser does not support OffscreenCanvas');
  }
}

function acquireContext(canvas, options) {
  return options.useOffscreenCanvas ? canvas.transferControlToOffscreen().getContext('2d') : canvas.getContext('2d');
}

/**
 * Injects a new canvas (and div wrapper) and creates the associated Chart instance
 * using the given config. Additional options allow tweaking elements generation.
 * @param {object} [config] - Chart config.
 * @param {AcquireOptions} [options] - Chart acquisition options.
 * @param {TestContext} [ctx] - Vitest test context, required by options that may be unsupported.
 * @returns {ChartInstance} the chart
 */
export function buildChart(config = {}, options = {}, ctx) {
  if (!Chart) {
    throw new Error('No Chart.js constructor registered. Call setup({Chart}) from your setup file.');
  }

  checkSupport(options, ctx);

  const wrapper = document.createElement('div');
  const canvas = document.createElement('canvas');

  applyAttributes(canvas, options.canvas || {height: 512, width: 512});
  applyAttributes(wrapper, options.wrapper || {class: 'chartjs-wrapper'});

  // by default, remove chart animation and auto resize
  config.options = config.options || {};
  config.options.animation = config.options.animation === undefined ? false : config.options.animation;
  config.options.responsive = config.options.responsive === undefined ? false : config.options.responsive;
  config.options.locale = config.options.locale || 'en-US';

  if (options.useShadowDOM) {
    wrapper.attachShadow({mode: 'open'}).appendChild(canvas);
  } else {
    wrapper.appendChild(canvas);
  }
  document.body.appendChild(wrapper);

  let chart;
  try {
    const context = acquireContext(canvas, options);
    if (options.spriteText) {
      spritingOn(context);
    }
    chart = new Chart(context, config);
  } catch (e) {
    document.body.removeChild(wrapper);
    throw e;
  }

  chart.$test = {persistent: options.persistent, wrapper};
  return chart;
}

/** @param {ChartInstance} chart */
export function destroyChart(chart) {
  spritingOff(chart.ctx);
  chart.destroy();

  const wrapper = chart.$test?.wrapper;
  wrapper?.parentNode?.removeChild(wrapper);
}

/**
 * Builds a chart and registers it for release after the spec.
 * @param {object} [config] - Chart config.
 * @param {AcquireOptions} [options] - Chart acquisition options.
 * @param {TestContext} [ctx] - Vitest test context, required by options that may be unsupported.
 * @returns {ChartInstance} the chart
 */
export function acquireChart(config, options, ctx) {
  const chart = buildChart(config, options, ctx);
  charts[chart.id] = chart;
  return chart;
}

/**
 * Destroys a chart and removes it from the registry.
 * @param {ChartInstance} chart
 */
export function releaseChart(chart) {
  destroyChart(chart);
  delete charts[chart.id];
}

/** Releases every chart acquired since the last call, except persistent ones. */
export function releaseCharts() {
  for (const id of Object.keys(charts)) {
    const chart = charts[id];
    if (!chart.$test?.persistent) {
      destroyChart(chart);
      delete charts[id];
    }
  }
}

/**
 * Runs `callback` once the chart has handled an event of the given type.
 * @param {ChartInstance} chart
 * @param {string} type - event type, e.g. `mousemove`
 * @param {() => void} callback
 */
export function afterEvent(chart, type, callback) {
  const override = chart._eventHandler;
  chart._eventHandler = function (event) {
    override.call(this, event);
    if (event.type === type || (event.native && event.native.type === type)) {
      chart._eventHandler = override;
      callback();
    }
  };
}

/**
 * Runs `callback` after the chart's next resize.
 * @param {ChartInstance} chart
 * @param {() => void} callback
 */
export function waitForResize(chart, callback) {
  const override = chart.resize;
  chart.resize = function (...args) {
    chart.resize = override;
    override.apply(this, args);
    callback();
  };
}

function resolveElementPoint(el) {
  if (el) {
    if (typeof el.getCenterPoint === 'function') {
      return el.getCenterPoint();
    }
    if (el.x !== undefined && el.y !== undefined) {
      return el;
    }
  }
  return {x: 0, y: 0};
}

/**
 * Dispatches a mouse event at an element's position and awaits its handling.
 * @param {ChartInstance} chart
 * @param {string} type - event type, e.g. `mousemove`
 * @param {{x?: number, y?: number, getCenterPoint?: () => {x: number, y: number}}} [el]
 *   element to aim at; the chart's origin when omitted
 * @returns {Promise<MouseEvent>} the dispatched event
 */
export async function triggerMouseEvent(chart, type, el) {
  const node = chart.canvas;
  const rect = node.getBoundingClientRect();
  const point = resolveElementPoint(el);
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + point.x,
    clientY: rect.top + point.y,
    view: window
  });

  const handled = new Promise((resolve) => afterEvent(chart, type, resolve));
  node.dispatchEvent(event);
  await handled;

  return event;
}
