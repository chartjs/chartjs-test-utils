# chartjs-test-utils

Chart.js test utils package. For usage examples, take a look at these repositories:

- [Chart.js](https://github.com/chartjs/Chart.js)
- [chartjs-plugin-annotation](https://github.com/chartjs/chartjs-plugin-annotation)
- [chartjs-plugin-datalabels](https://github.com/chartjs/chartjs-plugin-datalabels)

## Development

Linting and formatting are done by [Biome](https://biomejs.dev/), configured in
`biome.jsonc`:

```sh
npm run lint     # check formatting and lint rules
npm run format   # apply the safe fixes
```

The formatter settings mirror the `eslint-config-chartjs` style rules it
replaced, so the formatter agrees with the existing sources rather than
restyling them.
