/**
 * Generates one SVG sprite sheet per icon set.
 *
 * Usage: tsx scripts/generate-sprites.ts
 *
 * Output: sprites/{set}-sprite.svg  +  sprites/{set}-manifest.json
 *
 * Sprite usage in HTML:
 *   <svg><use href="/sprites/tabler-sprite.svg#accessible-filled"/></svg>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ICONS_DIR = path.join(ROOT, "packages", "icons");
const OUT_DIR = path.join(ROOT, "sprites");

interface IconEntry {
  id: string;
  viewBox: string;
  content: string;
}

function extractViewBox(svg: string): string {
  const m = svg.match(/viewBox="([^"]+)"/);
  return m ? m[1] : "0 0 24 24";
}

function extractInnerContent(svg: string): string {
  // Strip outer <svg ...> wrapper, comments, and whitespace
  return svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<svg[^>]*>/i, "")
    .replace(/<\/svg>/i, "")
    .trim();
}

function slugify(name: string): string {
  return name.replace(/([A-Z])/g, (c, i) => (i ? "-" : "") + c.toLowerCase()).replace(/^-/, "");
}

function buildSprite(icons: IconEntry[]): string {
  const symbols = icons
    .map(
      ({ id, viewBox, content }) =>
        `  <symbol id="${id}" viewBox="${viewBox}">\n    ${content}\n  </symbol>`,
    )
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols}\n</svg>\n`;
}

function processIconSet(setDir: string, setName: string): void {
  const iconsSourceDir = path.join(setDir, "icons");
  if (!fs.existsSync(iconsSourceDir)) {
    console.warn(`  [skip] no icons/ dir in ${setName}`);
    return;
  }

  const icons: IconEntry[] = [];

  function walk(dir: string, prefix: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, prefix ? `${prefix}-${entry.name}` : entry.name);
      } else if (entry.name.endsWith(".svg")) {
        const baseName = entry.name.replace(/\.svg$/, "");
        const id = prefix ? `${prefix}-${baseName}` : baseName;
        const svg = fs.readFileSync(full, "utf8");
        icons.push({
          id,
          viewBox: extractViewBox(svg),
          content: extractInnerContent(svg),
        });
      }
    }
  }

  walk(iconsSourceDir, "");

  if (!icons.length) {
    console.warn(`  [skip] no SVG files found in ${setName}`);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Write sprite SVG
  const spritePath = path.join(OUT_DIR, `${setName}-sprite.svg`);
  fs.writeFileSync(spritePath, buildSprite(icons));

  // Write manifest JSON (id → viewBox lookup)
  const manifestPath = path.join(OUT_DIR, `${setName}-manifest.json`);
  const manifest: Record<string, string> = {};
  for (const { id, viewBox } of icons) manifest[id] = viewBox;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`  ✓ ${setName}: ${icons.length} icons → ${path.basename(spritePath)}`);
}

function run(): void {
  const iconSetsFilter = process.env.ICON_SETS
    ? new Set(process.env.ICON_SETS.split(",").map((s) => s.trim()))
    : null;

  const allSets = fs.readdirSync(ICONS_DIR, { withFileTypes: true }).filter(
    (e) => e.isDirectory() && e.name.startsWith("icon-"),
  );
  const sets = iconSetsFilter
    ? allSets.filter((e) => iconSetsFilter.has(e.name.replace(/^icon-/, "")))
    : allSets;

  if (iconSetsFilter) console.log(`[ICON_SETS] filtering to: ${sets.map(s => s.name).join(", ")}\n`);
  console.log(`Generating sprites for ${sets.length} icon sets…\n`);

  for (const set of sets) {
    const setName = set.name.replace(/^icon-/, "");
    processIconSet(path.join(ICONS_DIR, set.name), setName);
  }

  console.log(`\nSprites written to: ${path.relative(ROOT, OUT_DIR)}/`);
}

run();
