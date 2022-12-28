import {createCanvas} from './dom';

function readFile(url, callback) {
  const request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (request.readyState === 4) {
      return callback(request.responseText);
    }
  };

  request.open('GET', url, false);
  request.send(null);
}

function createJsConfig(content) {
  return new Function(`
"use strict";
var module = {};
${content};
return module.exports || fixture;`
  )();
}

export function loadConfig(url, callback) {
  const parser = url.endsWith('.js') ? createJsConfig : JSON.parse;

  readFile(url, (content) => callback(parser(content)));
}

export function readImageData(url, callback) {
  const image = new Image();

  image.onload = function() {
    const h = image.height;
    const w = image.width;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, w, h);
    callback(ctx.getImageData(0, 0, w, h));
  };

  image.src = url;
}
