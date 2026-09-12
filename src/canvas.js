/**
 * Canvas and image helpers.
 *
 * The Karma file server is gone, so reference PNGs arrive as bundler asset
 * URLs instead of `/base/test/...` paths, and reading one resolves a promise
 * instead of taking a callback.
 */

export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.height = height;
  canvas.width = width;
  return canvas;
}

export function createImageData(width, height) {
  return createCanvas(width, height).getContext('2d').getImageData(0, 0, width, height);
}

export function canvasFromImageData(data) {
  const canvas = createCanvas(data.width, data.height);
  canvas.getContext('2d').putImageData(data, 0, 0);
  return canvas;
}

/**
 * Decodes a PNG into ImageData.
 * @param {string} url - image url, usually produced by the bundler
 * @returns {Promise<ImageData>}
 */
export function readImageData(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error(`Failed to load image ${url}`));
    image.onload = () => {
      const {height, width} = image;
      const ctx = createCanvas(width, height).getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    image.src = url;
  });
}

export function injectCSS(css) {
  // https://stackoverflow.com/q/3922139
  const style = document.createElement('style');
  style.setAttribute('type', 'text/css');
  style.appendChild(document.createTextNode(css));
  document.getElementsByTagName('head')[0].appendChild(style);
}
