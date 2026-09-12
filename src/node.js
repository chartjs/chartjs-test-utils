/**
 * The node side of the fixture update mode.
 *
 * Kept out of the browser entry on purpose: this module reads `node:fs`, which
 * the browser bundle must never pull in. Import it from the Vitest browser
 * config, which runs in node.
 */

import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {defineBrowserCommand} from '@vitest/browser';

/**
 * Builds the `saveFixtureImage` browser command.
 *
 * Register it only when actually updating, and let the suite detect the mode
 * from the command's presence. A flag would have to be passed through `define`,
 * which Vitest re-encodes: `JSON.stringify(false)` arrives in the browser as
 * the string "false", which is truthy, and every fixture quietly rewrites
 * itself while reporting a pass.
 *
 * @param {object} [options]
 * @param {string} [options.dir] - fixture root, relative to the working directory
 * @returns the browser command
 *
 * @example
 * const updating = process.env.UPDATE_FIXTURES === '1';
 * export default defineConfig({
 *   test: {
 *     browser: {
 *       commands: updating ? {saveFixtureImage: createSaveFixtureImage()} : {}
 *     }
 *   }
 * });
 */
export function createSaveFixtureImage({dir = 'test/fixtures'} = {}) {
  return defineBrowserCommand((_context, name, dataUrl) => {
    const file = resolve(process.cwd(), dir, `${name}.png`);
    writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    // biome-ignore lint/suspicious/noConsole: telling the developer which image was rewritten
    console.log(`updated ${file}`);
  });
}
