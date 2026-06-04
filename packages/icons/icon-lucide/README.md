<div align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="120" height="120" />

  <h1>@fluixi/icon-lucide</h1>

  <p><strong>Lucide Icons as SVG data for the Fluixi icon system — 1,700+ icons.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="Icon license" src="https://img.shields.io/badge/icons-ISC-8b5cf6" />
    <img alt="Icons" src="https://img.shields.io/badge/icons-1%2C700%2B-ec4899" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github" />
  </p>
</div>

---

## ✨ Overview

`@fluixi/icon-lucide` is the **Lucide Icons** data package for the Fluixi icon system. It ships the raw SVG/icon data that powers the ergonomic umbrella packages. Source artwork: [Lucide Icons](https://lucide.dev) (licensed **ISC**).

> **Most users want the umbrella packages instead**, which provide tree-shakeable named exports, sprites, and CDN bundles:
>
> - **SVG strings / sprites / CDN** → [`@fluixi/icons`](../../icons-api) — `import { LuHome } from '@fluixi/icons/lucide'`
> - **JSX components** → [`@fluixi/icons-jsx`](../../icons-jsx) — `import { LuHome } from '@fluixi/icons-jsx/lucide'`

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/icon-lucide
```

## 📋 License

This package's code is [MIT](./LICENSE). The **Lucide Icons** artwork is licensed
**ISC** by its authors — see [https://lucide.dev](https://lucide.dev).

<sub>Part of the <a href="../../../README.md">Fluixi Icons</a> monorepo.</sub>
