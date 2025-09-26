# Introduction

Bunup is the ⚡️ **blazing-fast build tool** for TypeScript libraries, designed for flawless developer experience and speed, **powered by Bun**.

## Performance

**Bunup** delivers instant builds by design. With Bun's native speed, builds and rebuilds are extremely quick, even in monorepos. See [benchmarks](https://gugustinette.github.io/bundler-benchmark/).

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

## Quick Start

Quickly scaffold a new modern TypeScript or React library with Bunup in just 10 seconds.

```sh
bunx @bunup/cli@latest create
```

See the [Scaffold with Bunup](./docs/scaffold-with-bunup.md) page for more details.

Or, initialize bunup in an existing project:

```sh
bunx @bunup/cli@latest init
```

## Getting Started

Get started with Bunup in seconds - install, configure, and build your TypeScript projects with minimal setup.

### Basic Usage

Create a TypeScript file:

```typescript [src/index.ts]
export function greet(name: string): string {
	return `Hello, ${name}!`;
}
```

Bundle it with bunup:

```sh
bunx bunup src/index.ts
```

That's it! This creates bundled output in the `dist` directory in ESM format (the default), plus TypeScript declaration files (`.d.ts`), since the entry point is a TypeScript file and has exports.

### Using with package.json

First, install bunup as a dev dependency:

```sh
bun add --dev bunup
```

Add a build script to your `package.json`:

```json [package.json]
{
	"name": "my-package",
	"scripts": {
		"build": "bunup src/index.ts"
	}
}
```

Then run:

```sh
bun run build
```

## Configuration

While most build options can be set directly via the CLI, you'll want to use a configuration file if you need to add plugins or perform advanced tasks, such as running a custom operation after a successful build.

To do this, create a `bunup.config.ts` file in your project root.

For example, you can use the [exports](/docs/plugins/exports) plugin to automatically keep your `package.json` exports in sync on every build, eliminating the need for manual export management.

```typescript [bunup.config.ts]
import { defineConfig } from 'bunup';
import { exports } from 'bunup/plugins';

export default defineConfig({
	entry: 'src/index.ts',
	plugins: [exports()],
});
```

You can also export an array of configurations:

```typescript [bunup.config.ts]
export default defineConfig([
	{
		name: 'node',
		entry: 'src/index.ts',
		format: 'esm',
		target: 'node',
	},
	{
		name: 'browser',
		entry: 'src/index.ts',
		format: ['esm', 'iife'],
		target: 'browser',
		outDir: "dist/browser",
	},
]);
```

### Custom Configuration Path

If you need to use a configuration file with a non-standard name or location, you can specify its path using the `--config` CLI option:

```sh
bunup --config ./configs/custom.bunup.config.ts
# or using alias
bunup -c ./configs/custom.bunup.config.ts
```

## Watch Mode

Bunup can watch your files for changes and rebuild automatically:

```sh
bunup src/index.ts --watch
```

Or in package.json:

```json [package.json] 5
{
	"name": "my-package",
	"scripts": {
		"build": "bunup src/index.ts",
		"dev": "bunup src/index.ts --watch"
	}
}
```

Then run:

```sh
bun run dev
```
