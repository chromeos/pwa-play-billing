/*
 *  Copyright 2021 Google LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const rollup = require('rollup');
const virtual = require('@rollup/plugin-virtual');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const replace = require('@rollup/plugin-replace');

module.exports = function (config, options) {
  return {
    name: 'snowpack-sw-plugin',
    async transform(file) {
      if (file.filePath === options.file) {
        const input = {
          input: 'entry',
          plugins: [
            virtual({
              entry: file.contents,
            }),
            nodeResolve(),
            replace({
              'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
            }),
          ],
        };
        const bundle = await rollup.rollup(input);
        const { output } = await bundle.generate({
          file: 'src/sw.js',
          format: 'iife',
        });
        await bundle.close();
        return output[0].code;
      }
    },
  };
};
