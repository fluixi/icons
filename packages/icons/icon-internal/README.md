<div align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="120" height="120" />

  <h1>@fluixi/icon-internal</h1>

  <p><strong>Internal Fluixi Icons as SVG data for the Fluixi icon system — 245 icons.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="Icon license" src="https://img.shields.io/badge/icons-MIT-8b5cf6" />
    <img alt="Icons" src="https://img.shields.io/badge/icons-245-ec4899" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github" />
  </p>
</div>

---

## ✨ Overview

`@fluixi/icon-internal` is the **Internal Fluixi Icons** data package for the Fluixi icon system. It ships the raw SVG/icon data that powers the ergonomic umbrella packages. Source artwork: [Internal Fluixi Icons](https://fluixi.dev) (licensed **MIT**).

Variants: `filled` · `outline`

> **Most users want the umbrella packages instead**, which provide tree-shakeable named exports, sprites, and CDN bundles:
>
> - **SVG strings / sprites / CDN** → [`@fluixi/icons`](../../icons-api) — `import { AdfHome } from '@fluixi/icons/internal/filled'`
> - **JSX components** → [`@fluixi/icons-jsx`](../../icons-jsx) — `import { AdfHome } from '@fluixi/icons-jsx/internal/filled'`

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/icon-internal
```

## 📋 License

This package's code is [MIT](./LICENSE). The **Internal Fluixi Icons** artwork is licensed
**MIT** by its authors — see [https://fluixi.dev](https://fluixi.dev).

<sub>Part of the <a href="../../../README.md">Fluixi Icons</a> monorepo.</sub>
