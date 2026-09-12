export default {
  description: 'line chart with axis labels drawn from the text sprite sheet',
  config: {
    type: 'line',
    data: {
      labels: ['a', 'b', 'c', 'd'],
      datasets: [{
        data: [1, 3, 2, 4],
        borderColor: '#ff6384',
        borderWidth: 2,
        pointRadius: 3
      }]
    },
    options: {
      scales: {
        x: {ticks: {color: '#333'}},
        y: {ticks: {color: '#333'}}
      }
    }
  },
  options: {
    canvas: {height: 256, width: 256},
    // Real font rasterization differs between browsers and platforms, so a
    // fixture that draws text blits it from the bundled sprite sheet instead.
    spriteText: true
  }
};
