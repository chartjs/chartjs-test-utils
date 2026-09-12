/**
 * Fixture discovery for the pixel tests.
 *
 * Karma scanned `__karma__.files` and re-read every config through XHR. A
 * bundler resolves the same files at build time instead -- but the glob has to
 * stay in the consumer: `import.meta.glob` (and `require.context`) resolve
 * against the file the literal pattern is written in, so the maps are passed in
 * here rather than produced here.
 */
import {expect, it} from 'vitest';
import {readImageData} from './canvas.js';
import {acquireChart, releaseChart} from './chart.js';
import {toEqualImageData} from './matchers.js';

/**
 * Resolves the browser commands registered by the Vitest config.
 *
 * Imported lazily: `vitest/browser` throws outside browser mode, and the
 * package entry has to stay importable from node -- `createMockContext` is used
 * in node unit tests.
 */
async function browserCommands() {
  const {server} = await import('vitest/browser');
  return server.commands;
}

/** `./fixtures/basic/labels.js` -> `basic/labels` */
function fixtureName(path, prefix) {
  const name = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  return name.replace(/\.(js|json|png)$/, '');
}

function collect(configs, images, prefix) {
  const inputs = {};
  const add = (path, key, value) => {
    const name = fixtureName(path, prefix);
    inputs[name] = inputs[name] || {};
    inputs[name][key] = value;
  };

  Object.keys(configs).forEach((path) => add(path, 'config', configs[path]));
  Object.keys(images).forEach((path) => add(path, 'png', images[path]));
  return inputs;
}

function prepareConfig(name, json) {
  const config = json.config;
  config.options = config.options || {};
  // plugins are disabled by default, except if the path contains 'plugin' or
  // there are instance plugins
  if (!name.includes('plugin') && config.plugins === undefined) {
    config.options.plugins = config.options.plugins || false;
  }
  return config;
}

/**
 * Asserts against the reference image, or rewrites it when updating.
 *
 * The update command exists only when the browser config registered it, so the
 * normal suite cannot take this path by accident. Even then it rewrites only
 * images that actually changed, so an update is a reviewable diff rather than
 * every fixture touched.
 */
async function compareOrSave(chart, name, inputs, json, save) {
  const expected = inputs.png ? await readImageData(inputs.png) : undefined;

  if (!save) {
    expect(chart).toEqualImageData(expected, json);
    return;
  }
  if (expected && toEqualImageData(chart, expected, json).pass) {
    return;
  }
  await save(name, chart.ctx.canvas.toDataURL());
}

function specFromFixture(name, inputs) {
  it(name, async(ctx) => {
    const save = (await browserCommands()).saveFixtureImage;
    const json = inputs.config;
    if (!json) {
      throw new Error(`Missing config file for fixture ${name}`);
    }
    if (!inputs.png && !save) {
      throw new Error(`Missing PNG comparison file for fixture ${name}`);
    }
    json.description = json.description || name;

    const chart = acquireChart(prepareConfig(name, json), json.options, ctx);
    try {
      const run = json.options && json.options.run;
      if (typeof run === 'function') {
        await run(chart);
      }
      await compareOrSave(chart, name, inputs, json, save);
    } finally {
      releaseChart(chart);
    }
  });
}

/**
 * Builds the fixture spec generator from the maps the consumer globbed.
 *
 * @param {object} options
 * @param {object} options.configs - map of path to fixture config (js and json)
 * @param {object} options.images - map of path to reference image url
 * @param {string} [options.prefix] - path prefix stripped from the fixture names
 * @returns {function(string=): function} `specsFromFixtures(path)`
 *
 * @example
 * export const specsFromFixtures = createFixtures({
 *   configs: {
 *     ...import.meta.glob('./fixtures/**\/*.js', {eager: true, import: 'default'}),
 *     ...import.meta.glob('./fixtures/**\/*.json', {eager: true, import: 'default'})
 *   },
 *   images: import.meta.glob('./fixtures/**\/*.png', {eager: true, import: 'default', query: '?url'}),
 *   prefix: './fixtures/'
 * });
 */
export function createFixtures({configs, images, prefix = ''}) {
  const fixtures = collect(configs, images, prefix);

  /**
   * Returns a suite body registering one spec per fixture below `path`.
   * @param {string} [path] - directory under the fixtures root, e.g. `basic`; omit for all
   */
  function specsFromFixtures(path = '') {
    const names = Object.keys(fixtures)
      .filter((name) => path === '' || name.startsWith(`${path}/`))
      .sort();

    return () => {
      if (names.length === 0) {
        throw new Error(`No fixtures found under ${prefix}${path}`);
      }
      names.forEach((name) => specFromFixture(name, fixtures[name]));
    };
  }

  return specsFromFixtures;
}
