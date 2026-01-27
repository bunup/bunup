<!-- markdownlint-disable first-line-h1 -->

<!-- markdownlint-start-capture -->
<!-- markdownlint-disable-file no-inline-html -->
<div align="center">

  <!-- markdownlint-disable-next-line no-alt-text -->

![Logo](/docs/public/logo.svg)

![Bunup](/assets/bunup-title.svg)

[![NPM Version](https://img.shields.io/npm/v/bunup?logo=npm&logoColor=212121&label=version&labelColor=ffc44e&color=212121)](https://npmjs.com/package/bunup)
[![Built with Bun](https://img.shields.io/badge/Built_with-Bun-fbf0df?logo=bun&labelColor=212121)](https://bun.com)
[![sponsor](https://img.shields.io/badge/sponsor-EA4AAA?logo=githubsponsors&labelColor=FAFAFA)](https://github.com/sponsors/arshad-yaseen)

Bunup helps you ship TypeScript/React libraries faster with great DX — built on [Bun](https://bun.com)'s native bundler.

</div>
<!-- markdownlint-restore -->

## Performance

Instant builds by design. With Bun’s native speed, builds and rebuilds are extremely quick, even in monorepos. Faster feedback loops, higher productivity, calmer flow.

## 🚀 Quick Start

Create a TypeScript file:

```ts
// src/index.ts
export function greet(name: string): string {
	return `Hello, ${name}!`;
}
```

Build it instantly:

```bash
bunx bunup
```

Outputs to `dist/` with ESM and `.d.ts` types.

Need CommonJS too?

```bash
bunx bunup --format esm,cjs
```

Want to generate and sync package exports automatically?

```bash
bunx bunup --exports
```

## Scaffold

Spin up a modern, ready-to-publish TypeScript or React component library (or a basic starter) in ~10 seconds:

```bash
bunx @bunup/cli@latest create
```

See more in [Scaffold with Bunup](https://bunup.dev/docs/scaffold-with-bunup).

## Features

- ⚡ **Instant builds** — lightning-fast by default
- 🎨 **CSS support out of the box** — import CSS directly, with built-in CSS Modules support.
- 📝 **TypeScript declarations** — clean, accurate `.d.ts` files
- 🪓 **[Declaration splitting](https://bunup.dev/docs/guide/typescript-declarations#declaration-splitting)** — smaller, cleaner type bundles
- 🔋 **Batteries included** — auto-exports, unused dependency detection, and more
- 🏗️ **[Workspace-ready](https://bunup.dev/docs/guide/workspaces)** — build multiple packages from one config and one command

For more, see the full documentation: https://bunup.dev

## 📚 Examples

Check out the [examples directory](./examples) for example usage:

- [Simple TypeScript library](./examples/basic)
- [Workspace with multiple packages](./examples/basic-monorepo)
- [React component library styled with plain CSS](./examples/react-with-pure-css)
- [React component library styled with CSS Modules](./examples/react-with-css-modules)
- [React component library styled with Tailwind CSS](./examples/react-with-tailwindcss)

## ❤️ Contributing

We welcome contributions! Please read the [contributing guide](CONTRIBUTING.md).

![Contributors](https://contributors-table.vercel.app/image?repo=bunup/bunup&width=50&columns=15)

<div align="center">

  <img src="https://cdn.jsdelivr.net/gh/arshad-yaseen/static/sponsors.svg" alt="Sponsors" />

<br /><br />

  <img src="assets/cat-footer.svg" alt="______ 🐈‍⬛ _____________" />

</div>
