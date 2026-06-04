<div align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="120" height="120" />

  <h1>@fluixi/icon-bootstrap</h1>

  <p><strong>Bootstrap Icons as SVG data for the Fluixi icon system — 2,000+ icons.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="Icon license" src="https://img.shields.io/badge/icons-MIT-8b5cf6" />
    <img alt="Icons" src="https://img.shields.io/badge/icons-2%2C000%2B-ec4899" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github" />
  </p>
</div>

---

## ✨ Overview

`@fluixi/icon-bootstrap` is the **Bootstrap Icons** data package for the Fluixi icon system. It ships the raw SVG/icon data that powers the ergonomic umbrella packages. Source artwork: [Bootstrap Icons](https://icons.getbootstrap.com) (licensed **MIT**).

> **Most users want the umbrella packages instead**, which provide tree-shakeable named exports, sprites, and CDN bundles:
>
> - **SVG strings / sprites / CDN** → [`@fluixi/icons`](../../icons-api) — `import { BiHome } from '@fluixi/icons/bootstrap'`
> - **JSX components** → [`@fluixi/icons-jsx`](../../icons-jsx) — `import { BiHome } from '@fluixi/icons-jsx/bootstrap'`

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/icon-bootstrap
```

## 📋 License

This package's code is [MIT](./LICENSE). The **Bootstrap Icons** artwork is licensed
**MIT** by its authors — see [https://icons.getbootstrap.com](https://icons.getbootstrap.com).

<sub>Part of the <a href="../../../README.md">Fluixi Icons</a> monorepo.</sub>
