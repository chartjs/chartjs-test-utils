import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

import {createSaveFixtureImage} from './src/node.js';

// Reference images can only be produced by a real browser, so producing them is
// a mode of this suite rather than a separate tool. `npm run fixtures:update`
// sets the flag and runs Chromium alone, so one browser is the source of truth.
//
// The command is registered only in that mode, and its presence is what the
// suite checks -- see the comment in src/node.js.
const updating = process.env.UPDATE_FIXTURES === '1';

// The flags Karma used, so the canvas is rasterized by the CPU in both browsers
// and the pixel fixtures stay comparable.
//
// These belong to the provider, not to an instance: Vitest accepts a `launch`
// or `launchOptions` key on an instance and silently ignores both.
const chromiumArgs = [
  '--disable-accelerated-2d-canvas',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding'
];

const firefoxPrefs = {
  'gfx.canvas.accelerated': false,
  'layers.acceleration.disabled': true
};

export default defineConfig({
  test: {
    browser: {
      commands: updating ? {saveFixtureImage: createSaveFixtureImage()} : {},
      enabled: true,
      headless: true,
      instances: updating
        ? [{browser: 'chromium'}]
        : [{browser: 'chromium'}, {browser: 'firefox'}],
      provider: playwright({
        launchOptions: {args: chromiumArgs, firefoxUserPrefs: firefoxPrefs}
      }),
      screenshotFailures: false
    },
    include: ['test/specs/**/*.spec.js'],
    setupFiles: ['test/setup.js']
  }
});
