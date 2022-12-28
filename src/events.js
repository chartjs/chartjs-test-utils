export function waitForResize(chart, callback) {
  const override = chart.resize;
  chart.resize = function() {
    chart.resize = override;
    override.apply(this, arguments);
    callback();
  };
}

export function afterEvent(chart, type, callback) {
  const override = chart._eventHandler;
  chart._eventHandler = function(event) {
    override.call(this, event);
    if (event.type === type || (event.native && event.native.type === type)) {
      chart._eventHandler = override;
      // eslint-disable-next-line callback-return
      callback();
    }
  };
}

function _resolveElementPoint(el) {
  let point = {x: 0, y: 0};
  if (el) {
    if (typeof el.getCenterPoint === 'function') {
      point = el.getCenterPoint();
    } else if (el.x !== undefined && el.y !== undefined) {
      point = el;
    }
  }
  return point;
}

export async function triggerMouseEvent(chart, type, el) {
  const node = chart.canvas;
  const rect = node.getBoundingClientRect();
  const point = _resolveElementPoint(el);
  const event = new MouseEvent(type, {
    clientX: rect.left + point.x,
    clientY: rect.top + point.y,
    cancelable: true,
    bubbles: true,
    view: window
  });

  const promise = new Promise((resolve) => {
    afterEvent(chart, type, resolve);
  });

  node.dispatchEvent(event);

  await promise;

  return event;
}
