<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/icon-material-design

**Material Design Icons as SVG data for the Fluixi icon system — 10,700+ icons.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![Icon license](https://img.shields.io/badge/icons-Apache--2.0-8b5cf6)
![Icons](https://img.shields.io/badge/icons-10%2C700%2B-ec4899)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)

---

## ✨ Overview

`@fluixi/icon-material-design` is the **Material Design Icons** data package for the Fluixi icon system. It ships the raw SVG/icon data that powers the ergonomic umbrella packages. Source artwork: [Material Design Icons](https://fonts.google.com/icons) (licensed **Apache-2.0**).

Variants: `filled` · `outlined` · `round` · `sharp` · `two-tone`

> **Most users want the umbrella packages instead**, which provide tree-shakeable named exports, sprites, and CDN bundles:
>
> - **SVG strings / sprites / CDN** → [`@fluixi/icons`](../../icons-api) — `import { MdHome } from '@fluixi/icons/material-design/filled'`
> - **JSX components** → [`@fluixi/icons-jsx`](../../icons-jsx) — `import { MdHome } from '@fluixi/icons-jsx/material-design/filled'`

## 📦 Installation

```ini
# .npmrc
@fluixi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```sh
pnpm add @fluixi/icon-material-design
```

## 📋 License

This package's code is [MIT](./LICENSE). The **Material Design Icons** artwork is licensed
**Apache-2.0** by its authors — see [https://fonts.google.com/icons](https://fonts.google.com/icons).

<sub>Part of the <a href="../../../README.md">Fluixi Icons</a> monorepo.</sub>
