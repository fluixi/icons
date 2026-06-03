# @fluixi/icons

SVG icon library with **9 icon sets**, **48 000+ icons**, available as:

- **Named SVG string exports** — tree-shakeable, framework-agnostic
- **SVG sprite sheets** — single file, use with `<use href="...#icon-id"/>`
- **Registry / CDN bundles** — self-registering web component bundles (IIFE)

For React JSX components see [`@fluixi/icons-jsx`](../icons-jsx).

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
pnpm add @fluixi/icons
# or
npm install @fluixi/icons
```

---

## SVG string imports

Each icon is exported as a plain SVG string. Imports are tree-shakeable —
only the icons you use are included in your bundle.

```ts
import { LuActivity }        from '@fluixi/icons/lucide'
import { BiAlarm }           from '@fluixi/icons/bootstrap'
import { TrAccessible }      from '@fluixi/icons/tabler/filled'
import { HiOutlineHome }     from '@fluixi/icons/heroicons/24/outline'
import { HiSolidHome }       from '@fluixi/icons/heroicons/24/solid'
import { FaSolidUser }       from '@fluixi/icons/font-awesome/solid'
import { FaRegularUser }     from '@fluixi/icons/font-awesome/regular'
import { FaBrandsGithub }    from '@fluixi/icons/font-awesome/brands'
import { MdFilledHome }      from '@fluixi/icons/material-design/filled'
import { MdOutlinedHome }    from '@fluixi/icons/material-design/outlined'
import { PhHouse }           from '@fluixi/icons/phosphor/regular'
import { PhHouseFill }       from '@fluixi/icons/phosphor/fill'
import { RiHomeLine }        from '@fluixi/icons/remix'
import { IoHome }            from '@fluixi/icons/iconoir/regular'

// render it
document.getElementById('icon').innerHTML = LuActivity;
```

The value is a raw SVG string:
```html
<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
</svg>
```

---

## SVG sprites

Use a sprite sheet to avoid loading thousands of individual icon files.

### In HTML (static / CDN)

```html
<!-- Invisible sprite container -->
<svg style="display:none">
  <!-- include the sprite inline or via a build tool -->
</svg>

<!-- Reference any icon by id -->
<svg width="24" height="24">
  <use href="/sprites/lucide-sprite.svg#activity"/>
</svg>
```

### Via the package exports

```js
// Get the sprite file path (works with bundlers that handle asset imports)
import spritePath from '@fluixi/icons/lucide/sprite.svg'

const el = document.createElement('img')
el.src = spritePath  // or reference inline
```

### Manifest lookup

```ts
import manifest from '@fluixi/icons/lucide/manifest.json' assert { type: 'json' }
// manifest['activity'] → '0 0 24 24'   (viewBox string)
```

---

## Registry / CDN bundles

Each set ships a standalone IIFE bundle that self-registers web components.
Load one at runtime to register all icons from that set as custom elements.

### Via `<script>` tag (CDN)

```html
<!-- Lucide icons only -->
<script src="https://cdn.example.com/@fluixi/icons/lucide/cdn.js"></script>

<!-- All icon sets -->
<script src="https://cdn.example.com/@fluixi/icons/all/cdn.js"></script>
```

### Via import (self-registers on load)

```ts
import '@fluixi/icons/lucide/registry'    // registers all Lucide web components
import '@fluixi/icons/bootstrap/registry' // registers all Bootstrap icon web components
```

---

## Available sets and subpaths

| Subpath | Icons | License |
|---|---|---|
| `@fluixi/icons/lucide` | 1 714 | ISC |
| `@fluixi/icons/bootstrap` | 2 078 | MIT |
| `@fluixi/icons/heroicons` | 1 288 (all sizes) | MIT |
| `@fluixi/icons/heroicons/24/outline` | 292 | MIT |
| `@fluixi/icons/heroicons/24/solid` | 292 | MIT |
| `@fluixi/icons/heroicons/16/solid` | 292 | MIT |
| `@fluixi/icons/heroicons/20/solid` | 292 | MIT |
| `@fluixi/icons/tabler/filled` | 1 003 | Apache-2.0 |
| `@fluixi/icons/tabler/outline` | 5 143 | Apache-2.0 |
| `@fluixi/icons/font-awesome/solid` | ~1 400 | MIT |
| `@fluixi/icons/font-awesome/regular` | ~165 | MIT |
| `@fluixi/icons/font-awesome/brands` | ~400 | CC-BY 4.0 |
| `@fluixi/icons/material-design/filled` | 2 150 | Apache-2.0 |
| `@fluixi/icons/material-design/outlined` | 2 150 | Apache-2.0 |
| `@fluixi/icons/material-design/round` | 2 150 | Apache-2.0 |
| `@fluixi/icons/material-design/sharp` | 2 150 | Apache-2.0 |
| `@fluixi/icons/material-design/two-tone` | 2 150 | Apache-2.0 |
| `@fluixi/icons/phosphor/regular` | 1 512 | MIT |
| `@fluixi/icons/phosphor/fill` | 1 512 | MIT |
| `@fluixi/icons/phosphor/bold` | 1 512 | MIT |
| `@fluixi/icons/phosphor/light` | 1 512 | MIT |
| `@fluixi/icons/phosphor/thin` | 1 512 | MIT |
| `@fluixi/icons/phosphor/duotone` | 1 512 | MIT |
| `@fluixi/icons/remix` | 3 229 | Apache-2.0 |
| `@fluixi/icons/iconoir/regular` | 1 337 | MIT |
| `@fluixi/icons/iconoir/solid` | 334 | MIT |

Each subpath also provides:
- `{subpath}/sprite.svg` — SVG sprite sheet
- `{subpath}/manifest.json` — `{ "icon-id": "viewBox" }` lookup
- `{subpath}/registry` — self-registering web component bundle
- `{subpath}/cdn` — same as registry, aliased for CDN use

---

## React JSX components

For typed React components use `@fluixi/icons-jsx`:

```tsx
import { LuActivity } from '@fluixi/icons-jsx/lucide'
import { BiAlarm }    from '@fluixi/icons-jsx/bootstrap'

export const MyPage = () => (
  <>
    <LuActivity size={32} color="blue" />
    <BiAlarm className="icon" />
  </>
)
```

See [`@fluixi/icons-jsx`](../icons-jsx) for details.
