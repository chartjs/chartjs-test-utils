/**
 * The Vitest matchers.
 *
 * Jasmine's `addMatchers` took factories returning a `compare` method; Vitest's
 * `expect.extend` takes the comparison itself and wants a lazy `message`.
 */
import pixelmatch from 'pixelmatch';
import {canvasFromImageData, createImageData} from './canvas.js';
import {getChart} from './chart.js';
import {compareOptions} from './matchers.options.js';

const DEFAULT_THRESHOLD = 0.1;
const DEFAULT_TOLERANCE = 0.001;

function toPercent(value) {
  return Math.round(value * 10000) / 100;
}

function resolveContext(actual) {
  if (actual instanceof CanvasRenderingContext2D) {
    return actual;
  }
  if (actual instanceof HTMLCanvasElement) {
    return actual.getContext('2d');
  }
  // A Chart instance. `instanceof Chart` only works when the consumer and the
  // chart under test resolve to the same chart.js copy, the canvas check does
  // not care.
  return actual?.ctx instanceof CanvasRenderingContext2D ? actual.ctx : null;
}

/**
 * Logs the actual, expected and diff images to the browser console, where they
 * can be inspected in the Vitest UI. Replaces the DOM preview Karma appended to
 * its reporter.
 */
function logPreview(description, images) {
  const urls = images.map(({data}) => canvasFromImageData(data).toDataURL());
  // The preview is the point of this function: Karma appended it to its
  // reporter, a browser test has the console instead.
  // biome-ignore lint/suspicious/noConsole: the preview is what this function is for
  console.log(
    `%c ${description}\n${images.map(({label}) => label).join(' | ')}\n%c %c %c `,
    'font: 12px monospace',
    ...urls.map((url) => `padding: 128px 128px; background: url(${url}) no-repeat center/contain`)
  );
}

export function toBeCloseToPixel(actual, expected) {
  let pass = false;

  if (!isNaN(actual) && !isNaN(expected)) {
    const diff = Math.abs(actual - expected);
    const A = Math.abs(actual);
    const B = Math.abs(expected);
    const percentDiff = 0.005; // 0.5% diff
    pass = diff <= (A > B ? A : B) * percentDiff || diff < 2; // 2 pixels is fine
  }

  return {
    message: () => `Expected ${actual} to be close to pixel ${expected}`,
    pass
  };
}

export function toBeCloseToPoint(actual, expected) {
  const rnd = (v) => Math.round(v * 100) / 100;
  return {
    message: () => `Expected ${JSON.stringify(actual)} to be close to point ${JSON.stringify(expected)}`,
    pass: rnd(actual.x) === rnd(expected.x) && rnd(actual.y) === rnd(expected.y)
  };
}

export function toEqualOneOf(actual, expecteds) {
  return {
    message: () => `Expected ${actual} to be one of ${JSON.stringify(expecteds)}`,
    pass: expecteds.indexOf(actual) !== -1
  };
}

export function toBeValidChart(actual) {
  const Chart = getChart();
  let message = null;

  if (Chart && !(actual instanceof Chart)) {
    message = `Expected ${actual} to be an instance of Chart`;
  } else if (Object.prototype.toString.call(actual.canvas) !== '[object HTMLCanvasElement]') {
    message = 'Expected canvas to be an instance of HTMLCanvasElement';
  } else if (Object.prototype.toString.call(actual.ctx) !== '[object CanvasRenderingContext2D]') {
    message = 'Expected context to be an instance of CanvasRenderingContext2D';
  } else if (typeof actual.height !== 'number' || !isFinite(actual.height)) {
    message = 'Expected height to be a strict finite number';
  } else if (typeof actual.width !== 'number' || !isFinite(actual.width)) {
    message = 'Expected width to be a strict finite number';
  }

  return {
    message: () => message || `Expected ${actual} to be valid chart`,
    pass: !message
  };
}

export function toBeChartOfSize(actual, expected) {
  const valid = toBeValidChart(actual);
  if (!valid.pass) {
    return valid;
  }

  let message = null;
  const canvas = actual.ctx.canvas;
  const style = getComputedStyle(canvas);
  const pixelRatio = actual.options.devicePixelRatio || window.devicePixelRatio;
  const dh = parseInt(style.height, 10) || 0;
  const dw = parseInt(style.width, 10) || 0;
  const rh = canvas.height;
  const rw = canvas.width;
  const orh = rh / pixelRatio;
  const orw = rw / pixelRatio;

  // sanity checks
  if (actual.height !== orh) {
    message = `Expected chart height ${actual.height} to be equal to original render height ${orh}`;
  } else if (actual.width !== orw) {
    message = `Expected chart width ${actual.width} to be equal to original render width ${orw}`;
  }

  // validity checks
  if (dh !== expected.dh) {
    message = `Expected display height ${dh} to be equal to ${expected.dh}`;
  } else if (dw !== expected.dw) {
    message = `Expected display width ${dw} to be equal to ${expected.dw}`;
  } else if (rh !== expected.rh) {
    message = `Expected render height ${rh} to be equal to ${expected.rh}`;
  } else if (rw !== expected.rw) {
    message = `Expected render width ${rw} to be equal to ${expected.rw}`;
  }

  return {
    message: () => message || `Expected ${actual} to be a chart of size ${JSON.stringify(expected)}`,
    pass: !message
  };
}

/**
 * Compares a rendered canvas against a reference image.
 * @param {object} actual - a Chart, a canvas or a 2d context
 * @param {ImageData} expected - the reference image data
 * @param {object} [opts] - comparison options
 * @param {number} [opts.threshold] - per pixel color distance, see pixelmatch
 * @param {number} [opts.tolerance] - accepted ratio of differing pixels
 * @param {boolean} [opts.checkerboard] - blend transparency against a checkerboard instead of white
 * @param {boolean} [opts.debug] - always fail and log the preview
 * @param {string} [opts.description] - label for the logged preview
 */
export function toEqualImageData(actual, expected, opts = {}) {
  const ctx = resolveContext(actual);
  if (!ctx) {
    return {message: () => 'Input value is not a valid image source.', pass: false};
  }
  if (!expected) {
    return {message: () => 'Missing reference image.', pass: false};
  }

  const threshold = opts.threshold === undefined ? DEFAULT_THRESHOLD : opts.threshold;
  const tolerance = opts.tolerance === undefined ? DEFAULT_TOLERANCE : opts.tolerance;
  // pixelmatch 7.2.0 added a `checkerboard` option and defaulted it to true,
  // changing how semi-transparent pixels are compared. Every reference image
  // captured with pixelmatch 5 -- which is every image this package has ever
  // compared -- was blended against plain white. Checkerboard blending is a
  // different measurement rather than a stricter one: each goes blind where the
  // ink color meets the background it is blended against. Default to white, and
  // let a fixture opt into the checkerboard once its reference image has been
  // re-validated against it.
  const checkerboard = opts.checkerboard === true;
  const {height, width} = expected;
  const actualWidth = ctx.canvas.width;
  const actualHeight = ctx.canvas.height;

  const actualData = ctx.getImageData(0, 0, actualWidth, actualHeight);
  const diffData = createImageData(width, height);
  const count =
    actualWidth === width && actualHeight === height
      ? pixelmatch(actualData.data, expected.data, diffData.data, width, height, {checkerboard, threshold})
      : Math.abs(actualWidth * actualHeight - width * height);
  const ratio = count / (width * height);
  const pass = ratio <= tolerance && !opts.debug;

  if (!pass) {
    logPreview(opts.description || 'fixture', [
      {data: actualData, label: 'actual'},
      {data: expected, label: 'expected'},
      {data: diffData, label: 'diff'}
    ]);
  }

  return {
    message: () =>
      'Expected the rendered canvas to match the reference image.\n' +
      `  Size: ${actualWidth}x${actualHeight}, expected ${width}x${height}\n` +
      `  Difference: ${count}px / ${toPercent(ratio)}%\n` +
      `  Threshold: ${toPercent(threshold)}%, tolerance: ${toPercent(tolerance)}%`,
    pass
  };
}

export function toEqualOptions(actual, expected) {
  const result = compareOptions(actual, expected);
  return {
    message: () => result.message || 'Expected options to differ',
    pass: result.pass
  };
}

export const matchers = {
  toBeChartOfSize,
  toBeCloseToPixel,
  toBeCloseToPoint,
  toBeValidChart,
  toEqualImageData,
  toEqualOneOf,
  toEqualOptions
};

export default matchers;
