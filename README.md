# fluixi icons

Monorepo that fetches icons from upstream projects and publishes them as
npm packages on GitHub Packages — as raw SVG strings, JSX components, web
components, sprites, and CDN bundles.

## Packages

| Package | What it provides |
|---|---|
| [`@fluixi/icons`](packages/icons-api) | SVG strings (one file per icon) + sprites + manifests + CDN/registry bundles |
| [`@fluixi/icons-jsx`](packages/icons-jsx) | Tree-shakeable JSX components, one file per icon, no React dependency |
| `@fluixi/icon-{set}` | Per-set SVG string data packages (lucide, tabler, heroicons, …) |

9 icon sets, 48 000+ icons: Lucide, Tabler, Heroicons, Font Awesome,
Material Design, Remix, Phosphor, Bootstrap, Iconoir.

## Pipeline

```
pnpm fetch:icons   # clone/update upstream icon repos → tmp-icons/
pnpm copy-icons    # copy SVGs → packages/icons/{set}/icons/
pnpm generate      # SVG strings + web components + React wrappers
pnpm sprites       # SVG sprite sheets → sprites/
pnpm bundle        # CDN/registry IIFE bundles → cdn/
pnpm build         # build:ts + build:api + build:jsx
```

`build` runs:
- `build:ts`  — compile each `@fluixi/icon-{set}` data package
- `build:api` — assemble `@fluixi/icons` (per-icon files, sprites, registry, cdn)
- `build:jsx` — assemble `@fluixi/icons-jsx` (per-icon JSX components)

### Testing a subset

Every step honours the `ICON_SETS` env var (comma-separated, no `icon-` prefix):

```sh
ICON_SETS=lucide,bootstrap pnpm copy-icons
ICON_SETS=lucide,bootstrap pnpm generate
ICON_SETS=lucide,bootstrap pnpm build
```

## Releasing

Uses [changesets](https://github.com/changesets/changesets) + GitHub Actions.

1. `pnpm changeset` — describe the change (patch/minor/major)
2. Commit and push to `main`
3. CI opens a **Version Packages** PR
4. Merge it → CI builds and publishes all packages to GitHub Packages,
   then notifies `fluixi/fluixi-webcomponents` to pull the new icon build

Source SVGs and generated files are **not** committed (see `.gitignore`);
CI regenerates them on every run.

## Installing the published packages

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
```

```sh
pnpm add @fluixi/icons        # SVG strings, sprites, CDN
pnpm add @fluixi/icons-jsx    # JSX components
```

## License

MIT (this repo's code). Icon artwork is licensed by each upstream project —
see [LICENSE](LICENSE).
