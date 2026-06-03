/**
 * build-icons-jsx.ts
 *
 * Builds @fluixi/icons-jsx — pure JSX, one file per icon, no React import,
 * no TypeScript syntax. Works with any JSX runtime (React 17+, Preact, Solid).
 *
 * Output per icon set:
 *   dist/{set}/alarm.jsx        ← one file per icon
 *   dist/{set}/alarm-fill.jsx
 *   dist/{set}/index.js         ← barrel re-export
 *
 * Each icon file:
 *   export default function BiAlarm({ size = '1em', ...props }) {
 *     return (
 *       <svg fill="currentColor" viewBox="0 0 16 16" width={size} height={size} {...props}>
 *         <path d="..."/>
 *       </svg>
 *     )
 *   }
 *   export { BiAlarm }
 *
 * No `import React` — use the automatic JSX transform in your bundler:
 *   Vite:   plugins: [react()]  or  esbuild jsxImportSource
 *   Next:   automatic (default)
 *   tsc:    "jsx": "react-jsx", "jsxImportSource": "react"
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const ICONS_DIR = path.join(ROOT, "packages", "icons");
const JSX_DIST  = path.join(ROOT, "packages", "icons-jsx", "dist");

const FILTER = process.env.ICON_SETS
  ? new Set(process.env.ICON_SETS.split(",").map((s) => s.trim()))
  : null;

// ─── SVG attribute → JSX camelCase map ───────────────────────────────────────

const ATTR_MAP: Record<string, string> = {
  "class":               "className",
  "stroke-width":        "strokeWidth",
  "stroke-linecap":      "strokeLinecap",
  "stroke-linejoin":     "strokeLinejoin",
  "stroke-miterlimit":   "strokeMiterlimit",
  "stroke-dasharray":    "strokeDasharray",
  "stroke-dashoffset":   "strokeDashoffset",
  "stroke-opacity":      "strokeOpacity",
  "fill-rule":           "fillRule",
  "fill-opacity":        "fillOpacity",
  "clip-rule":           "clipRule",
  "clip-path":           "clipPath",
  "font-size":           "fontSize",
  "font-family":         "fontFamily",
  "font-weight":         "fontWeight",
  "font-style":          "fontStyle",
  "text-anchor":         "textAnchor",
  "text-decoration":     "textDecoration",
  "dominant-baseline":   "dominantBaseline",
  "alignment-baseline":  "alignmentBaseline",
  "stop-color":          "stopColor",
  "stop-opacity":        "stopOpacity",
  "color-interpolation": "colorInterpolation",
  "color-rendering":     "colorRendering",
  "image-rendering":     "imageRendering",
  "shape-rendering":     "shapeRendering",
  "letter-spacing":      "letterSpacing",
  "word-spacing":        "wordSpacing",
  "writing-mode":        "writingMode",
  "xlink:href":          "xlinkHref",
  "xml:space":           "xmlSpace",
};

function convertAttrs(s: string): string {
  for (const [attr, jsx] of Object.entries(ATTR_MAP)) {
    s = s.replace(new RegExp(`\\b${attr}(?==)`, "g"), jsx);
  }
  return s;
}

// ─── SVG string → JSX function component (plain JS, no types) ────────────────

function svgToJsx(svg: string, name: string): string {
  const clean = svg.replace(/<!--[\s\S]*?-->/g, "").trim();
  const outerMatch = clean.match(/^<svg([\s\S]*?)>([\s\S]*)<\/svg>$/i);
  if (!outerMatch) return "";

  const rawAttrs = outerMatch[1]
    .replace(/\s+width="[^"]*"/g, "")   // drop width — use size prop instead
    .replace(/\s+height="[^"]*"/g, "")  // drop height — use size prop instead
    .replace(/\s*xmlns="[^"]*"/g, "")   // not needed in inline JSX
    .trim();

  const jsxAttrs  = convertAttrs(rawAttrs);
  const jsxInner  = convertAttrs(outerMatch[2].trim());

  return [
    `export default function ${name}({ size = '1em', ...props }) {`,
    `  return (`,
    `    <svg ${jsxAttrs} width={size} height={size} {...props}>`,
    `      ${jsxInner}`,
    `    </svg>`,
    `  )`,
    `}`,
    `export { ${name} }`,
  ].join("\n");
}

/** Per-icon type declaration — depends only on the local shared types. */
function iconDts(name: string, depth: number): string {
  const up = "../".repeat(depth);
  return [
    `import type { IconProps, IconElement } from '${up}types.js'`,
    `declare function ${name}(props?: IconProps): IconElement`,
    `export default ${name}`,
    `export { ${name} }`,
  ].join("\n");
}

// ─── Collect icons from generated source files ────────────────────────────────

interface IconEntry {
  name: string;   // PascalCase component name e.g. BiAlarm
  slug: string;   // kebab-case filename stem e.g. alarm
  svg: string;    // raw SVG string
}

function collectIcons(dir: string): IconEntry[] {
  if (!fs.existsSync(dir)) return [];
  const results: IconEntry[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (entry.name === "index.ts" || entry.name === "all.ts") continue;
    const content = fs.readFileSync(path.join(dir, entry.name), "utf8");
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

// ─── Write one file per icon + barrel index ───────────────────────────────────

function writeJsxSet(outDir: string, route: string, icons: IconEntry[]): void {
  fs.mkdirSync(outDir, { recursive: true });

  // depth = how many directories deep this route sits under dist/
  const depth = route.split("/").length;

  const barrelJs:  string[] = [];
  const barrelDts: string[] = [];
  const seen = new Set<string>(); // guard against two slugs → same component name

  for (const { name, slug, svg } of icons) {
    const component = svgToJsx(svg, name);
    if (!component) continue;

    // One .jsx + .d.ts file per icon (tree-shakeable, deep-importable)
    fs.writeFileSync(path.join(outDir, `${slug}.jsx`), component + "\n");
    fs.writeFileSync(path.join(outDir, `${slug}.d.ts`), iconDts(name, depth) + "\n");

    if (seen.has(name)) continue; // skip duplicate component names in the barrel
    seen.add(name);
    // Single named re-export — the per-icon file exposes both named and
    // default, so re-exporting the name once avoids a duplicate export.
    barrelJs.push(`export { ${name} } from './${slug}.jsx'`);
    barrelDts.push(`export { ${name} } from './${slug}.js'`);
  }

  fs.writeFileSync(path.join(outDir, "index.js"),   barrelJs.join("\n")  + "\n");
  fs.writeFileSync(path.join(outDir, "index.d.ts"), barrelDts.join("\n") + "\n");
}

// ─── Set definitions ─────────────────────────────────────────────────────────

interface Route { api: string; src: string }
interface SetDef { pkg: string; routes: Route[] }

const SETS: SetDef[] = [
  { pkg: "icon-lucide",          routes: [{ api: "lucide",                src: "__default__" }] },
  { pkg: "icon-tabler",          routes: [{ api: "tabler",                src: "" }, { api: "tabler/filled",  src: "filled" }, { api: "tabler/outline", src: "outline" }] },
  { pkg: "icon-heroicons",       routes: [{ api: "heroicons",             src: "" }, { api: "heroicons/24/outline", src: "24/outline" }, { api: "heroicons/24/solid", src: "24/solid" }, { api: "heroicons/16/solid", src: "16/solid" }, { api: "heroicons/20/solid", src: "20/solid" }] },
  { pkg: "icon-font-awesome",    routes: [{ api: "font-awesome",          src: "" }, { api: "font-awesome/solid",   src: "solid"   }, { api: "font-awesome/regular", src: "regular" }, { api: "font-awesome/brands", src: "brands" }] },
  { pkg: "icon-material-design", routes: [{ api: "material-design",       src: "" }, { api: "material-design/filled", src: "filled" }, { api: "material-design/outlined", src: "outlined" }, { api: "material-design/round", src: "round" }, { api: "material-design/sharp", src: "sharp" }, { api: "material-design/two-tone", src: "two-tone" }] },
  { pkg: "icon-remix",           routes: [{ api: "remix",                 src: "" }] },
  { pkg: "icon-phosphor",        routes: [{ api: "phosphor",              src: "" }, { api: "phosphor/regular", src: "regular" }, { api: "phosphor/fill", src: "fill" }, { api: "phosphor/bold", src: "bold" }, { api: "phosphor/light", src: "light" }, { api: "phosphor/thin", src: "thin" }, { api: "phosphor/duotone", src: "duotone" }] },
  { pkg: "icon-bootstrap",       routes: [{ api: "bootstrap",             src: "__default__" }] },
  { pkg: "icon-iconoir",         routes: [{ api: "iconoir",               src: "" }, { api: "iconoir/regular", src: "regular" }, { api: "iconoir/solid", src: "solid" }] },
  { pkg: "icon-internal",        routes: [{ api: "internal",              src: "" }, { api: "internal/filled", src: "filled" }, { api: "internal/outline", src: "outline" }] },
];

const activeSets = FILTER
  ? SETS.filter((s) => FILTER.has(s.pkg.replace("icon-", "")))
  : SETS;

// ─── Main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(JSX_DIST, { recursive: true });
if (FILTER) console.log(`[ICON_SETS] filtering to: ${[...FILTER].join(", ")}\n`);

// Shared, framework-agnostic prop + return types (no React dependency).
// `IconElement` is `any` so the package works with React, Preact, Solid, etc.
fs.writeFileSync(
  path.join(JSX_DIST, "types.d.ts"),
  [
    `export interface IconProps {`,
    `  /** Sets both width and height. Overridden by explicit width/height. Default: '1em'. */`,
    `  size?: number | string`,
    `  className?: string`,
    `  color?: string`,
    `  style?: Record<string, unknown>`,
    `  [key: string]: unknown`,
    `}`,
    `export type IconElement = any`,
    ``,
  ].join("\n"),
);

let totalIcons = 0;

for (const set of activeSets) {
  const iconsDir = path.join(ICONS_DIR, set.pkg, "src", "icons");
  console.log(`\n▸ ${set.pkg}`);

  const topApi = set.routes[0].api;
  const builtRoutes: string[] = [];

  for (const route of set.routes) {
    const flat = route.src === "" || route.src === "__default__";
    const scanDir = flat
      ? (fs.existsSync(path.join(iconsDir, "__default__"))
          ? path.join(iconsDir, "__default__")
          : iconsDir)
      : path.join(iconsDir, route.src);

    const icons = collectIcons(scanDir);
    if (icons.length === 0) {
      console.log(`  [skip] ${route.api} — no icons`);
      continue;
    }

    writeJsxSet(path.join(JSX_DIST, route.api), route.api, icons);
    console.log(`  ✓ ${route.api}: ${icons.length} files → dist/${route.api}/`);
    builtRoutes.push(route.api);
    if (set.routes.indexOf(route) === 0) totalIcons += icons.length;
  }

  // Combined barrel for multi-variant sets (tabler, heroicons, …) whose
  // top-level route is empty, so `@fluixi/icons-jsx/tabler` re-exports variants.
  if (!builtRoutes.includes(topApi) && builtRoutes.length > 0) {
    const rel = (r: string) => "./" + path.relative(topApi, r).split(path.sep).join("/");
    const barrel = builtRoutes.map((r) => `export * from '${rel(r)}/index.js'`).join("\n");
    fs.mkdirSync(path.join(JSX_DIST, topApi), { recursive: true });
    fs.writeFileSync(path.join(JSX_DIST, topApi, "index.js"),   barrel + "\n");
    fs.writeFileSync(path.join(JSX_DIST, topApi, "index.d.ts"), barrel + "\n");
    console.log(`  ✓ ${topApi}: combined barrel (${builtRoutes.length} variants)`);
  }
}

// Root entry — exposes shared types only. Components are imported per set
// (e.g. '@fluixi/icons-jsx/lucide') to keep bundles tree-shakeable.
fs.writeFileSync(path.join(JSX_DIST, "index.js"), "export {}\n");
fs.writeFileSync(
  path.join(JSX_DIST, "index.d.ts"),
  `export type { IconProps, IconElement } from './types.js'\n`,
);

console.log(`\n✅ @fluixi/icons-jsx built — ${totalIcons} components`);
console.log(`   Output: ${path.relative(ROOT, JSX_DIST)}/`);
