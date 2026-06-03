/**
 * Shared icon library registry — imported by both fetch-icons.ts and copy-icons.ts
 * with no side effects.
 *
 * Filter: set ICON_SETS=lucide,bootstrap (comma-separated) to only process
 * those libraries. Useful for fast local testing.
 *   ICON_SETS=lucide,bootstrap pnpm copy-icons
 */

/** Returns the active subset of ICON_LIBS based on the ICON_SETS env var. */
export function getActiveLibs(libs: IconLib[]): IconLib[] {
  const filter = process.env.ICON_SETS;
  if (!filter) return libs;
  const names = new Set(filter.split(",").map((s) => s.trim()));
  return libs.filter((l) => names.has(l.name.replace("icon-", "")));
}

export type Handler = "default" | "material-design" | "phosphor";

export interface IconLib {
  name: string;
  repo: string;
  svgFolder?: string;
  handler?: Handler;
  sparse?: string[];
}

export const ICON_LIBS: IconLib[] = [
  {
    name: "icon-lucide",
    repo: "https://github.com/lucide-icons/lucide.git",
    svgFolder: "icons",
    sparse: ["icons"],
  },
  {
    name: "icon-heroicons",
    repo: "https://github.com/tailwindlabs/heroicons.git",
    svgFolder: "optimized",
    sparse: ["optimized"],
  },
  {
    name: "icon-tabler",
    repo: "https://github.com/tabler/tabler-icons.git",
    svgFolder: "icons",
    sparse: ["icons"],
  },
  {
    name: "icon-remix",
    repo: "https://github.com/Remix-Design/RemixIcon.git",
    svgFolder: "icons",
    sparse: ["icons"],
  },
  {
    name: "icon-font-awesome",
    repo: "https://github.com/FortAwesome/Font-Awesome.git",
    svgFolder: "svgs",
    sparse: ["svgs"],
  },
  {
    name: "icon-material-design",
    repo: "https://github.com/google/material-design-icons.git",
    handler: "material-design",
    sparse: ["src"],
  },
  {
    name: "icon-phosphor",
    repo: "https://github.com/phosphor-icons/core.git",
    svgFolder: "assets",
    handler: "phosphor",
    sparse: ["assets"],
  },
  {
    name: "icon-bootstrap",
    repo: "https://github.com/twbs/icons.git",
    svgFolder: "icons",
    sparse: ["icons"],
  },
  {
    name: "icon-iconoir",
    repo: "https://github.com/iconoir-icons/iconoir.git",
    svgFolder: "icons",
    sparse: ["icons"],
  },
];
