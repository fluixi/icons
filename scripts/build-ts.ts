/**
 * build-ts.ts
 * Runs `tsc --project tsconfig.json` for each icon package,
 * respecting the ICON_SETS env var filter.
 *
 * Usage:
 *   pnpm build:ts                          — build all
 *   ICON_SETS=lucide,bootstrap pnpm build:ts — build only those two
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, "..");
const ICONS_DIR  = path.join(ROOT, "packages", "icons");

const filter = process.env.ICON_SETS
  ? new Set(process.env.ICON_SETS.split(",").map((s) => s.trim()))
  : null;

if (filter) console.log(`[ICON_SETS] filtering to: ${[...filter].join(", ")}\n`);

const pkgs = fs
  .readdirSync(ICONS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith("icon-"))
  .filter((e) => !filter || filter.has(e.name.replace(/^icon-/, "")));

// Note: empty/missing icon modules are healed by `scripts/repair-missing-icons.ts`
// (run as part of `pnpm generate`), not deleted here — deleting them would break
// the index.ts that imports them.

let failed = 0;
for (const pkg of pkgs) {
  const pkgDir = path.join(ICONS_DIR, pkg.name);
  const tsconfig = path.join(pkgDir, "tsconfig.json");
  if (!fs.existsSync(tsconfig)) {
    console.warn(`  [skip] ${pkg.name} — no tsconfig.json`);
    continue;
  }
  process.stdout.write(`▸ ${pkg.name} … `);
  try {
    execSync("tsc --project tsconfig.json", { cwd: pkgDir, stdio: "pipe" });
    console.log("✓");
  } catch (err: any) {
    console.log("✗");
    console.error(err.stderr?.toString() ?? err.message);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} package(s) failed to build.`);
  process.exit(1);
}
console.log("\n✅ All packages built successfully.");
