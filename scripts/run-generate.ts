/**
 * run-generate.ts
 *
 * CLI runner for generateIconsModules() from generate-modules.ts. Generates
 * LitElement web components (flx-icon/src/), React wrappers (react/icons/),
 * package exports, and the global icon registry. Then deduplicates type
 * aliases in the generated index files (safety net for generator edge cases).
 *
 * Usage:  pnpm generate        (or: tsx scripts/run-generate.ts)
 */
import { generateIconsModules } from "./generate-modules.js";
import { dedupAllIndexes } from "./dedup-indexes.js";
import { repairMissingIcons } from "./repair-missing-icons.js";

(async () => {
  try {
    await generateIconsModules();

    console.log("\n🩹 Post-processing: repairing missing/empty icon modules…");
    const { repaired, failed } = repairMissingIcons();
    console.log(`   ${repaired} regenerated, ${failed} unresolved.`);
    if (failed > 0) {
      console.error("❌ Some icons could not be repaired (no source SVG).");
      process.exit(1);
    }

    console.log("🔧 Post-processing: deduplicating type aliases…");
    const n = dedupAllIndexes();
    console.log(`✅ Post-processing done — ${n} index file(s) changed.`);
  } catch (err) {
    console.error("Generation failed:", err);
    process.exit(1);
  }
})();
