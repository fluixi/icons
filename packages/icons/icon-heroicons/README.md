<div align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="120" height="120" />

  <h1>@fluixi/icon-heroicons</h1>

  <p><strong>Heroicons as SVG data for the Fluixi icon system — 1,300+ icons.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="Icon license" src="https://img.shields.io/badge/icons-MIT-8b5cf6" />
    <img alt="Icons" src="https://img.shields.io/badge/icons-1%2C300%2B-ec4899" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github" />
  </p>
</div>

---

## ✨ Overview

`@fluixi/icon-heroicons` is the **Heroicons** data package for the Fluixi icon system. It ships the raw SVG/icon data that powers the ergonomic umbrella packages. Source artwork: [Heroicons](https://heroicons.com) (licensed **MIT**).

Variants: `16/solid` · `20/solid` · `24/outline` · `24/solid`

> **Most users want the umbrella packages instead**, which provide tree-shakeable named exports, sprites, and CDN bundles:
>
> - **SVG strings / sprites / CDN** → [`@fluixi/icons`](../../icons-api) — `import { HiHome } from '@fluixi/icons/heroicons/16/solid'`
> - **JSX components** → [`@fluixi/icons-jsx`](../../icons-jsx) — `import { HiHome } from '@fluixi/icons-jsx/heroicons/16/solid'`

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/icon-heroicons
```

## 📋 License

This package's code is [MIT](./LICENSE). The **Heroicons** artwork is licensed
**MIT** by its authors — see [https://heroicons.com](https://heroicons.com).

<sub>Part of the <a href="../../../README.md">Fluixi Icons</a> monorepo.</sub>
