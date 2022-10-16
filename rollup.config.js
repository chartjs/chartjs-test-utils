import {readFileSync} from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
const {name, version, homepage, main} = JSON.parse(readFileSync('./package.json'));

const banner = `/*!
* ${name} v${version}
* ${homepage}
 * (c) ${(new Date(process.env.SOURCE_DATE_EPOCH ? (process.env.SOURCE_DATE_EPOCH * 1000) : new Date().getTime())).getFullYear()} chartjs-plugin-annotation Contributors
 * Released under the MIT License
 */`;

const input = 'src/index.js';

export default {
  input,
  plugins: [
    resolve(),
    commonjs()
  ],
  output: {
    name,
    file: main,
    banner,
    format: 'esm',
    indent: false
  },
};
