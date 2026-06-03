import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = path.resolve(__dirname, "../packages/icons");

// Common extra targets to delete for every package (edit as needed)
const COMMON_TARGETS: string[] = [
  "src/icons",
  "src/icons-map.ts",
  "src/imports-maps.ts",
  "src/all-icons.ts",
  "src/all.ts",
  "src/custom-icons.ts",
  "src/template.ts",
  "src/index.ts",
  "dist",
  // "src/registry.d.ts",
];

// Optional per-package extra targets (keys are package directory names)
const PER_PACKAGE_TARGETS: Record<string, string[]> = {
  // "icon-lucide": ["some/extra/path"],
};

type CliOptions = {
  dryRun: boolean;
  targets: string[];        // comma-separated via --targets=a,b,c
  packages: string[];       // comma-separated via --packages=name1,name2
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { dryRun: false, targets: [], packages: [] };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg.startsWith("--targets=")) {
      const val = arg.split("=")[1] || "";
      opts.targets = val.split(",").map(s => s.trim()).filter(Boolean);
    } else if (arg.startsWith("--packages=")) {
      const val = arg.split("=")[1] || "";
      opts.packages = val.split(",").map(s => s.trim()).filter(Boolean);
    }
  }
  return opts;
}

function isDir(p: string) {
  try {
    return fs.existsSync(p) && fs.lstatSync(p).isDirectory();
  } catch {
    return false;
  }
}

function removePath(target: string, dryRun: boolean) {
  if (!fs.existsSync(target)) return;
  if (dryRun) {
    console.log(`[dry-run] rm -rf ${path.relative(process.cwd(), target)}`);
    return;
  }
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`🧹 removed ${path.relative(process.cwd(), target)}`);
}

function getPackages(root: string): string[] {
  if (!isDir(root)) return [];
  return fs.readdirSync(root)
    .map(name => path.join(root, name))
    .filter(isDir);
}

/**
 * Clean the modules generated
 * - Basic command tsx scripts/clean-generated-files.ts
 * - Can use dry run: --dry-run
 * - Only specific packages: --packages=icon-lucide,icon-heroicons
 * - Can add extra target: --targets=src/tmp,icons-cach
 * @returns 
 */
async function cleanModules() {
  const { dryRun, targets, packages } = parseArgs(process.argv);

  const pkgDirs = getPackages(PACKAGES_DIR)
    .filter(dir => packages.length === 0 || packages.includes(path.basename(dir)));

  if (!pkgDirs.length) {
    console.log("No packages found to clean.");
    return;
  }

  for (const pkgDir of pkgDirs) {
    const pkgName = path.basename(pkgDir);
    console.log(`\n🧽 Cleaning ${pkgName} ...`);

    // Always remove dist/
    removePath(path.join(pkgDir, "dist"), dryRun);

    // Compute extra targets: CLI --targets + COMMON_TARGETS + per-package overrides
    const perPkg = PER_PACKAGE_TARGETS[pkgName] || [];
    const extraTargets = Array.from(new Set([...targets, ...COMMON_TARGETS, ...perPkg]));

    for (const rel of extraTargets) {
      const abs = path.join(pkgDir, rel);
      removePath(abs, dryRun);
    }
  }

  // Workspace-level generated outputs (only when no --packages filter is set)
  if (packages.length === 0) {
    const repoRoot = path.resolve(__dirname, "..");
    console.log(`\n🧽 Cleaning workspace outputs ...`);
    for (const rel of [
      "packages/icons-api/dist",
      "packages/icons-jsx/dist",
      "cdn",
      "sprites",
    ]) {
      removePath(path.join(repoRoot, rel), dryRun);
    }
  }

  console.log("\n✅ Clean completed.");
}

// Export for programmatic use
export { cleanModules };

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanModules().catch(err => {
    console.error("❌ Clean failed:", err);
    process.exit(1);
  });
}