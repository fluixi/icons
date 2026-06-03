/**
 * copy-icons.ts
 *
 * Copies SVG files from tmp-icons/{lib}/ into packages/icons/{lib}/icons/,
 * applying per-library layout transformations where needed.
 *
 * Run after `pnpm fetch`.
 * Usage:  pnpm copy-icons      (or: tsx scripts/copy-icons.ts)
 *
 * Handler   Library              tmp-icons layout → packages layout
 * ────────────────────────────────────────────────────────────────────────────
 * default          lucide, heroicons, tabler, remix, font-awesome, bootstrap,
 *                  iconoir
 *                  → copy preserving variant/size subdirs that match known names
 *
 * material-design  google/material-design-icons
 *                  src/{name}/materialicons{variant}/24px.svg
 *                  → icons/{filled|outlined|round|sharp|two-tone}/{name}.svg
 *
 * phosphor         phosphor-icons/core
 *                  assets/{weight}/{name}.svg
 *                  → icons/{weight}/{name}.svg
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ICON_LIBS, getActiveLibs, type IconLib } from "./icon-libs.js";
import { LICENCES_VARIANTS } from "./license/licenses.js";

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const ROOT         = path.resolve(__dirname, "..");
const TMP_DIR      = path.join(ROOT, "tmp-icons");
const PACKAGES_DIR = path.join(ROOT, "packages", "icons");

const knownVariants = new Set(
  LICENCES_VARIANTS.map((v: string) => v.toLowerCase()),
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findSvgs(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findSvgs(full));
    else if (entry.name.endsWith(".svg")) results.push(full);
  }
  return results;
}

function copyFile(src: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** Copy flat SVG tree, keeping only path segments that are known variant/size names. */
function copyDefault(srcRoot: string, destDir: string): number {
  const svgFiles = findSvgs(srcRoot);
  for (const svgPath of svgFiles) {
    const rel   = path.relative(srcRoot, svgPath);
    const parts = rel.split(path.sep);
    const variantParts = parts
      .slice(0, -1)
      .filter((p) => knownVariants.has(p.toLowerCase()));
    const destSubdir = variantParts.length
      ? path.join(destDir, ...variantParts)
      : destDir;
    copyFile(svgPath, path.join(destSubdir, path.basename(svgPath)));
  }
  return svgFiles.length;
}

// ─── Custom handlers ─────────────────────────────────────────────────────────

/**
 * Material Design Icons (Google)
 * Actual repo structure: src/{category}/{icon-name}/{variant}/24px.svg
 * → icons/{variant}/{icon-name}.svg
 */
function copyMaterialDesign(repoDir: string, destDir: string): number {
  const srcDir = path.join(repoDir, "src");
  if (!fs.existsSync(srcDir)) {
    console.warn("    [warn] src/ not found in material-design repo");
    return 0;
  }

  const VARIANT_MAP: Record<string, string> = {
    materialicons:         "filled",
    materialiconsoutlined: "outlined",
    materialiconsround:    "round",
    materialiconssharp:    "sharp",
    materialiconstwotone:  "two-tone",
  };

  let count = 0;
  // src/{category}/
  for (const category of fs.readdirSync(srcDir)) {
    const categoryDir = path.join(srcDir, category);
    if (!fs.statSync(categoryDir).isDirectory()) continue;

    // src/{category}/{icon-name}/
    for (const iconName of fs.readdirSync(categoryDir)) {
      const iconDir = path.join(categoryDir, iconName);
      if (!fs.statSync(iconDir).isDirectory()) continue;

      // src/{category}/{icon-name}/{variant}/24px.svg
      for (const variantFolder of fs.readdirSync(iconDir)) {
        const variant = VARIANT_MAP[variantFolder.toLowerCase()];
        if (!variant) continue;
        const svgPath = path.join(iconDir, variantFolder, "24px.svg");
        if (!fs.existsSync(svgPath)) continue;
        copyFile(svgPath, path.join(destDir, variant, `${iconName}.svg`));
        count++;
      }
    }
  }
  return count;
}

/**
 * Phosphor Icons
 * assets/{weight}/{name}.svg
 * → icons/{weight}/{name}.svg
 */
function copyPhosphor(repoDir: string, assetsFolder: string, destDir: string): number {
  const WEIGHTS = ["bold", "duotone", "fill", "light", "regular", "thin"];
  let count = 0;
  for (const weight of WEIGHTS) {
    const weightDir = path.join(repoDir, assetsFolder, weight);
    if (!fs.existsSync(weightDir)) continue;
    for (const file of fs.readdirSync(weightDir)) {
      if (!file.endsWith(".svg")) continue;
      copyFile(path.join(weightDir, file), path.join(destDir, weight, file));
      count++;
    }
  }
  return count;
}

// ─── Per-library dispatch ─────────────────────────────────────────────────────

function processLib(lib: IconLib): void {
  const repoDir = path.join(TMP_DIR, lib.name);
  if (!fs.existsSync(repoDir)) {
    console.warn(`    [skip] tmp-icons/${lib.name} not found — run pnpm fetch first`);
    return;
  }

  const destDir = path.join(PACKAGES_DIR, lib.name, "icons");
  fs.mkdirSync(destDir, { recursive: true });

  let count = 0;

  if (lib.handler === "material-design") {
    count = copyMaterialDesign(repoDir, destDir);
  } else if (lib.handler === "phosphor") {
    count = copyPhosphor(repoDir, lib.svgFolder ?? "assets", destDir);
  } else {
    const srcDir = path.join(repoDir, lib.svgFolder ?? "");
    if (!fs.existsSync(srcDir)) {
      console.warn(`    [warn] svgFolder "${lib.svgFolder}" not found in tmp-icons/${lib.name}`);
      return;
    }
    count = copyDefault(srcDir, destDir);
  }

  console.log(`    ✓ ${count} SVGs → packages/icons/${lib.name}/icons/`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const libs = getActiveLibs(ICON_LIBS);
if (libs.length < ICON_LIBS.length)
  console.log(`Filtering to: ${libs.map(l => l.name).join(", ")}\n`);

console.log("Copying SVGs from tmp-icons/ to packages/icons/…\n");

for (const lib of libs) {
  console.log(`▸ ${lib.name}`);
  try {
    processLib(lib);
  } catch (err) {
    console.error(`    [error] ${err}`);
  }
}

console.log("\n✅ Done.\nNext: pnpm generate");
