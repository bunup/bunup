# Bunup Workspaces

Effortlessly manage **multiple packages in a monorepo** with Bunup’s built-in workspace support.

This eliminates the need for separate build configurations and multiple commands for each package. With a single configuration file and a single command, you can build all your packages at once.

## Creating a Workspace Configuration

Define your workspace using the `defineWorkspace` function:

```ts [bunup.config.ts]
import { defineWorkspace } from "bunup";

export default defineWorkspace([
  // Package configurations go here
]);
```

## Package Configuration

Each package requires three properties:

| Property | Type                           | Description                                                  |
| -------- | ------------------------------ | ------------------------------------------------------------ |
| `name`   | `string`                       | Unique identifier for the package                            |
| `root`   | `string`                       | Path to the package directory, relative to the monorepo root |
| `config` | `BunupConfig \| BunupConfig[]` | Optional build configuration(s) for this package             |

👉 If you omit `config`, Bunup will use **defaults**:

* ESM-only build
* One of the [default entry points](/#default-entry-points) (e.g. `src/index.ts`)

## Basic Usage

A minimal workspace with two packages:

```ts [bunup.config.ts]
import { defineWorkspace } from "bunup";

export default defineWorkspace([
  {
    name: "core",
    root: "packages/core",
    config: {
      // Bunup finds 'src/index.ts' by default
      // Or specify exactly which files to build
      // entry: ["src/index.ts", "src/plugins.ts"],
      format: ["esm", "cjs"],
    },
  },
  {
    name: "utils",
    root: "packages/utils",
    // Uses default entry: src/index.ts
    // Uses default format: esm
  },
]);
```

Here, **`core`** has custom formats, while **`utils`** works out of the box with defaults.

## Shared Options

You can define **shared options** for all packages, reducing repetition:

```ts [bunup.config.ts]
export default defineWorkspace(
  [
    {
      name: "core",
      root: "packages/core",
      config: {
        format: ["esm"], // overrides shared format
      },
    },
    {
      name: "utils",
      root: "packages/utils",
      // config is optional, shared options apply
    },
  ],
  {
    // Shared options
    format: ["esm", "cjs"],
    exports: true,
    unused: true,
  }
);
```

## Multiple Build Configurations

Each package can have multiple builds by passing an array.

::: info Named Configurations
When using an array of build configurations, the `name` property is **required** for each configuration to identify the builds in logs and reports.
:::

```ts [bunup.config.ts]
export default defineWorkspace([
  {
    name: "web",
    root: "packages/web",
    config: [
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
    ],
  },
]);
```

**Another example:** if you have different entry points that need different build configurations, you can specify them separately. For instance, your main module might need both ESM and CJS formats, while a CLI entry point might only need ESM:

```ts [bunup.config.ts]
export default defineWorkspace([
  {
    name: "main",
    root: "packages/main",
    config: [
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
    ],
  },
]);
```

## Path Resolution

All paths in package configs are **relative to the package root**:

```
myproject/
├── packages/
│   ├── core/        <- package root
│   │   ├── src/     <- entries resolved here
│   │   └── dist/    <- outputs here
│   └── utils/
├── bunup.config.ts
└── package.json
```

Example:

```ts
{
  name: "core",
  root: "packages/core",
  config: {
    entry: "src/index.ts",  // resolves to packages/core/src/index.ts
    outDir: "dist",         // outputs to packages/core/dist/
  },
}
```

::: tip Plugin Paths
When using plugins (like [`copy`](/docs/builtin-plugins/copy)), paths are also resolved relative to the **package root**.
For example, `copy("assets/**/*.svg")` in the `core` package will copy from `packages/core/assets`.
:::

## Building Packages

### Build all packages

```sh
bunx bunup
```

### Watch mode

```sh
bunx bunup --watch
```

Bunup will watch **all packages** and rebuild only those that change.

### Build specific packages

Use the `--filter` option with package names:

```sh
bunx bunup --filter core,utils
# or in watch mode
bunx bunup --filter core,utils --watch
```

::: info Incremental Builds
Workspaces are **incremental**: only changed packages are rebuilt.
:::
