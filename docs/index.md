# Introduction

Bunup is the **blazing-fast build tool** for TypeScript libraries, designed for flawless developer experience and speed, **powered by Bun**.

## Performance

Instant builds by design even with type declarations. With Bun’s native speed, builds and rebuilds are extremely quick, even in monorepos. Faster feedback loops, higher productivity, calmer flow. See [benchmarks](https://gugustinette.github.io/bundler-benchmark/).

<div style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;" aria-hidden="false">
<table>
<thead>
<tr>
<th>Tool</th>
<th>Build Time (s)</th>
<th>Relative Speed</th>
</tr>
</thead>
<tbody>
<tr>
<td>bunup</td>
<td>0.37 s</td>
<td>baseline</td>
</tr>
<tr>
<td>tsdown</td>
<td>0.41 s</td>
<td>1.11× slower</td>
</tr>
<tr>
<td>rslib</td>
<td>1.41 s</td>
<td>3.81× slower</td>
</tr>
<tr>
<td>unbuild</td>
<td>3.19 s</td>
<td>8.62× slower</td>
</tr>
<tr>
<td>tsup</td>
<td>3.37 s</td>
<td>9.11× slower</td>
</tr>
</tbody>
</table>
</div>

## Scaffold

Spin up a modern, ready-to-publish TypeScript or React component library (or a basic starter) in ~10 seconds:

```sh
bunx @bunup/cli@latest create
```

See more in [Scaffold with Bunup](./docs/scaffold-with-bunup.md).

## Quick Start

Create a TypeScript file:

```ts [src/index.ts]
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

Build it instantly:

```sh
bunx bunup
```

Outputs to `dist/` with ESM and `.d.ts` types.

Need CommonJS too?

```sh
bunx bunup --format esm,cjs
```

Want to generate and sync package exports automatically?

```sh
bunx bunup --exports
```

### Using with package.json

First, install Bunup as a dev dependency:

```sh
bun add --dev bunup
```

Add a build script to your `package.json`:

```json [package.json]
{
  "name": "my-package",
  "scripts": {
    "build": "bunup"
  }
}
```

Then run:

```sh
bun run build
```

## Default Entry Points

Bunup automatically detects common entry points.

`index.ts`, `index.tsx`, `src/index.ts`, `src/index.tsx`, `cli.ts`, `src/cli.ts`, `src/cli/index.ts`

This is why simply running `bunx bunup` works out of the box.

For example, if your project has both `src/index.ts` and `src/cli.ts`, Bunup will build both automatically.

To override the default entry points or specify exactly which files to build, list them explicitly:

```sh
bunx bunup src/index.ts src/plugins.ts
```

See [Entry Points](/docs/guide/options#entry-points) for details.

## Watch Mode

Bunup can watch files for changes and rebuild automatically:

```sh
bunx bunup --watch
```

Or configure it in `package.json`:

```json [package.json] {5}
{
  "name": "my-package",
  "scripts": {
    "build": "bunup",
    "dev": "bunup --watch"
  }
}
```

Then run:

```sh
bun run dev
```

## Config File

While most options can be set directly via the CLI, and the CLI works well on its own, in some cases you will need to use a configuration file. This is useful when you want to use plugins, leverage Bunup [workspaces](/docs/guide/workspaces), target multiple environments with different configurations, or simply centralize your build settings.

See [Config File](/docs/guide/config-file) for details and [Options](/docs/guide/options) for all the available build options with side-by-side configuration and CLI examples.
