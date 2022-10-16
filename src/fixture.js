import {_acquireChart, _releaseChart, loadConfig, readImageData} from './helpers/index';

function specFromFixture(description, inputs) {
  const input = inputs.js || inputs.json;
  it(input, function(done) {
    loadConfig(input, function(json) {
      const {description: descr = description, config} = json;
      const options = config.options || (config.options = {});

      // plugins are disabled by default, except if the path contains 'plugin' or there are instance plugins
      if (input.indexOf('plugin') === -1 && config.plugins === undefined) {
        options.plugins = options.plugins || false;
      }

      const chart = _acquireChart(config, json.options);
      const _done = () => {
        if (!inputs.png) {
          fail(descr + '\r\nMissing PNG comparison file for ' + input);
          done();
        }

        readImageData(inputs.png, function(expected) {
          expect(chart).toEqualImageData(expected, json);
          _releaseChart(chart);
          done();
        });
      };
      const run = json.options && json.options.run;
      if (typeof run === 'function') {
        Promise.resolve(run(chart)).finally(_done);
      } else {
        _done();
      }
    });
  });
}

export function specsFromFixtures(path) {
  const regex = new RegExp('(^/base/test/fixtures/' + path + '.+)\\.(png|json|js)');
  const inputs = {};

  Object.keys(__karma__.files || {}).forEach(function(file) {
    const [, name, type] = file.match(regex);

    if (name && type) {
      inputs[name] = inputs[name] || {};
      inputs[name][type] = file;
    }
  });

  return function() {
    Object.keys(inputs).forEach(function(key) {
      specFromFixture(key, inputs[key]);
    });
  };
}
