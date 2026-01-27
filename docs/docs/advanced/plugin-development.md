# Plugin Development Guide

This guide walks you through creating custom Bunup plugins with lifecycle hooks. For an overview of the plugin system and using Bun plugins, see the [Plugins guide](/docs/guide/plugins).

## Creating a Bunup Plugin

Bunup plugins provide additional hooks into the build process beyond what Bun's native plugin system offers. These plugins can be used to extend Bunup's functionality with custom build steps, reporting, and more.

```ts
import type { BunupPlugin } from "bunup";

export function myBunupPlugin(): BunupPlugin {
	return {
		name: "my-bunup-plugin",
		hooks: {
			onBuildStart: async (ctx) => {
				console.log("Starting build with options:", ctx.options);
				ctx.options.banner = "/* Built with my plugin */";
			},

			onBuildDone: async (ctx) => {
				const { files, options, meta } = ctx;
				console.log("Build completed with files:", files.length);
				console.log("Package name:", meta.packageJson.data?.name);

				for (const file of files) {
					console.log(`Generated: ${file.pathRelativeToOutdir} (${file.kind})`);
				}
			},
		},
	};
}
```

This example demonstrates both available hooks:

| Hook           | Purpose                        | Capabilities                                    |
| -------------- | ------------------------------ | ----------------------------------------------- |
| `onBuildStart` | Runs before the build starts   | Setup tasks, modify build options               |
| `onBuildDone`  | Runs after the build completes | Access build output, post-processing, reporting |

To use this plugin:

```ts
import { defineConfig } from "bunup";
import { myBunupPlugin } from "./my-bunup-plugin";

export default defineConfig({
	entry: "src/index.ts",
	format: ["esm", "cjs"],
	plugins: [myBunupPlugin()],
});
```

## Available Hooks

Bunup plugins support the following hooks:

### `onBuildStart`

Called before a build starts, allowing you to perform setup or preprocessing tasks.

```ts
onBuildStart: (ctx: OnBuildStartCtx) => Promise<void> | void
```

- `ctx.options`: The build options that will be used for this build. You can modify these options to affect the build process.

### `onBuildDone`

Called after a build is successfully completed, providing access to the build result.

```ts
onBuildDone: (ctx: OnBuildDoneCtx) => Promise<void> | void
```

Where `OnBuildDoneCtx` contains:

- `files`: Array of generated output files
- `options`: The build configuration options that were used
- `meta`: Build execution metadata (package.json and root directory)

## OnBuildDoneCtx Details

The `OnBuildDoneCtx` provides comprehensive information about the build with a flattened structure for easy access:

### `files`

The `files` property is an array of `BuildOutputFile` objects representing all generated output files:

```ts
type BuildOutputFile = {
	entrypoint: string | undefined;
	kind: "entry-point" | "chunk" | "asset" | "sourcemap" | "bytecode";
	fullPath: string;
	pathRelativeToRootDir: string;
	pathRelativeToOutdir: string;
	dts: boolean;
	format: Format;
	size: number;
};
```

| Property                | Type                                                 | Description                                                        |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `entrypoint`            | `string \| undefined`                                | Entry point that generated this file (undefined for chunks/assets) |
| `kind`                  | `'entry-point' \| 'chunk' \| 'asset' \| 'sourcemap'` | Type of generated file                                             |
| `fullPath`              | `string`                                             | Absolute path to the generated file                                |
| `pathRelativeToRootDir` | `string`                                             | Path relative to project root                                      |
| `pathRelativeToOutdir`  | `string`                                             | Path relative to output directory                                  |
| `dts`                   | `boolean`                                            | Whether this is a TypeScript declaration file                      |
| `format`                | `Format`                                             | Output format (esm, cjs, etc.)                                     |
| `size`                  | `number`                                             | The size of the file in bytes                                      |

### `meta`

The `meta` object contains build metadata:

```ts
type BuildMeta = {
	packageJson: PackageJson;
	rootDir: string;
};
```

| Property      | Type          | Description                                            |
| ------------- | ------------- | ------------------------------------------------------ |
| `packageJson` | `PackageJson` | Parsed package.json content that is used for the build |
| `rootDir`     | `string`      | Root directory of the project                          |

## Error Handling

Plugins should handle errors gracefully. If a plugin hook throws an error, the build will fail:

```ts
export function robustPlugin(): BunupPlugin {
	return {
		name: "robust-plugin",
		hooks: {
			onBuildDone: async ({ files }) => {
				try {
					await processFiles(files);
				} catch (error) {
					console.error("Plugin failed:", error);
					throw new Error(`robust-plugin failed: ${error.message}`);
				}
			},
		},
	};
}
```

## Example: Bundle Size Reporter Plugin

```ts
export function bundleSizeReporter(maxSize?: number): BunupPlugin {
	return {
		name: "bundle-size-reporter",
		hooks: {
			onBuildDone: async ({ files }) => {
				const sizes = await Promise.all(
					files
						.filter((f) => f.kind === "entry-point")
						.map(async (file) => {
							const buffer = await Bun.file(file.fullPath).arrayBuffer();
							return {
								path: file.pathRelativeToOutdir,
								size: buffer.byteLength,
								format: file.format,
							};
						}),
				);

				console.log("\n📦 Bundle Sizes:");
				for (const { path, size, format } of sizes) {
					const sizeKB = (size / 1024).toFixed(2);
					console.log(`  ${path} (${format}): ${sizeKB} KB`);

					if (maxSize && size > maxSize) {
						throw new Error(`Bundle ${path} exceeds maximum size of ${maxSize} bytes`);
					}
				}
			},
		},
	};
}
```
