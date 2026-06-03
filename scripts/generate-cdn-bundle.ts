import fs from "fs";
import path from "path";
import pc from "picocolors";
import { rollup } from "rollup";
import terser from "@rollup/plugin-terser";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import glob from "fast-glob";
import typescript from "@rollup/plugin-typescript";
import { formatCode } from "./format-code.js";

const CDN_DIST_DIR = path.resolve("cdn");

function readPackageInfo(pkgDir: string) {
  const pkgPath = path.join(pkgDir, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const { name = path.basename(pkgDir), version = "0.0.0", license = "MIT" } = pkg;
  const srcDir = path.join(pkgDir, "src");
  const entry = fs.existsSync(path.join(srcDir, "all.ts"))
    ? path.join(srcDir, "all.ts")
    : path.join(srcDir, "index.ts");
  return [{ name, version, license, pkgDir, srcDir, entry }];
}

/** Strip known scoped prefixes and convert remaining hyphens to underscores
 *  so the result is always a valid JS identifier. */
const getLibName = (name: string) =>
  name
    .replace("fluixi_icon-", "")
    .replace("fluixi_icon_", "")
    .replace(/-/g, "_");

async function buildCdnBundle(info: {
  name: string; entry: string; version: string; license: string; srcDir: string;
}) {
  const { name, entry, version, license, srcDir } = info;

  if (!fs.existsSync(entry)) {
    console.log(pc.yellow(`⚠️  Skipped ${name}: entry not found (${entry})`));
    return null;
  }

  const iconsDir = path.join(srcDir, "icons");
  const iconCount = fs.existsSync(iconsDir)
    ? fs.readdirSync(iconsDir, { recursive: true, withFileTypes: true }).filter(
        (f) => typeof f.isFile === "function" && f.isFile() && f.name.endsWith(".ts"),
      ).length
    : 0;

  const shortName = name.replace(/^@/, "").replace(/\//g, "_");
  const globalVar = shortName.toUpperCase().replace(/-/g, "_");
  const distFile = path.join(CDN_DIST_DIR, `${shortName}.js`);
  const libName = getLibName(shortName);
  const namedImport = `import {Icons as ${libName}} from '${path.resolve(
    entry.replace("src/", "dist/src/").replace(".ts", ".js"),
  )}'`;

  const tsconfig = path.resolve(srcDir.replace(/src\/?$/, ""), "tsconfig.json");
  const out_dir = path.resolve(CDN_DIST_DIR);

  console.log(pc.cyan(`\n🔧 ${name}`));
  const bundle = await rollup({
    input: entry,
    plugins: [
      nodeResolve({ extensions: [".ts", ".js"] }),
      commonjs(),
      json(),
      typescript({ tsconfig, outDir: out_dir }),
      terser({ format: { comments: /License|MIT|ISC|Apache/i }, compress: true }),
    ],
  });

  await bundle.write({
    file: distFile,
    format: "iife",
    name: globalVar,
    sourcemap: false,
    banner: `// ${name}@${version} — ${license}`,
    footer: `;(function(){
  if(!window.FLUIXI_ICONS)window.FLUIXI_ICONS={};
  if(!window.FLUIXI_ICON_META)window.FLUIXI_ICON_META={};
  if(${globalVar}&&${globalVar}.default)
    Object.assign(window.FLUIXI_ICONS,${globalVar}.default);
  window.FLUIXI_ICON_META['${shortName}']={name:"${name}",version:"${version}",license:"${license}",count:${iconCount}};
})();`,
  });

  console.log(pc.green(`   ✅ → cdn/${path.basename(distFile)} (${iconCount} icons)`));
  return { shortName, distFile, globalVar, namedImport, libName };
}

export async function generateAllCdnBundles() {
  console.log(pc.cyan("\n🌐 Generating CDN bundles…"));
  fs.mkdirSync(CDN_DIST_DIR, { recursive: true });

  const iconSetsFilter = process.env.ICON_SETS
    ? new Set(process.env.ICON_SETS.split(",").map((s) => s.trim()))
    : null;
  if (iconSetsFilter)
    console.log(pc.yellow(`[ICON_SETS] ${[...iconSetsFilter].join(", ")}`));

  const pkgJsonPaths = await glob("packages/icons/*/package.json", { onlyFiles: true });
  const pkgInfos = pkgJsonPaths
    .filter((p) => {
      if (!iconSetsFilter) return true;
      return iconSetsFilter.has(path.basename(path.dirname(p)).replace(/^icon-/, ""));
    })
    .flatMap((p) => readPackageInfo(path.dirname(p)) ?? [])
    .filter(Boolean);

  if (!pkgInfos.length) {
    console.log(pc.yellow("⚠️  No packages found."));
    return;
  }

  const builtBundles: NonNullable<Awaited<ReturnType<typeof buildCdnBundle>>>[] = [];
  for (const info of pkgInfos) {
    const result = await buildCdnBundle(info as any);
    if (result) builtBundles.push(result);
  }

  if (!builtBundles.length) return;

  // Super bundle — aggregates all icon sets
  const superFile = path.join(CDN_DIST_DIR, "fluixi-icons-all.js");
  console.log(pc.cyan("\n🔧 Super bundle: fluixi-icons-all.js"));

  const tempCode = [
    "// Auto-generated super bundle",
    ...builtBundles.map((b) => `${b.namedImport};`),
    "",
    `export const FLUIXI_ICONS = { ${builtBundles.map((b) => b.libName).join(", ")} };`,
  ].join("\n");

  const tempFile = path.join(CDN_DIST_DIR, "__super-temp.js");
  fs.writeFileSync(tempFile, await formatCode(tempCode, {}, tempFile));

  const superBundle = await rollup({
    input: tempFile,
    plugins: [nodeResolve(), commonjs(), terser()],
  });
  await superBundle.write({ file: superFile, format: "iife", name: "FLUIXI_ICONS" });
  fs.unlinkSync(tempFile);

  console.log(pc.green(`   ✅ → cdn/fluixi-icons-all.js`));
}

generateAllCdnBundles().catch((err) => {
  console.error(err);
  process.exit(1);
});
