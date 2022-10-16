import {applyDefaultChartConfig, applyDefaultFixtureOptions} from './defaults';
import {createWrapperAndCanvas} from './dom';
import {spritingOn, spritingOff} from './spriting';

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
export function _acquireChart(config = {}, options = {}) {
  applyDefaultChartConfig(config);
  applyDefaultFixtureOptions(options);

  const {wrapper, canvas} = createWrapperAndCanvas(config, options);
  let chart;

  try {
    let ctx;
    if (options.useOffscreenCanvas) {
      if (!canvas.transferControlToOffscreen) {
        // If this browser does not support offscreen canvas, mark the test as 'pending', which will skip the
        // test.
        // TODO: switch to skip() once it's implemented (https://github.com/jasmine/jasmine/issues/1709), or
        // remove if all browsers implement `transferControlToOffscreen`
        return pending();
      }
      const offscreenCanvas = canvas.transferControlToOffscreen();
      ctx = offscreenCanvas.getContext('2d');
    } else {
      ctx = canvas.getContext('2d');
    }
    if (options.spriteText) {
      spritingOn(ctx);
    }
    chart = new Chart(ctx, config);
  } catch (e) {
    window.document.body.removeChild(wrapper);
    throw e;
  }

  chart.$test = {
    persistent: options.persistent,
    wrapper: wrapper
  };

  return chart;
}

export function _releaseChart(chart) {
  spritingOff(chart.ctx);
  chart.destroy();

  const wrapper = (chart.$test || {}).wrapper;
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.removeChild(wrapper);
  }
}

export function getCtx(chart) {
  let ctx;
  if (chart instanceof Chart) {
    ctx = chart.ctx;
  } else if (chart instanceof HTMLCanvasElement) {
    ctx = chart.getContext('2d');
  } else if (chart instanceof CanvasRenderingContext2D) {
    ctx = chart;
  }
  return ctx;
}
