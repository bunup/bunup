# Bunup Workspaces

Effortlessly manage multiple packages in monorepos with Bunup's workspace support. Define and build multiple packages with a single configuration file and command.

## Configuration Structure

### Creating a Workspace Configuration

Use the `defineWorkspace` function to define your monorepo structure:

```typescript [bunup.config.ts]
import { defineWorkspace } from "bunup";

export default defineWorkspace([
  // Package configurations go here
]);
```

### Package Configuration

Each package in your workspace requires:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique identifier for the package |
| `root` | `string` | Relative path to the package directory |
| `config` | `BunupConfig \| BunupConfig[]` | Build configuration(s) for this package |

## Basic Usage

Here's a simple workspace with two packages:

```typescript [bunup.config.ts]
import { defineWorkspace } from "bunup";

export default defineWorkspace([
  {
    name: "core",
    root: "packages/core",
    config: {
      entry: "src/index.ts",
      format: ["esm", "cjs"],
    },
  },
  {
    name: "utils",
    root: "packages/utils",
    config: {
      entry: "src/index.ts",
      format: "esm",
    },
  },
]);
```

## Using Shared Options

You can simplify configuration by using shared options:

```typescript [bunup.config.ts]
import { defineWorkspace } from "bunup";

export default defineWorkspace(
  [
    {
      name: "core",
      root: "packages/core",
      config: {
        format: ["esm", "cjs"], // Overrides shared format
      },
    },
    {
      name: "utils",
      root: "packages/utils",
      // config is optional when using only shared options
    },
  ],
  {
    // Shared configuration applied to all packages
    entry: "src/index.ts",
    format: "esm",
    minify: true,
    target: "node",
  }
);
```

## Multiple Build Configurations

You can define multiple build configurations for a single package by using an array:

```typescript [bunup.config.ts]
import { defineWorkspace } from "bunup";

export default defineWorkspace([
  {
    name: "web-package",
    root: "packages/web",
    config: [
      {
        name: "browser-esm",
        entry: "src/index.ts",
        format: "esm",
        target: "browser",
      },
      {
        name: "node-cjs",
        entry: "src/index.ts",
        format: ["cjs"],
        target: "node",
      },
    ],
  },
]);
```

::: tip
Use the `name` property within each config to easily identify different builds in logs.
:::

## Path Resolution

All paths in workspace configurations are resolved relative to each **package's root directory**:

```
myproject/
├── packages/
│   ├── core/        <- package root
│   │   ├── src/     <- entry points relative to this package
│   │   └── dist/    <- output goes here
│   └── utils/       <- another package root
├── bunup.config.ts
└── package.json
```

For example, with this configuration:

```typescript
{
  name: 'core',
  root: 'packages/core',
  config: {
    entry: 'src/index.ts',  // resolves to packages/core/src/index.ts
    outDir: 'dist',           // outputs to packages/core/dist/
  },
}
```

::: tip Plugin Path Resolution
When using plugins that accept path options (like the [`copy`](/docs/plugins/copy) plugin), those paths are also resolved relative to the package's root directory. For example, `copy('assets/**/*.svg')` will copy from `packages/core/assets` when used in the `core` package configuration.
:::

## Build Packages

To build all packages in your workspace:

```sh
bunx bunup
```

### Watch Mode

To automatically rebuild packages when files change:

```sh
bunx bunup --watch
```

This single command watches and rebuilds all packages in your workspace.

### Building Specific Packages

To build only specific packages, use the `--filter` option with the package names (the `name` property defined in your workspace configuration):

```sh
bunx bunup --filter core,utils
# or watch specific packages
bunx bunup --filter core,utils --watch
```

::: info
Bunup do incremental builds in workspaces, meaning it will only rebuild packages that have changed.
:::
