/**
 * dedup-indexes.ts
 *
 * Removes duplicate type-alias exports from generated index files — a safety
 * net for generator edge cases (e.g. heroicons' size+variant nesting that can
 * emit `X as Hi24OutlineName, X as Hi24SolidName` from the same module).
 *
 * Imported by run-generate.ts (runs automatically after generate) and also
 * runnable standalone:  tsx scripts/dedup-indexes.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Drop any export alias already seen earlier in the file. */
export function deduplicateTypeAliases(src: string): string {
  const EXPORT_TYPE_RE = /^export type \{([^}]+)\} from (['"][^'"]+['"]);?$/;
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of src.split("\n")) {
    const m = line.trim().match(EXPORT_TYPE_RE);
    if (!m) {
      out.push(line);
      continue;
    }
    const fromClause = line.match(/from (['"][^'"]+['"])/)?.[1] ?? "";
    const kept = m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((spec) => {
        const alias = spec.includes(" as ") ? spec.split(" as ")[1].trim() : spec.trim();
        if (seen.has(alias)) return false;
        seen.add(alias);
        return true;
      });
    if (kept.length === 0) continue;
    out.push(`export type {${kept.join(", ")}} from ${fromClause}`);
  }
  return out.join("\n");
}

export function dedupAllIndexes(packagesDir = path.join(ROOT, "packages", "icons")): number {
  let changed = 0;
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "index.ts" || entry.name === "index.js") {
        const original = fs.readFileSync(full, "utf8");
        const deduped = deduplicateTypeAliases(original);
        if (deduped !== original) {
          fs.writeFileSync(full, deduped);
          console.log(`  deduped: ${path.relative(ROOT, full)}`);
          changed++;
        }
      }
    }
  };
  for (const pkg of fs.readdirSync(packagesDir)) {
    walk(path.join(packagesDir, pkg, "src"));
  }
  return changed;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🔧 Deduplicating type aliases in generated index files…");
  const n = dedupAllIndexes();
  console.log(`✅ Done — ${n} file(s) changed.`);
}
