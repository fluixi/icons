/**
 * fetch-icons.ts
 *
 * Clones or updates upstream icon repositories into tmp-icons/.
 * Does NOT copy anything to packages/ — run `pnpm copy-icons` after this.
 *
 * Usage:  pnpm fetch           (or: tsx scripts/fetch-icons.ts)
 *
 * Libraries fetched
 * ─────────────────────────────────────────────────────────────────────────────
 *  icon-lucide           Lucide Icons       (ISC)
 *  icon-heroicons        Heroicons          (MIT)
 *  icon-tabler           Tabler Icons       (Apache-2.0)
 *  icon-remix            Remix Icon         (Apache-2.0)
 *  icon-font-awesome     Font Awesome Free  (CC-BY 4.0 / MIT / SIL)
 *  icon-material-design  Material Design    (Apache-2.0)
 *  icon-phosphor         Phosphor Icons     (MIT)  9 000+ icons, 6 weights
 *  icon-bootstrap        Bootstrap Icons    (MIT)  2 000+ icons
 *  icon-iconoir          Iconoir            (MIT)  1 600+ icons, regular/solid
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ICON_LIBS, getActiveLibs } from "./icon-libs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const TMP_DIR   = path.join(ROOT, "tmp-icons");

// ─── Git helpers ─────────────────────────────────────────────────────────────

function exec(cmd: string, cwd?: string): void {
  execSync(cmd, { stdio: "inherit", cwd });
}

function cloneOrUpdate(lib: IconLib): void {
  const repoDir = path.join(TMP_DIR, lib.name);

  if (fs.existsSync(path.join(repoDir, ".git"))) {
    console.log("    → repo exists, updating…");
    // fetch + hard-reset avoids divergent-branch errors from `git pull`
    exec("git fetch --depth 1 origin", repoDir);
    exec("git reset --hard FETCH_HEAD", repoDir);
    return;
  }

  fs.mkdirSync(repoDir, { recursive: true });

  if (lib.sparse?.length) {
    exec(`git clone --depth 1 --filter=blob:none --sparse "${lib.repo}" "${repoDir}"`);
    exec(`git sparse-checkout set ${lib.sparse.join(" ")}`, repoDir);
    // sparse-checkout set updates the index; checkout hydrates the working tree
    exec("git checkout", repoDir);
  } else {
    exec(`git clone --depth 1 "${lib.repo}" "${repoDir}"`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

fs.mkdirSync(TMP_DIR, { recursive: true });

const libs = getActiveLibs(ICON_LIBS);
if (libs.length < ICON_LIBS.length)
  console.log(`Filtering to: ${libs.map(l => l.name).join(", ")}\n`);

for (const lib of libs) {
  console.log(`\n▸ ${lib.name}`);
  try {
    cloneOrUpdate(lib);
    console.log(`    ✓ done`);
  } catch (err) {
    console.error(`    [error] ${err}`);
  }
}

console.log("\n✅ All repos fetched into tmp-icons/\nNext: pnpm copy-icons");
