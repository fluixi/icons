// rollup.build-all.ts
import path from "path";
import fs from "fs";
import fg from "fast-glob";
import { rollup } from "rollup";
import pc from "picocolors";
import { createConfigFromPath } from "./rollup.config.base.js";
import { fileURLToPath } from "url";
import {persistentCachePlugin} from './rollup-cache.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES_ROOT = path.join(__dirname, "packages");


import { spawn } from 'child_process';
const isWatch = process.env.WATCH === 'true';
async function runBuildCommand(pkgDir: string) {
  const relName = path.relative(PACKAGES_ROOT, pkgDir);
  console.log(pc.cyan(`\n🔨 Building package: ${relName}`));

  try {
    console.log(pc.blue(`📦 Running pnpm run in ${relName}...`));
    
    const child = spawn('pnpm', ['run', 'build'], {
      cwd: pkgDir,
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          console.log(pc.green(`✅ pnpm run completed for ${relName}`));
          resolve(code);
        } else {
          reject(new Error(`pnpm run failed with code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
    
  } catch (err) {
    console.error(pc.red(`❌ Failed running pnpm run in ${relName}:`), err);
  }
}
async function buildPackage(pkgDir: string) {
  const relName = path.relative(PACKAGES_ROOT, pkgDir);
  console.log(pc.cyan(`\n🔨 Building package: ${relName}`));
  const cachePlugin = persistentCachePlugin({
    dir: '.rollup-cache',
    envKeys: ['NODE_ENV'],
  });

  try {
    const configs = createConfigFromPath(pkgDir);
    const configArray = Array.isArray(configs) ? configs : [configs];

    for (const cfg of configArray) {
      const bundle = await rollup(cfg);
      const outputs = (Array.isArray(cfg.output) ? cfg.output : [cfg.output]).filter(a=>a!==undefined);
      await Promise.all(outputs.filter((o) => o!==undefined).map((o) => bundle.write(o)));
      cachePlugin.buildEnd?.call(bundle, null);
      await bundle.close();
    }

    // await runBuildCommand(pkgDir)
    console.log(pc.green(`✅ Built ${relName}`));
  } catch (err) {
    console.error(pc.red(`❌ Failed building ${relName}:`), err);
  }
}

async function findPackages(): Promise<string[]> {
  const pattern = path.posix.join("packages", "**", "package.json");
  const entries = await fg(pattern, { onlyFiles: true });
  return entries
    .map((p) => path.dirname(path.resolve(p)))
    .filter((dir) => fs.existsSync(path.join(dir, "src")));
}

async function main() {
  const packages: string[] = []
  try {
    const { generateIconsModules } = await import("./generate-modules.js");
    const r = await generateIconsModules();
    packages.push(...r)
  } catch(e) {
    console.log('e', e)
    console.log(pc.yellow("ℹ️  CDN bundle generation skipped"));
  }
  const pkgDirs = await findPackages();
  if (!pkgDirs.length) {
    console.log(pc.yellow("⚠️  No packages with src/ found"));
    return;
  }

  console.log(pc.cyan(`📦 Found ${pkgDirs.length} packages:`));
  pkgDirs.forEach((p) => console.log("  -", pc.green(path.relative(PACKAGES_ROOT, p))));
  // console.log('packages are', packages)
  for (const pkgDir of pkgDirs) {
    // console.log('building package json', pkgDir)
    if(packages.length > 0 && !packages.some(p=>pkgDir.endsWith(p))){
      console.log('skipping package', pkgDir)
      continue
    }
    await buildPackage(pkgDir);
  }

  // optional CDN bundle generation
  try {
    const { generateAllCdnBundles } = await import("./generate-cdn-bundle.js");
    await generateAllCdnBundles();
  } catch(e) {
    console.log('e', e)
    console.log(pc.yellow("ℹ️  CDN bundle generation skipped"));
  }

  console.log(pc.bold(pc.cyan("\n🎉 All packages built successfully!")));
}

main();