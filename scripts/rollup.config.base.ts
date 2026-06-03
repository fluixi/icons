// rollup.config.base.ts
import path from 'path';
import fs from 'fs';
import { defineConfig, OutputOptions } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import glob from 'fast-glob';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Create a Rollup config from an absolute package path.
 * @param pkgDir Absolute path to the package directory
 */
export function createConfigFromPath(pkgDir: string) {
  const srcDir = path.join(pkgDir, 'src');
  const distDir = path.join(pkgDir, 'dist');
  // console.log('cwd', cwd)

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Missing src/ directory in ${pkgDir}`);
  }

  // find every .ts file recursively (except .d.ts)
  const entryPoints = glob.sync(`${srcDir}/**/*.ts`, {
    ignore: ['**/*.d.ts']
  });

  // fallback to index.ts if nothing found
  const inputFiles = entryPoints.length
    ? entryPoints
    : [path.join(srcDir, 'index.ts')];

  return defineConfig([
    // JS build (ESM + CJS)
    {
      input: inputFiles,
      output: [
        {
          dir: distDir,
          format: 'esm',
          sourcemap: true,
          preserveModules: true,
          preserveModulesRoot: srcDir,
          entryFileNames: '[name].js',
          exports: 'named'
        },
        {
          dir: distDir,
          format: 'cjs',
          sourcemap: true,
          preserveModules: true,
          preserveModulesRoot: srcDir,
          entryFileNames: '[name].cjs',
          exports: 'named'
        }
      ],
      plugins: [
        nodeResolve({ extensions: ['.ts', '.js'] }),
        commonjs(),
        json(),
        typescript({
          declaration: false,
          declarationMap: false,
          tsconfig: path.resolve(path.join(pkgDir, 'tsconfig.json')),
          outDir: path.resolve(path.join(pkgDir, 'dist')),
          exclude: [ path.resolve(path.join(pkgDir, 'icons'))],
          outputToFilesystem: false
        }),
        isProd &&
          terser({
            format: {
              comments: /License|MIT|ISC|Apache/i
            }
          }),
      ],
      external: (id) => /^lit|^icons\//.test(id),
    },

    // Type declarations build
    // {
    //   input: path.join(srcDir, 'index.ts'),
    //   output: {
    //     file: path.join(distDir, 'index.d.ts'),
    //     format: 'es',
    //     exports: "named"
    //   },
    //   plugins: [
    //     dts({
    //       includeExternal: ["registry.d.ts"]
    //   })]
    // }
  ]);
}

// export function buildWatch(inputOptions, outputOptions: OutputOptions | OutputOptions[]) {
//   const watcher = watch({
//     ...inputOptions,
//     output: outputOptions,
//     watch: {
//       clearScreen: true,
//       include: 'src/**',
//       exclude: 'node_modules/**',
//     },
//   });

//   watcher.on('event', (event) => {
//     switch (event.code) {
//       case 'START':
//         console.log('👀 Starting watcher...');
//         break;
//       case 'BUNDLE_START':
//         console.log('📦 Building...', event.input);
//         break;
//       case 'BUNDLE_END':
//         console.log(`✅ Built in ${event.duration}ms.`);
//         break;
//       case 'END':
//         console.log('🔁 Waiting for changes...');
//         break;
//       case 'ERROR':
//         console.error('❌ Error:', event.error);
//         break;
//     }
//   });
// }
