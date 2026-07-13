/**
 * build-icons-api.ts
 *
 * Assembles the @fluixi-icons/icons umbrella package from the individual
 * @fluixi-icons/icon-* packages. For each library it produces:
 *
 *   dist/{lib}/index.js      — named SVG string exports (tree-shakeable)
 *   dist/{lib}/index.d.ts    — TypeScript declarations
 *   dist/{lib}/sprite.svg    — SVG sprite sheet
 *   dist/{lib}/manifest.json — icon-id → viewBox map
 *   dist/{lib}/registry.js   — standalone CDN/IIFE bundle for this set
 *                              (the ./{lib}/cdn export aliases this same file)
 *
 * Plus combined "all" outputs:
 *   dist/index.js            — all icons from every set (very large)
 *   dist/all/sprite.svg      — all sets merged into one sprite
 *   dist/all/registry.js     — the full fluixi-icons-all.js CDN blob
 *                              (the ./all/cdn export aliases this same file)
 *
 * Usage:
 *   import { LuActivity }       from '@fluixi-icons/icons/lucide'
 *   import { TrAccessible }     from '@fluixi-icons/icons/tabler/filled'
 *   import spriteUrl            from '@fluixi-icons/icons/lucide/sprite.svg'
 *   import '@fluixi-icons/icons/lucide/registry'   // self-registers web components
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, "..");
const ICONS_DIR  = path.join(ROOT, "packages", "icons");
const SPRITES    = path.join(ROOT, "sprites");
const CDN        = path.join(ROOT, "cdn");
const API_DIST   = path.join(ROOT, "packages", "icons-api", "dist");

// ─── Set definitions ─────────────────────────────────────────────────────────

interface Route { api: string; src: string }
interface SetDef {
  pkg: string;           // dir under packages/icons/
  cdnName: string;       // cdn/adafri_{cdnName}.js
  spriteName: string;    // sprites/{spriteName}-sprite.svg
  routes: Route[];       // SVG string subpath routes
}

const SETS: SetDef[] = [
  {
    pkg: "icon-lucide", cdnName: "fluixi_icon-lucide", spriteName: "lucide",
    routes: [{ api: "lucide", src: "__default__" }],
  },
  {
    pkg: "icon-tabler", cdnName: "fluixi_icon-tabler", spriteName: "tabler",
    routes: [
      { api: "tabler",         src: "" },
      { api: "tabler/filled",  src: "filled" },
      { api: "tabler/outline", src: "outline" },
    ],
  },
  {
    pkg: "icon-heroicons", cdnName: "fluixi_icon-heroicons", spriteName: "heroicons",
    routes: [
      { api: "heroicons",              src: "" },
      { api: "heroicons/24/outline",   src: "24/outline" },
      { api: "heroicons/24/solid",     src: "24/solid" },
      { api: "heroicons/16/solid",     src: "16/solid" },
      { api: "heroicons/20/solid",     src: "20/solid" },
    ],
  },
  {
    pkg: "icon-font-awesome", cdnName: "fluixi_icon-fontawesome", spriteName: "font-awesome",
    routes: [
      { api: "font-awesome",         src: "" },
      { api: "font-awesome/solid",   src: "solid" },
      { api: "font-awesome/regular", src: "regular" },
      { api: "font-awesome/brands",  src: "brands" },
    ],
  },
  {
    pkg: "icon-material-design", cdnName: "fluixi_icon-material-design", spriteName: "material-design",
    routes: [
      { api: "material-design",          src: "" },
      { api: "material-design/filled",   src: "filled" },
      { api: "material-design/outlined", src: "outlined" },
      { api: "material-design/round",    src: "round" },
      { api: "material-design/sharp",    src: "sharp" },
      { api: "material-design/two-tone", src: "two-tone" },
    ],
  },
  {
    pkg: "icon-remix", cdnName: "fluixi_icon-remix", spriteName: "remix",
    routes: [{ api: "remix", src: "" }],
  },
  {
    pkg: "icon-phosphor", cdnName: "fluixi_icon-phosphor", spriteName: "phosphor",
    routes: [
      { api: "phosphor",          src: "" },
      { api: "phosphor/regular",  src: "regular" },
      { api: "phosphor/fill",     src: "fill" },
      { api: "phosphor/bold",     src: "bold" },
      { api: "phosphor/light",    src: "light" },
      { api: "phosphor/thin",     src: "thin" },
      { api: "phosphor/duotone",  src: "duotone" },
    ],
  },
  {
    pkg: "icon-bootstrap", cdnName: "fluixi_icon-bootstrap", spriteName: "bootstrap",
    routes: [{ api: "bootstrap", src: "__default__" }],
  },
  {
    pkg: "icon-iconoir", cdnName: "fluixi_icon-iconoir", spriteName: "iconoir",
    routes: [
      { api: "iconoir",         src: "" },
      { api: "iconoir/regular", src: "regular" },
      { api: "iconoir/solid",   src: "solid" },
    ],
  },
  {
    // Our own internal icon set — SVGs committed to the repo, not fetched.
    pkg: "icon-internal", cdnName: "fluixi_icon-internal", spriteName: "internal",
    routes: [
      { api: "internal",         src: "" },
      { api: "internal/filled",  src: "filled" },
      { api: "internal/outline", src: "outline" },
    ],
  },
];

// Respect ICON_SETS filter for quick local testing
const FILTER = process.env.ICON_SETS
  ? new Set(process.env.ICON_SETS.split(",").map((s) => s.trim()))
  : null;
const activeSets = FILTER
  ? SETS.filter((s) => FILTER.has(s.pkg.replace("icon-", "")))
  : SETS;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function write(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function copyFile(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    console.warn(`    [skip] not found: ${path.relative(ROOT, src)}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

interface IconEntry { name: string; slug: string; svg: string }

/** Collect named SVG-string exports from a flat src/icons/{subDir}/ folder. */
function collectExports(iconsDir: string, subDir: string): IconEntry[] {
  const flat = subDir === "" || subDir === "__default__";
  const scanDir = flat
    ? (fs.existsSync(path.join(iconsDir, "__default__"))
        ? path.join(iconsDir, "__default__")
        : iconsDir)
    : path.join(iconsDir, subDir);

  if (!fs.existsSync(scanDir)) return [];

  const results: IconEntry[] = [];
  for (const entry of fs.readdirSync(scanDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (entry.name === "index.ts" || entry.name === "all.ts") continue;
    const content = fs.readFileSync(path.join(scanDir, entry.name), "utf8");
    const match = content.match(/^const (\w+) = (`[\s\S]*?`);/m);
    if (!match) continue;
    results.push({
      name: match[1],
      slug: entry.name.replace(/\.ts$/, ""),
      svg:  match[2].slice(1, -1).trim(),
    });
  }
  return results;
}

/**
 * Write one file per icon plus a barrel index — same layout as @fluixi-icons/icons-jsx.
 *   {apiDir}/{slug}.js     → export const Name = "<svg…>"; export default Name
 *   {apiDir}/{slug}.d.ts   → declare const Name: string; …
 *   {apiDir}/index.js      → re-export barrel
 *   {apiDir}/index.d.ts
 */
function writeIconFiles(apiDir: string, icons: IconEntry[]): void {
  fs.mkdirSync(apiDir, { recursive: true });

  const barrel: string[] = [];
  const seen = new Set<string>(); // guard against two slugs → same component name

  for (const { name, slug, svg } of icons) {
    write(
      path.join(apiDir, `${slug}.js`),
      `export const ${name} = ${JSON.stringify(svg)};\nexport default ${name};\n`,
    );
    write(
      path.join(apiDir, `${slug}.d.ts`),
      `declare const ${name}: string;\nexport default ${name};\nexport { ${name} };\n`,
    );
    if (seen.has(name)) continue; // skip duplicate component names in the barrel
    seen.add(name);
    // Single named re-export — the per-icon file already exposes both named
    // and default, so re-exporting the name once avoids a duplicate export.
    barrel.push(`export { ${name} } from './${slug}.js'`);
  }

  write(path.join(apiDir, "index.js"),   barrel.join("\n") + "\n");
  write(path.join(apiDir, "index.d.ts"), barrel.join("\n") + "\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

fs.mkdirSync(API_DIST, { recursive: true });
if (FILTER) console.log(`Filtering to: ${[...FILTER].join(", ")}\n`);

const allSpriteParts: string[] = [];
const rootBarrelRoutes: string[] = []; // first route per set, for the root barrel

for (const set of activeSets) {
  const iconsDir = path.join(ICONS_DIR, set.pkg, "src", "icons");
  console.log(`\n▸ ${set.pkg}`);

  const topApi = set.routes[0].api;       // e.g. "tabler", "lucide"
  const builtRoutes: string[] = [];       // routes that actually produced icons

  // ── SVG string subpath routes ──────────────────────────────────────────────
  for (const route of set.routes) {
    const icons = collectExports(iconsDir, route.src);
    if (icons.length === 0) {
      console.log(`  [skip] ${route.api} — 0 icons`);
      continue;
    }
    writeIconFiles(path.join(API_DIST, route.api), icons);
    console.log(`  ✓ ${route.api}: ${icons.length} files`);
    builtRoutes.push(route.api);
  }

  // ── Top-level barrel ───────────────────────────────────────────────────────
  // For multi-variant sets (tabler, heroicons, …) the top-level route is empty,
  // so synthesize a barrel that re-exports every built variant barrel. This
  // makes `import { TrAccessible } from '@fluixi-icons/icons/tabler'` work.
  const topDirHasOwnIcons = builtRoutes.includes(topApi);
  if (!topDirHasOwnIcons && builtRoutes.length > 0) {
    const rel = (r: string) => "./" + path.relative(topApi, r).split(path.sep).join("/");
    const barrel = builtRoutes.map((r) => `export * from '${rel(r)}/index.js'`).join("\n");
    write(path.join(API_DIST, topApi, "index.js"),   barrel + "\n");
    write(path.join(API_DIST, topApi, "index.d.ts"), barrel + "\n");
    console.log(`  ✓ ${topApi}: combined barrel (${builtRoutes.length} variants)`);
  }
  rootBarrelRoutes.push(topApi);

  // ── Sprite + manifest ──────────────────────────────────────────────────────
  const spriteApi  = set.routes[0].api; // top-level api subpath for this set
  const spriteSrc  = path.join(SPRITES, `${set.spriteName}-sprite.svg`);
  const manifestSrc = path.join(SPRITES, `${set.spriteName}-manifest.json`);

  copyFile(spriteSrc,   path.join(API_DIST, spriteApi, "sprite.svg"));
  copyFile(manifestSrc, path.join(API_DIST, spriteApi, "manifest.json"));

  if (fs.existsSync(spriteSrc)) {
    // Collect <symbol> elements for the merged all-sprite
    const spriteContent = fs.readFileSync(spriteSrc, "utf8");
    const symbols = spriteContent.match(/<symbol[\s\S]*?<\/symbol>/g) ?? [];
    allSpriteParts.push(...symbols);
    console.log(`  ✓ sprite.svg + manifest.json`);
  }

  // ── CDN / registry per set ────────────────────────────────────────────────
  // One physical file (registry.js). The `./{set}/cdn` and `./{set}/registry`
  // package exports both point at it, so there is no duplicated content.
  const cdnSrc = path.join(CDN, `${set.cdnName}.js`);
  copyFile(cdnSrc, path.join(API_DIST, spriteApi, "registry.js"));
  if (fs.existsSync(cdnSrc)) console.log(`  ✓ registry.js`);
}

// ── Combined "all" outputs ────────────────────────────────────────────────────
console.log("\n▸ all (combined)");

// Root barrel — thin re-export of every set's barrel (tree-shakeable; icon
// content lives in the per-icon files, not inlined here).
const rootJs  = rootBarrelRoutes.map((r) => `export * from './${r}/index.js'`).join("\n");
write(path.join(API_DIST, "index.js"),   rootJs + "\n");
write(path.join(API_DIST, "index.d.ts"), rootJs + "\n");
console.log(`  ✓ index.js: root barrel re-exporting ${rootBarrelRoutes.length} sets`);

// Merged sprite
const allSpriteXml =
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n` +
  allSpriteParts.join("\n") +
  `\n</svg>\n`;
write(path.join(API_DIST, "all", "sprite.svg"), allSpriteXml);
console.log(`  ✓ all/sprite.svg (${allSpriteParts.length} symbols)`);

// Full CDN blob (single file; ./all/registry and ./all/cdn both point at it)
const fullCdnSrc = path.join(CDN, "fluixi-icons-all.js");
copyFile(fullCdnSrc, path.join(API_DIST, "all", "registry.js"));
if (fs.existsSync(fullCdnSrc)) console.log(`  ✓ all/registry.js`);

console.log(`\n✅ @fluixi-icons/icons built — output: ${path.relative(ROOT, API_DIST)}/`);
