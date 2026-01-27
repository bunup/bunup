# Config File

Centralize your build settings with a configuration file when CLI options aren't enough.

## Getting Started

Create a `bunup.config.ts` file in your project root:

```ts [bunup.config.ts]
import { defineConfig } from "bunup";

export default defineConfig({
	// ...your configuration options go here
});
```

This is the simplest way to centralize and reuse your build configuration. See [Options](/docs/guide/options) for all the available options.

## Multiple Configurations

Bunup supports exporting an **array of configurations**, useful when you want to build for multiple environments or formats in a single run.

::: info Named Configurations
When using an array of configurations, the `name` property is **required** for each configuration to identify the builds in logs and reports.
:::

```ts [bunup.config.ts]
export default defineConfig([
	{
		entry: "src/index.ts",
		name: "node",
		format: "esm",
		target: "node",
	},
	{
		entry: "src/browser.ts",
		name: "browser",
		format: ["esm", "iife"],
		target: "browser",
		outDir: "dist/browser",
	},
]);
```

With this setup, Bunup will build both Node.js and browser bundles.

**Another example:** if you have different entry points that need different build configurations, you can specify them separately. For instance, your main module might need both ESM and CJS formats, while a CLI entry point might only need ESM:

```ts [bunup.config.ts]
export default defineConfig([
	{
		entry: "src/index.ts",
		name: "main",
		format: ["esm", "cjs"],
	},
	{
		entry: "src/cli.ts",
		name: "cli",
		format: ["esm"],
	},
	{
		entry: "src/browser.ts",
		name: "browser",
		format: ["esm", "iife"],
		outDir: "dist/browser",
	},
]);
```

## Filtering Configurations

When you have multiple configurations in an array, you can use the `--filter` option to build only specific configurations by name:

```sh [CLI]
# Single
bunup --filter main

# Multiple
bunup --filter main,browser
```

Only the configurations matching these names will be built - perfect for testing specific builds without running the entire suite.

## Custom Configuration Path

If you need to use a configuration file with a non-standard name or location, you can specify its path using the `--config` CLI option:

::: code-group

```sh [CLI]
bunup --config ./configs/custom.bunup.config.ts
# or using alias
bunup -c ./configs/custom.bunup.config.ts
```

:::

This allows you to keep your configuration files organized in custom locations or use different configuration files for different environments.

## Disabling Configuration Files

To explicitly disable config file usage and rely only on CLI options:

```sh [CLI]
bunup --no-config
```
