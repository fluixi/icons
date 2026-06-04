<div align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="120" height="120" />

  <h1>@fluixi/icon-iconoir</h1>

  <p><strong>Iconoir as SVG data for the Fluixi icon system — 1,600+ icons.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="Icon license" src="https://img.shields.io/badge/icons-MIT-8b5cf6" />
    <img alt="Icons" src="https://img.shields.io/badge/icons-1%2C600%2B-ec4899" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github" />
  </p>
</div>

---

## ✨ Overview

`@fluixi/icon-iconoir` is the **Iconoir** data package for the Fluixi icon system. It ships the raw SVG/icon data that powers the ergonomic umbrella packages. Source artwork: [Iconoir](https://iconoir.com) (licensed **MIT**).

Variants: `regular` · `solid`

> **Most users want the umbrella packages instead**, which provide tree-shakeable named exports, sprites, and CDN bundles:
>
> - **SVG strings / sprites / CDN** → [`@fluixi/icons`](../../icons-api) — `import { IoHome } from '@fluixi/icons/iconoir/regular'`
> - **JSX components** → [`@fluixi/icons-jsx`](../../icons-jsx) — `import { IoHome } from '@fluixi/icons-jsx/iconoir/regular'`

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/icon-iconoir
```

## 📋 License

This package's code is [MIT](./LICENSE). The **Iconoir** artwork is licensed
**MIT** by its authors — see [https://iconoir.com](https://iconoir.com).

<sub>Part of the <a href="../../../README.md">Fluixi Icons</a> monorepo.</sub>
