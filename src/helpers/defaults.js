export function applyDefaultChartConfig(config) {
  config.platform = config.platform || Chart.platforms.BasicPlatform;

  const options = config.options = config.options || {};
  options.animation = options.animation === undefined ? false : options.animation;
  options.responsive = options.responsive === undefined ? false : options.responsive;
  options.locale = options.locale || 'en-US';
}

export function applyDefaultFixtureOptions(options) {
  options.canvas = options.canvas || {height: 512, width: 512};
  options.wrapper = options.wrapper || {class: 'chartjs-wrapper'};
}
