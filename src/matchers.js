import pixelmatch from 'pixelmatch';
import {createCanvas, getCtx} from './utils';
import {toEqualOptions} from './matchers.options';

function toPercent(value) {
  return Math.round(value * 10000) / 100;
}

function createImageData(w, h) {
  const canvas = createCanvas(w, h);
  const context = canvas.getContext('2d');
  return context.getImageData(0, 0, w, h);
}

function canvasFromImageData(data) {
  const canvas = createCanvas(data.width, data.height);
  const context = canvas.getContext('2d');
  context.putImageData(data, 0, 0);
  return canvas;
}

function buildPixelMatchPreview(actual, expected, diff, threshold, tolerance, count, description) {
  const ratio = count / (actual.width * actual.height);
  const wrapper = document.createElement('div');
  wrapper.appendChild(document.createTextNode(description));

  wrapper.style.cssText = 'display: flex; overflow-y: auto';

  [
    {data: actual, label: 'Actual'},
    {data: expected, label: 'Expected'},
    {data: diff, label:
			'diff: ' + count + 'px ' +
			'(' + toPercent(ratio) + '%)<br/>' +
			'thr: ' + toPercent(threshold) + '%, ' +
			'tol: ' + toPercent(tolerance) + '%'
    }
  ].forEach(function(values) {
    const item = document.createElement('div');
    item.style.cssText = 'text-align: center; font: 12px monospace; line-height: 1.4; margin: 8px';
    item.innerHTML = '<div style="margin: 8px; height: 32px">' + values.label + '</div>';
    const canvas = canvasFromImageData(values.data);
    canvas.style.cssText = 'border: 1px dashed red';
    item.appendChild(canvas);
    wrapper.appendChild(item);
  });

  wrapper.toString = () => `Fixture test failed:
  Difference: ${count}px / ${toPercent(ratio)}%
  Threshold: ${toPercent(threshold)}%
  Tolerance: ${toPercent(tolerance)}%`;

  return wrapper;
}

function toBeCloseToPixel() {
  return {
    compare: function(actual, expected) {
      let result = false;

      if (!isNaN(actual) && !isNaN(expected)) {
        const diff = Math.abs(actual - expected);
        const A = Math.abs(actual);
        const B = Math.abs(expected);
        const percentDiff = 0.005; // 0.5% diff
        result = (diff <= (A > B ? A : B) * percentDiff) || diff < 2; // 2 pixels is fine
      }

      return {pass: result};
    }
  };
}

function toBeCloseToPoint() {
  function rnd(v) {
    return Math.round(v * 100) / 100;
  }
  return {
    compare: function(actual, expected) {
      return {
        pass: rnd(actual.x) === rnd(expected.x) && rnd(actual.y) === rnd(expected.y)
      };
    }
  };
}

function toEqualOneOf() {
  return {
    compare: function(actual, expecteds) {
      let result = false;
      for (let i = 0, l = expecteds.length; i < l; i++) {
        if (actual === expecteds[i]) {
          result = true;
          break;
        }
      }
      return {
        pass: result
      };
    }
  };
}

function toBeValidChart() {
  return {
    compare: function(actual) {
      let message = null;

      if (!(actual instanceof Chart)) {
        message = 'Expected ' + actual + ' to be an instance of Chart';
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
        message: message ? message : 'Expected ' + actual + ' to be valid chart',
        pass: !message
      };
    }
  };
}

function toBeChartOfSize() {
  return {
    compare: function(actual, expected) {
      const res = toBeValidChart().compare(actual);
      if (!res.pass) {
        return res;
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
        message = 'Expected chart height ' + actual.height + ' to be equal to original render height ' + orh;
      } else if (actual.width !== orw) {
        message = 'Expected chart width ' + actual.width + ' to be equal to original render width ' + orw;
      }

      // validity checks
      if (dh !== expected.dh) {
        message = 'Expected display height ' + dh + ' to be equal to ' + expected.dh;
      } else if (dw !== expected.dw) {
        message = 'Expected display width ' + dw + ' to be equal to ' + expected.dw;
      } else if (rh !== expected.rh) {
        message = 'Expected render height ' + rh + ' to be equal to ' + expected.rh;
      } else if (rw !== expected.rw) {
        message = 'Expected render width ' + rw + ' to be equal to ' + expected.rw;
      }

      return {
        message: message ? message : 'Expected ' + actual + ' to be a chart of size ' + expected,
        pass: !message
      };
    }
  };
}

function toEqualImageData() {
  return {
    compare: function(actual, expected, opts) {
      const ctx = getCtx(actual);
      const {debug = false, tolerance = 0.001, threshold = 0.1} = opts;
      let message = null;
      let count;

      if (ctx) {
        const {height: h, width: w} = expected;
        const {canvas: {width: aw, height: ah}} = ctx;
        const idata = ctx.getImageData(0, 0, aw, ah);
        const ddata = createImageData(w, h);

        if (aw === w && ah === h) {
          count = pixelmatch(idata.data, expected.data, ddata.data, w, h, {threshold: threshold});
        } else {
          count = Math.abs(aw * ah - w * h);
        }
        const ratio = count / (w * h);

        if ((ratio > tolerance) || debug) {
          message = buildPixelMatchPreview(idata, expected, ddata, threshold, tolerance, count, opts.description);
        }
      } else {
        message = 'Input value is not a valid image source.';
      }

      return {
        message: message,
        pass: !message
      };
    }
  };
}

export default {
  toBeCloseToPixel,
  toBeCloseToPoint,
  toEqualOneOf,
  toBeValidChart,
  toBeChartOfSize,
  toEqualImageData,
  toEqualOptions
};
