<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/icons-jsx

**Tree-shakeable JSX icon components — one file per icon, no React dependency.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/types-included-3178c6?logo=typescript&logoColor=white)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)
![JSX](https://img.shields.io/badge/JSX-React%20%7C%20Preact%20%7C%20Solid-61dafb?logo=react&logoColor=black)

---

Tree-shakeable **JSX icon components** for all icon sets — **one file per icon**,
**no React dependency**, pure JSX. No CDN, no web-component registry, no Lit runtime.

Each icon is a plain function component that works with any JSX runtime
(React 17+, Preact, Solid) via the automatic JSX transform — no `import React`
in the output. Components accept a convenience `size` prop plus any SVG attribute.

For raw SVG strings, sprites, and CDN bundles see [`@fluixi/icons`](../icons-api).

## How it works

Each icon is its own file:

```jsx
// dist/bootstrap/alarm.jsx
export default function BiAlarm({ size = '1em', ...props }) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" width={size} height={size} {...props}>
      <path d="…"/>
    </svg>
  )
}
export { BiAlarm }
```

No `import React` — your bundler's automatic JSX transform supplies the runtime.
Configure once:

- **Vite / esbuild**: `jsx: 'automatic'` (default with `@vitejs/plugin-react`)
- **Next.js**: automatic (default)
- **tsc**: `"jsx": "react-jsx"` in `tsconfig.json`
- **Preact**: `jsxImportSource: 'preact'`

---

## Installation

These packages are hosted on **GitHub Packages**, which requires
authentication even for public packages. Add this to the `.npmrc` in your
project (or `~/.npmrc`):

```ini
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Then export a GitHub token with the `read:packages` scope:

```sh
export NODE_AUTH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

> Create the token at GitHub → Settings → Developer settings →
> Personal access tokens. In CI, use the built-in `GITHUB_TOKEN`.

Then install:

```sh
pnpm add @fluixi/icons-jsx
# or
npm install @fluixi/icons-jsx
```

---

## Usage

### Named imports (tree-shakeable)

```tsx
import { LuActivity }       from '@fluixi/icons-jsx/lucide'
import { BiAlarm }          from '@fluixi/icons-jsx/bootstrap'
import { TrAccessible }     from '@fluixi/icons-jsx/tabler/filled'
import { HiOutlineHome }    from '@fluixi/icons-jsx/heroicons/24/outline'
import { HiSolidHome }      from '@fluixi/icons-jsx/heroicons/24/solid'
import { FaSolidUser }      from '@fluixi/icons-jsx/font-awesome/solid'
import { MdFilledHome }     from '@fluixi/icons-jsx/material-design/filled'
import { PhHouse }          from '@fluixi/icons-jsx/phosphor/regular'
import { RiHomeLine }       from '@fluixi/icons-jsx/remix'
import { IoHome }           from '@fluixi/icons-jsx/iconoir/regular'

export const MyComponent = () => (
  <div>
    <LuActivity />
    <BiAlarm size={32} />
  </div>
)
```

### Direct per-icon imports

Because every icon is its own file, you can import a single icon directly —
the smallest possible footprint, no barrel needed:

```tsx
import BiAlarm from '@fluixi/icons-jsx/bootstrap/alarm'
import LuActivity from '@fluixi/icons-jsx/lucide/activity'
import TrAccessible from '@fluixi/icons-jsx/tabler/filled/accessible'
```

### Props

Every icon component accepts these props plus any SVG attribute:

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `number \| string` | `"1em"` | Sets both `width` and `height` |
| `color` | `string` | inherited | maps to CSS `currentColor` |
| `className` | `string` | — | CSS class |
| `style` | `object` | — | Inline styles |
| `onClick` | `function` | — | Click handler |
| `...rest` | any SVG attr | — | Spread onto the `<svg>` element |

`size` is overridden by explicit `width`/`height` props if both are provided.
Types come from the shared `IconProps` interface (`@fluixi/icons-jsx/types`),
which has no React dependency.

### Examples

```tsx
// Default size (1em — scales with font-size)
<LuActivity />

// Pixel size
<LuActivity size={24} />

// Override color via CSS currentColor
<LuActivity style={{ color: 'blue' }} />

// Or via stroke/fill directly
<LuActivity stroke="red" fill="none" />

// Custom class
<LuActivity className="icon icon-sm" />

// Accessibility
<LuActivity aria-label="Activity" role="img" />

// Click handler
<LuActivity onClick={() => console.log('clicked')} />
```

---

## Available sets and subpaths

| Subpath | Prefix | Example |
|---|---|---|
| `@fluixi/icons-jsx/lucide` | `Lu` | `LuActivity` |
| `@fluixi/icons-jsx/bootstrap` | `Bi` | `BiAlarm` |
| `@fluixi/icons-jsx/tabler/filled` | `Tr` | `TrAccessible` |
| `@fluixi/icons-jsx/tabler/outline` | `Tr` | `TrHome` |
| `@fluixi/icons-jsx/heroicons/24/outline` | `Hi` | `HiOutlineHome` |
| `@fluixi/icons-jsx/heroicons/24/solid` | `Hi` | `HiSolidHome` |
| `@fluixi/icons-jsx/heroicons/16/solid` | `Hi` | `Hi16SolidHome` |
| `@fluixi/icons-jsx/heroicons/20/solid` | `Hi` | `Hi20SolidHome` |
| `@fluixi/icons-jsx/font-awesome/solid` | `Fa` | `FaSolidUser` |
| `@fluixi/icons-jsx/font-awesome/regular` | `Fa` | `FaRegularUser` |
| `@fluixi/icons-jsx/font-awesome/brands` | `Fa` | `FaBrandsGithub` |
| `@fluixi/icons-jsx/material-design/filled` | `Md` | `MdFilledHome` |
| `@fluixi/icons-jsx/material-design/outlined` | `Md` | `MdOutlinedHome` |
| `@fluixi/icons-jsx/material-design/round` | `Md` | `MdRoundHome` |
| `@fluixi/icons-jsx/material-design/sharp` | `Md` | `MdSharpHome` |
| `@fluixi/icons-jsx/material-design/two-tone` | `Md` | `MdTwoToneHome` |
| `@fluixi/icons-jsx/phosphor/regular` | `Ph` | `PhHouse` |
| `@fluixi/icons-jsx/phosphor/fill` | `Ph` | `PhHouseFill` |
| `@fluixi/icons-jsx/phosphor/bold` | `Ph` | `PhHouseBold` |
| `@fluixi/icons-jsx/phosphor/light` | `Ph` | `PhHouseLight` |
| `@fluixi/icons-jsx/phosphor/thin` | `Ph` | `PhHouseThin` |
| `@fluixi/icons-jsx/phosphor/duotone` | `Ph` | `PhHouseDuotone` |
| `@fluixi/icons-jsx/remix` | `Ri` | `RiHomeLine` |
| `@fluixi/icons-jsx/iconoir/regular` | `Io` | `IoHome` |
| `@fluixi/icons-jsx/iconoir/solid` | `Io` | `IoHomeSolid` |

---

## TypeScript

All components are typed via the shared, framework-agnostic `IconProps`
interface. Your IDE autocompletes component names and props.

```tsx
import type { IconProps } from '@fluixi/icons-jsx/types'
import LuActivity from '@fluixi/icons-jsx/lucide/activity'

const MyIcon = (props: IconProps) => <LuActivity {...props} />
```

---

## Comparison with `@fluixi/icons`

| | `@fluixi/icons` | `@fluixi/icons-jsx` |
|---|---|---|
| Output | SVG string | JSX function component |
| Framework | None | Any JSX runtime (React/Preact/Solid) |
| Dependencies | None | None (React is an optional peer) |
| File layout | Barrel per set | One file per icon |
| Props / styling | Manual DOM | Component props |
| Use case | Any framework, Vanilla JS | JSX apps |
| Sprite | ✅ | ❌ |
| CDN / registry | ✅ | ❌ |
