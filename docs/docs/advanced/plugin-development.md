# Plugin Development Guide

Bunup provides a flexible plugin system that allows you to extend its functionality to meet your specific needs. This guide will walk you through the process of creating your own plugins for Bunup.

## Plugin Types

Bunup supports two types of plugins:

1. **Bun Plugins** - Native Bun plugins that are passed directly to the underlying `Bun.build` configuration
2. **Bunup Plugins** - Custom plugins specifically designed for Bunup with lifecycle hooks

## Creating a Bun Plugin

Bun plugins work with Bun's native bundler and are passed directly to the `Bun.build` configuration. These plugins can be used to modify how modules are resolved, transformed, and loaded.

```ts
import type { BunPlugin } from "bun";

const myBunPlugin = (): BunPlugin => {
  return {
    name: "my-bun-plugin",
    setup(build) {
      build.onLoad({ filter: /\.txt$/ }, async (args) => {
        const text = await Bun.file(args.path).text();
        return {
          contents: `export default ${JSON.stringify(text)}`,
          loader: "js",
        };
      });
    },
  };
};

export default myBunPlugin;
```

To use this plugin in Bunup, simply pass it directly to the plugins array:

```ts
import { defineConfig } from "bunup";
import myBunPlugin from "./my-bun-plugin";

export default defineConfig({
  entry: "src/index.ts",
  format: ["esm", "cjs"],
  plugins: [
    myBunPlugin()
  ]
});
```

For more information about creating Bun plugins, see the [Bun plugin documentation](https://bun.sh/docs/bundler/plugins).

## Creating a Bunup Plugin

Bunup plugins provide additional hooks into the build process beyond what Bun's native plugin system offers. These plugins can be used to extend Bunup's functionality with custom build steps, reporting, and more.

```ts
import type { BunupPlugin, BuildOptions, BuildContext } from "bunup";

export function myBunupPlugin(): BunupPlugin {
  return {
    name: "my-bunup-plugin",
    hooks: {
      onBuildStart: async (options: BuildOptions) => {
        console.log("Starting build with options:", options);
        options.banner = "/* Built with my plugin */";
      },

      onBuildDone: async ({ options, output, meta }: BuildContext) => {
        console.log("Build completed with files:", output.files.length);
        console.log("Package name:", meta.packageJson.data?.name);
        
        for (const file of output.files) {
          console.log(`Generated: ${file.pathRelativeToOutdir} (${file.kind})`);
        }
      }
    }
  };
}
```

This example demonstrates both available hooks:

| Hook | Purpose | Capabilities |
|------|---------|-------------|
| `onBuildStart` | Runs before the build starts | Setup tasks, modify build options |
| `onBuildDone` | Runs after the build completes | Access build output, post-processing, reporting |

To use this plugin in Bunup:

```ts
import { defineConfig } from "bunup";
import { myBunupPlugin } from "./my-bunup-plugin";

export default defineConfig({
  entry: "src/index.ts",
  format: ["esm", "cjs"],
  plugins: [
    myBunupPlugin()
  ]
});
```

## Mixing Plugin Types

You can use both Bun plugins and Bunup plugins together:

```ts
import { defineConfig } from "bunup";
import { copy, exports } from "bunup/plugins";
import { myBunupPlugin } from "./my-bunup-plugin";
import bunTailwindPlugin from "bun-plugin-tailwind";

export default defineConfig({
  entry: "src/index.ts",
  format: ["esm", "cjs"],
  plugins: [
    bunTailwindPlugin,
    myBunupPlugin(),
    copy("assets/**/*"),
    exports()
  ]
});
```

## Available Hooks

Bunup plugins support the following hooks:

### `onBuildStart`

Called before a build starts, allowing you to perform setup or preprocessing tasks.

```ts
onBuildStart: (options: BuildOptions) => Promise<void> | void
```

- `options`: The build options configured for this build. You can modify these options to affect the build process.

### `onBuildDone`

Called after a build is successfully completed, providing access to the build output.

```ts
onBuildDone: (ctx: BuildContext) => Promise<void> | void
```

Where `BuildContext` contains:
- `options`: The build options that were used for the build
- `output`: Information about the generated files
- `meta`: Metadata about the build, including package.json and root directory

## BuildContext Details

The `BuildContext` object provides comprehensive information about the build:

### `BuildContext.output`

The `output` object contains an array of `BuildOutputFile` objects:

```ts
type BuildOutputFile = {
  entrypoint: string | undefined;
  kind: 'entry-point' | 'chunk' | 'asset' | 'sourcemap'
  fullPath: string;
  pathRelativeToRootDir: string;
  pathRelativeToOutdir: string;
  dts: boolean;
  format: Format;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `entrypoint` | `string \| undefined` | Entry point that generated this file (undefined for chunks/assets) |
| `kind` | `'entry-point' \| 'chunk' \| 'asset' \| 'sourcemap'` | Type of generated file |
| `fullPath` | `string` | Absolute path to the generated file |
| `pathRelativeToRootDir` | `string` | Path relative to project root |
| `pathRelativeToOutdir` | `string` | Path relative to output directory |
| `dts` | `boolean` | Whether this is a TypeScript declaration file |
| `format` | `Format` | Output format (esm, cjs, etc.) |

### `BuildContext.meta`

The `meta` object contains build metadata:

```ts
type BuildMeta = {
  packageJson: PackageJson;
  rootDir: string;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `packageJson` | `PackageJson` | Parsed package.json content that is used for the build |
| `rootDir` | `string` | Root directory of the project |

## Error Handling

Plugins should handle errors gracefully. If a plugin hook throws an error, the build will fail:

```ts
export function robustPlugin(): BunupPlugin {
  return {
    name: "robust-plugin",
    hooks: {
      onBuildDone: async ({ output }) => {
        try {
          await processFiles(output.files);
        } catch (error) {
          console.error("Plugin failed:", error);
          throw new Error(`robust-plugin failed: ${error.message}`);
        }
      }
    }
  };
}
```

## Example: Bundle Size Reporter Plugin

```ts
export function bundleSizeReporter(maxSize?: number): BunupPlugin {
  return {
    name: "bundle-size-reporter",
    hooks: {
      onBuildDone: async ({ output }) => {
        const sizes = await Promise.all(
          output.files
            .filter(f => f.kind === 'entry-point')
            .map(async (file) => {
              const buffer = await Bun.file(file.fullPath).arrayBuffer();
              return {
                path: file.pathRelativeToOutdir,
                size: buffer.byteLength,
                format: file.format
              };
            })
        );

        console.log("\n📦 Bundle Sizes:");
        for (const { path, size, format } of sizes) {
          const sizeKB = (size / 1024).toFixed(2);
          console.log(`  ${path} (${format}): ${sizeKB} KB`);
          
          if (maxSize && size > maxSize) {
            throw new Error(`Bundle ${path} exceeds maximum size of ${maxSize} bytes`);
          }
        }
      }
    }
  };
}
```

## Publishing Plugins

If you've created a useful plugin for Bunup, consider publishing it as an npm package 
for others to use. Use a naming convention like `bunup-plugin-*` to make it easily 
discoverable.
