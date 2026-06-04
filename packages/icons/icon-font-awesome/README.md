<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/icon-fontawesome

**Font Awesome Free as SVG data for the Fluixi icon system — 2,900+ icons.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![Icon license](https://img.shields.io/badge/icons-CC--BY%204.0-8b5cf6)
![Icons](https://img.shields.io/badge/icons-2%2C900%2B-ec4899)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)

---

## ✨ Overview

`@fluixi/icon-fontawesome` is the **Font Awesome Free** data package for the Fluixi icon system. It ships the raw SVG/icon data that powers the ergonomic umbrella packages. Source artwork: [Font Awesome Free](https://fontawesome.com) (licensed **CC-BY 4.0**).

Variants: `solid` · `regular` · `brands`

> **Most users want the umbrella packages instead**, which provide tree-shakeable named exports, sprites, and CDN bundles:
>
> - **SVG strings / sprites / CDN** → [`@fluixi/icons`](../../icons-api) — `import { FaHome } from '@fluixi/icons/font-awesome/solid'`
> - **JSX components** → [`@fluixi/icons-jsx`](../../icons-jsx) — `import { FaHome } from '@fluixi/icons-jsx/font-awesome/solid'`

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/icon-fontawesome
```

## 📋 License

This package's code is [MIT](./LICENSE). The **Font Awesome Free** artwork is licensed
**CC-BY 4.0** by its authors — see [https://fontawesome.com](https://fontawesome.com).

<sub>Part of the <a href="../../../README.md">Fluixi Icons</a> monorepo.</sub>
