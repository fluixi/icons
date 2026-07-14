/**
 * build-icons-jsx.ts
 *
 * Builds @fluixi-icons/ui — pure JSX, no React import, no TypeScript syntax.
 * Works with any JSX runtime (Fluixi, React 17+, Preact, Solid).
 *
 * One bundled module per route (all its icons as named exports), not a file per
 * icon — npm rejects tarballs with too many files, and bundlers tree-shake named
 * exports from a single ESM module just as well (the react-icons/solid-icons shape).
 *
 * Output per icon set:
 *   dist/{set}/index.jsx        ← all the set's icons, named exports
 *   dist/{set}/index.d.ts
 *   dist/{set}/index.js         ← combined barrel for multi-variant sets
 *
 * Each icon:
 *   export function BiAlarm({ size = '1em', ...props }) {
 *     return (
 *       <svg fill="currentColor" viewBox="0 0 16 16" width={size} height={size} {...props}>
 *         <path d="..."/>
 *       </svg>
 *     )
 *   }
 *
 * No `import React` — the consumer's bundler applies its own JSX transform. In a
 * Fluixi app, @fluixi/vite-plugin sets esbuild `jsxImportSource: @fluixi/jsx`, so
 * these compile to Fluixi DOM automatically (incl. node_modules pre-bundling).
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

/**
 * One icon as a NAMED function export (no default). All of a route's icons live in
 * one bundled module; `export function X` lets bundlers tree-shake unused ones.
 */
function svgToJsxNamed(svg: string, name: string): string {
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
    `export function ${name}({ size = '1em', ...props }) {`,
    `  return (`,
    `    <svg ${jsxAttrs} width={size} height={size} {...props}>`,
    `      ${jsxInner}`,
    `    </svg>`,
    `  )`,
    `}`,
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
  const up = "../".repeat(depth);

  // All of a route's icons live in ONE bundled module (named exports), not a file
  // per icon. Bundlers tree-shake the unused named functions, so consumers still
  // pay only for what they import — but the package ships ~2 files per route
  // instead of thousands (npm rejects tarballs with too many files). This is the
  // react-icons / solid-icons distribution shape.
  const components: string[] = [];
  const dtsLines: string[] = [`import type { IconProps, IconElement } from '${up}types.js'`];
  const seen = new Set<string>();

  for (const { name, svg } of icons) {
    if (seen.has(name)) continue; // two slugs → same component name: keep the first
    const component = svgToJsxNamed(svg, name);
    if (!component) continue;
    seen.add(name);
    components.push(component);
    dtsLines.push(`export declare function ${name}(props?: IconProps): IconElement`);
  }

  // The module carries raw JSX, so it must be `.jsx` for the consumer's JSX loader
  // to transform it (bundlers apply the JSX loader by extension).
  fs.writeFileSync(path.join(outDir, "index.jsx"),  components.join("\n\n") + "\n");
  fs.writeFileSync(path.join(outDir, "index.d.ts"), dtsLines.join("\n")     + "\n");
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
    console.log(`  ✓ ${route.api}: ${icons.length} icons → dist/${route.api}/index.jsx`);
    builtRoutes.push(route.api);
    if (set.routes.indexOf(route) === 0) totalIcons += icons.length;
  }

  // Combined barrel for multi-variant sets (tabler, heroicons, …) whose top-level
  // route is empty, so `@fluixi-icons/ui/tabler` re-exports every variant module.
  if (!builtRoutes.includes(topApi) && builtRoutes.length > 0) {
    const rel = (r: string) => "./" + path.relative(topApi, r).split(path.sep).join("/");
    const barrel = builtRoutes.map((r) => `export * from '${rel(r)}/index.jsx'`).join("\n");
    const dts    = builtRoutes.map((r) => `export * from '${rel(r)}/index.js'`).join("\n");
    fs.mkdirSync(path.join(JSX_DIST, topApi), { recursive: true });
    fs.writeFileSync(path.join(JSX_DIST, topApi, "index.js"),   barrel + "\n");
    fs.writeFileSync(path.join(JSX_DIST, topApi, "index.d.ts"), dts    + "\n");
    console.log(`  ✓ ${topApi}: combined barrel (${builtRoutes.length} variants)`);
  }
}

// Root entry — exposes shared types only. Components are imported per set
// (e.g. '@fluixi-icons/ui/lucide') to keep bundles tree-shakeable.
fs.writeFileSync(path.join(JSX_DIST, "index.js"), "export {}\n");
fs.writeFileSync(
  path.join(JSX_DIST, "index.d.ts"),
  `export type { IconProps, IconElement } from './types.js'\n`,
);

// Regenerate the package's exports map from the full SET definitions (not from what
// this run built) so the committed map is complete and correct even from a filtered
// local build — the routes are static. A multi-route set's top route is a `combined`
// barrel (index.js re-exporting variants); every other route is a bundled `.jsx` leaf.
writeExportsMap();

console.log(`\n✅ @fluixi-icons/ui built — ${totalIcons} components`);
console.log(`   Output: ${path.relative(ROOT, JSX_DIST)}/`);

function writeExportsMap(): void {
  const pkgPath = path.join(ROOT, "packages", "icons-jsx", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const exports: Record<string, unknown> = {
    ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
    "./types": { types: "./dist/types.d.ts" },
  };
  for (const set of SETS) {
    const combinedTop = set.routes.length > 1 ? set.routes[0].api : null;
    for (const route of set.routes) {
      const file = route.api === combinedTop ? "index.js" : "index.jsx";
      exports[`./${route.api}`] = {
        types: `./dist/${route.api}/index.d.ts`,
        default: `./dist/${route.api}/${file}`,
      };
    }
  }
  pkg.exports = exports;
  pkg.sideEffects = false; // pure named exports — let bundlers drop unused icons
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  ✓ exports: ${Object.keys(exports).length - 2} route subpaths`);
}
