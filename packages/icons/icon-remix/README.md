<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/icon-remix

**Remix Icon as SVG data for the Fluixi icon system — 3,200+ icons.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![Icon license](https://img.shields.io/badge/icons-Apache--2.0-8b5cf6)
![Icons](https://img.shields.io/badge/icons-3%2C200%2B-ec4899)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)

---

## ✨ Overview

`@fluixi/icon-remix` is the **Remix Icon** data package for the Fluixi icon system. It ships the raw SVG/icon data that powers the ergonomic umbrella packages. Source artwork: [Remix Icon](https://remixicon.com) (licensed **Apache-2.0**).

> **Most users want the umbrella packages instead**, which provide tree-shakeable named exports, sprites, and CDN bundles:
>
> - **SVG strings / sprites / CDN** → [`@fluixi/icons`](../../icons-api) — `import { RiHome } from '@fluixi/icons/remix'`
> - **JSX components** → [`@fluixi/icons-jsx`](../../icons-jsx) — `import { RiHome } from '@fluixi/icons-jsx/remix'`

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/icon-remix
```

## 📋 License

This package's code is [MIT](./LICENSE). The **Remix Icon** artwork is licensed
**Apache-2.0** by its authors — see [https://remixicon.com](https://remixicon.com).

<sub>Part of the <a href="../../../README.md">Fluixi Icons</a> monorepo.</sub>
