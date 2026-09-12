import {describe} from 'vitest';

import {createFixtures} from '../../src/index.js';

// The globs have to live here rather than in the package: `import.meta.glob`
// resolves against the file the literal pattern is written in.
const specsFromFixtures = createFixtures({
  configs: {
    ...import.meta.glob('../fixtures/**/*.js', {eager: true, import: 'default'}),
    ...import.meta.glob('../fixtures/**/*.json', {eager: true, import: 'default'})
  },
  images: import.meta.glob('../fixtures/**/*.png', {eager: true, import: 'default', query: '?url'}),
  prefix: '../fixtures/'
});

describe('basic', specsFromFixtures('basic'));
