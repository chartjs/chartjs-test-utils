# chartjs-test-utils

Chart.js test utils for [Vitest](https://vitest.dev/) browser mode.

`v1` drops Karma and Jasmine: Karma was deprecated in 2023, and the pieces of
this package that existed to work around it (the `__karma__` file scan, reading
fixture configs back over `XMLHttpRequest`, `jasmine.addMatchers`) have no
counterpart in a bundler-driven runner. The rendering rules that make chart
pixels comparable across browsers and platforms are unchanged, and so are the
reference images captured with them.

Consumers still on Karma stay on `0.5.x`.

## Install

```sh
npm install --save-dev chartjs-test-utils vitest @vitest/browser @vitest/browser-playwright playwright
```

## Setup

`Chart` is injected rather than read from a global: Karma loaded the UMD bundle
into `window`, a bundler does not.

```js
// test/setup.js
import {Chart, registerables} from 'chart.js';
import {setup} from 'chartjs-test-utils';

Chart.register(...registerables);

// Registers the matchers, the per-spec chart cleanup and `devicePixelRatio = 1`.
setup({Chart});
```

```js
// vitest.browser.config.ts
import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{browser: 'chromium'}, {browser: 'firefox'}],
      // Browser launch options belong to the provider. Vitest accepts a
      // `launch` key on an instance and silently ignores it.
      provider: playwright({
        launchOptions: {
          args: ['--disable-accelerated-2d-canvas'],
          firefoxUserPrefs: {'gfx.canvas.accelerated': false}
        }
      })
    },
    include: ['test/specs/**/*.spec.js'],
    setupFiles: ['test/setup.js']
  }
});
```

Keep the canvas on the CPU. These are the flags Karma used, and they belong to
the provider: Vitest accepts `launch` or `launchOptions` on an instance and
silently ignores both. Forcing 2d acceleration back on makes no difference to a
handful of fixtures, but in the Chart.js plugin suites it fails several of them
reproducibly.

## Charts

```js
import {acquireChart, releaseChart, triggerMouseEvent} from 'chartjs-test-utils';

const chart = acquireChart(config, {canvas: {height: 256, width: 256}});
await triggerMouseEvent(chart, 'mousemove', chart.getDatasetMeta(0).data[0]);
```

Charts acquired during a spec are released after it. Options that not every
browser supports (`useShadowDOM`, `useOffscreenCanvas`) skip the spec instead of
failing it, which needs the test context — Jasmine's global `pending()` has no
equivalent in Vitest:

```js
it('renders into a shadow root', (ctx) => {
  const chart = acquireChart(config, {useShadowDOM: true}, ctx);
});
```

## Fixtures

A fixture is a chart config plus a reference PNG of what it should render. The
file lookup has to stay in your repo: `import.meta.glob` resolves against the
file the literal pattern is written in, so `createFixtures` takes the resolved
maps instead of globbing itself.

```js
// test/specs/fixtures.spec.js
import {createFixtures} from 'chartjs-test-utils';

const specsFromFixtures = createFixtures({
  configs: {
    ...import.meta.glob('../fixtures/**/*.js', {eager: true, import: 'default'}),
    ...import.meta.glob('../fixtures/**/*.json', {eager: true, import: 'default'})
  },
  images: import.meta.glob('../fixtures/**/*.png', {eager: true, import: 'default', query: '?url'}),
  prefix: '../fixtures/'
});

describe('basic', specsFromFixtures('basic'));
```

Text rendering differs between browsers and platforms, so a fixture that draws
text should set `spriteText: true` to blit characters from the bundled sprite
sheet.

### Updating reference images

Reference images can only be produced by a real browser, so producing them is a
mode of the fixture suite. Register the `saveFixtureImage` command only in that
mode — its presence is what the suite detects. A flag would have to go through
`define`, which Vitest re-encodes: `JSON.stringify(false)` arrives in the
browser as the string `"false"`, which is truthy, and every fixture quietly
rewrites itself while reporting a pass.

```ts
// vitest.browser.config.ts
import {createSaveFixtureImage} from 'chartjs-test-utils/node';

const updating = process.env.UPDATE_FIXTURES === '1';

export default defineConfig({
  test: {
    browser: {
      commands: updating ? {saveFixtureImage: createSaveFixtureImage()} : {},
      // One browser is the source of truth for the images.
      instances: updating ? [{browser: 'chromium'}] : [{browser: 'chromium'}, {browser: 'firefox'}]
    }
  }
});
```

Only images that actually changed are rewritten, so an update is a reviewable
diff rather than every fixture touched. Regenerating one is never routine: it
means accepting that the output changed.

## Matchers

`setup()` registers all of them.

| Matcher | Checks |
| --- | --- |
| `toEqualImageData(expected, opts)` | rendered canvas against a reference image |
| `toEqualOptions(expected)` | resolved options, ignoring `_`-prefixed properties |
| `toBeValidChart()` | chart, canvas, context and finite size |
| `toBeChartOfSize({dh, dw, rh, rw})` | display and render size |
| `toBeCloseToPixel(expected)` | within 0.5% or 2px |
| `toBeCloseToPoint({x, y})` | rounded to two decimals |
| `toEqualOneOf([...])` | value is one of the expected |

`toEqualImageData` takes `threshold` (per-pixel color distance) and `tolerance`
(accepted ratio of differing pixels). It blends transparency against white:
pixelmatch 7.2.0 made checkerboard blending the default, which is a different
measurement rather than a stricter one, and every reference image this package
has ever compared was captured against white. `checkerboard: true` opts a
fixture in once its image has been re-validated.

## Node

`createMockContext()` records the calls a chart makes to a 2d context, and works
outside the browser:

```js
import {createMockContext} from 'chartjs-test-utils';

const ctx = createMockContext();
ctx.fillRect(1, 2, 3, 4);
ctx.getCalls(); // [{name: 'fillRect', args: [1, 2, 3, 4]}]
```

## Development

```sh
npm run lint       # biome check
npm run format     # biome check --write
npm run typecheck  # the Vitest configs, through tsconfig.tooling.json
npm test           # lint, typecheck, node specs, browser specs
npm run dev        # the browser suite in watch mode
npm run fixtures:update   # rewrite reference images from a Chromium render
```

Lint and formatting are Biome's, configured in `biome.jsonc`. `src/spriting.js`
is the one file with a rule exception, explained in that config: it is a port of
the 0.5.0 sprite sheet and is kept diffable against it.
