/**
 * Compiles the published declarations the way a consumer sees them: through the
 * package name, so the `exports` map decides which types are found, with
 * `skipLibCheck: false` so the declarations themselves are checked.
 *
 * Nothing here runs; it only has to compile. The `@ts-expect-error` lines are
 * assertions too -- they fail the build if the types stop catching the mistake.
 */
import {Chart, registerables} from 'chart.js';
import {
  acquireChart,
  createFixtures,
  createMockContext,
  releaseChart,
  setup,
  triggerMouseEvent
} from 'chartjs-test-utils';
import {createSaveFixtureImage} from 'chartjs-test-utils/node';
import {expect} from 'vitest';

Chart.register(...registerables);
setup({Chart});
setup({Chart, devicePixelRatio: 2, wrapperCSS: false});

// @ts-expect-error -- the Chart constructor is required
setup({});

// A stand-in for the Vitest test context, which is all `acquireChart` needs.
const testContext = {skip: (_reason?: string) => {}};

export async function charts() {
  const chart = acquireChart(
    {type: 'bar', data: {labels: ['a'], datasets: [{data: [1]}]}},
    {canvas: {height: 64, width: 64}, spriteText: true},
    testContext
  );

  // A chart.js Chart, not `any`: its own API has to typecheck.
  const element = chart.getDatasetMeta(0).data[0];
  chart.update();

  const event: MouseEvent = await triggerMouseEvent(chart, 'mousemove', element);
  expect(event.type).toBe('mousemove');

  expect(chart).toBeValidChart();
  expect(chart).toBeChartOfSize({dh: 64, dw: 64, rh: 64, rw: 64});
  expect(chart.width).toBeCloseToPixel(64);
  expect({x: element.x, y: element.y}).toBeCloseToPoint({x: 32, y: 32});
  expect('a').toEqualOneOf(['a', 'b']);
  expect(chart.options).toEqualOptions({responsive: false});

  // @ts-expect-error -- a size needs all four dimensions
  expect(chart).toBeChartOfSize({dh: 64});

  releaseChart(chart);
}

export function mockContext() {
  const ctx = createMockContext();

  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 1, 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const width: number = ctx.measureText('abc').width;
  const calls: {name: string; args: unknown[]}[] = ctx.getCalls();
  ctx.resetCalls();

  // @ts-expect-error -- fillRect takes four numbers, like the real context
  ctx.fillRect('0', 0, 1, 1);

  return {calls, width};
}

export function fixtures() {
  const specsFromFixtures = createFixtures({
    configs: {'./fixtures/basic/bar.json': {}},
    images: {'./fixtures/basic/bar.png': 'data:image/png;base64,'},
    prefix: './fixtures/'
  });
  const suite: () => void = specsFromFixtures('basic');

  return suite;
}

export const saveFixtureImage = createSaveFixtureImage({dir: 'test/fixtures'});
