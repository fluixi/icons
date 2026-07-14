# @fluixi/icons

## 0.0.4

### Patch Changes

- 8ccd506: Bundle each icon route into one module instead of one file per icon. The aggregate
  barrels shipped ~78k files and npm rejected the tarball (`E415 Too many files`); each
  route now emits a single module of named exports (`@fluixi-icons/ui/tabler`,
  `@fluixi-icons/icons/lucide`, …), which bundlers still tree-shake. Adds
  `sideEffects: false`. Per-icon deep-import subpaths (`…/tabler/*`) are removed —
  import the named export from the set instead. The JSX package ships raw `.jsx` so a
  Fluixi app (via `@fluixi/vite-plugin`) compiles it to Fluixi DOM automatically.

## 0.0.3

### Patch Changes

- 9c12998: Fix: ship `dist/all/registry.js` in the published tarball. The CDN bundle is now built before the API copy step so the full icon registry is included.

## 0.0.2

### Patch Changes

- 14a0835: Improve readme

## 0.0.1

### Patch Changes

- add missing registry.js in icons all
