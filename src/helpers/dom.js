export function createCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

export function createWrapperAndCanvas(config, options) {
  const wrapper = document.createElement('div');
  const canvas = document.createElement('canvas');

  for (const key in options.canvas) {
    if (Object.prototype.hasOwnProperty.call(options.canvas, key)) {
      canvas.setAttribute(key, options.canvas[key]);
    }
  }

  for (const key in options.wrapper) {
    if (Object.prototype.hasOwnProperty.call(options.wrapper, key)) {
      wrapper.setAttribute(key, options.wrapper[key]);
    }
  }

  if (options.useShadowDOM) {
    if (!wrapper.attachShadow) {
      // If shadowDOM is not supported by the browsers, mark test as 'pending'.
      return pending();
    }
    wrapper.attachShadow({mode: 'open'}).appendChild(canvas);
  } else {
    wrapper.appendChild(canvas);
  }
  window.document.body.appendChild(wrapper);

  return {wrapper, canvas};
}

export function injectCSS(css) {
  // https://stackoverflow.com/q/3922139
  const head = document.getElementsByTagName('head')[0];
  const style = document.createElement('style');
  style.setAttribute('type', 'text/css');
  style.appendChild(document.createTextNode(css));
  head.appendChild(style);
}
