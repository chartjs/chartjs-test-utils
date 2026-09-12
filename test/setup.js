import {Chart, registerables} from 'chart.js';

import {setup} from '../src/index.js';

// Karma loaded the UMD bundle, which registers every Chart.js component.
Chart.register(...registerables);

setup({Chart});
