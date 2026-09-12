/**
 * The published type entry.
 *
 * Everything below `./generated` is emitted from the JSDoc in `src` by
 * `npm run types`, so it cannot drift from the implementation. This file adds
 * the one thing a declaration emit cannot produce: the matchers, which live on
 * Vitest's `expect` rather than in this package's exports.
 */
export * from './generated/index.js';

import type Context from './generated/context.js';

/**
 * The 2d context methods the mock records. Kept in step with
 * `mockContextMethods` in `src/context.js` by a unit test, because the mock
 * assigns them in a loop and a declaration emit cannot see that.
 */
type RecordedMethod =
  | 'arc'
  | 'arcTo'
  | 'beginPath'
  | 'bezierCurveTo'
  | 'clearRect'
  | 'clip'
  | 'closePath'
  | 'fill'
  | 'fillRect'
  | 'fillText'
  | 'lineTo'
  | 'measureText'
  | 'moveTo'
  | 'quadraticCurveTo'
  | 'rect'
  | 'restore'
  | 'rotate'
  | 'save'
  | 'setLineDash'
  | 'setTransform'
  | 'stroke'
  | 'strokeRect'
  | 'strokeText'
  | 'translate';

/** The style properties the mock records when they are assigned. */
type RecordedProperty =
  | 'fillStyle'
  | 'font'
  | 'lineCap'
  | 'lineDashOffset'
  | 'lineJoin'
  | 'lineWidth'
  | 'strokeStyle'
  | 'textAlign'
  | 'textBaseline';

/** What the mock's `measureText` returns: a fixed subset of TextMetrics. */
export interface MockTextMetrics {
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
  actualBoundingBoxLeft: number;
  actualBoundingBoxRight: number;
  width: number;
}

/** One recorded call. */
export interface RecordedCall {
  name: string;
  args: unknown[];
}

/**
 * A 2d context that records what was drawn on it. The signatures come from
 * `CanvasRenderingContext2D`, so a test written against the mock matches the
 * real context -- except `measureText`, which returns fake metrics.
 */
export interface MockContext
  extends Context,
    Pick<CanvasRenderingContext2D, Exclude<RecordedMethod, 'measureText'>>,
    Pick<CanvasRenderingContext2D, RecordedProperty> {
  measureText(text?: string): MockTextMetrics;
  getCalls(): RecordedCall[];
  resetCalls(): void;
}

/** Overrides the generated signature, which cannot see the recorded methods. */
export declare function createMockContext(): MockContext;

/** Options accepted by `toEqualImageData`. */
export interface ImageComparisonOptions {
  /** Per-pixel color distance, passed to pixelmatch. Defaults to 0.1. */
  threshold?: number;
  /** Accepted ratio of differing pixels. Defaults to 0.001. */
  tolerance?: number;
  /**
   * Blend transparency against a checkerboard instead of white. Opt in per
   * fixture, once its reference image has been re-validated against it.
   */
  checkerboard?: boolean;
  /** Always fail and log the preview. */
  debug?: boolean;
  /** Label for the logged preview. */
  description?: string;
}

/** The size assertions made by `toBeChartOfSize`. */
export interface ChartSize {
  /** display height, in CSS pixels */
  dh: number;
  /** display width, in CSS pixels */
  dw: number;
  /** render height, in backing-store pixels */
  rh: number;
  /** render width, in backing-store pixels */
  rw: number;
}

declare module 'vitest' {
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    /** Compares the rendered canvas against a reference image. */
    toEqualImageData(expected: ImageData, opts?: ImageComparisonOptions): R;
    /** Compares resolved chart options, ignoring `_`-prefixed properties. */
    toEqualOptions(expected: object): R;
    /** Asserts the chart, its canvas, its context and a finite size. */
    toBeValidChart(): R;
    /** Asserts the display and render size of a chart. */
    toBeChartOfSize(expected: ChartSize): R;
    /** Asserts two pixel values are within 0.5% or 2px of each other. */
    toBeCloseToPixel(expected: number): R;
    /** Asserts two points are equal when rounded to two decimals. */
    toBeCloseToPoint(expected: {x: number; y: number}): R;
    /** Asserts the value is one of the expected values. */
    toEqualOneOf(expected: readonly unknown[]): R;
  }
}
