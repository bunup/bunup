# Plugins

Bunup's plugin system allows you to extend its functionality. The `plugins` option accepts both Bun's native bundler plugins and Bunup-specific plugins.

## Plugin Types

Bunup supports two types of plugins:

1. **Bun Plugins** - Native Bun plugins that are passed directly to Bun's bundler
2. **Bunup Plugins** - Custom plugins with additional lifecycle hooks

You can use both types together in the same configuration.

## Using Bun Plugins

Any [Bun plugin](https://bun.com/docs/bundler/plugins) can be used with Bunup. These plugins are passed directly to Bun's native bundler:

```ts [bunup.config.ts]
import { defineConfig } from "bunup";
import type { BunPlugin } from "bun";

const myBunPlugin: BunPlugin = {
	name: "my-plugin",
	setup(build) {
		// Bun plugin setup
	},
};

export default defineConfig({
	entry: "src/index.ts",
	plugins: [myBunPlugin],
});
```

## Using Bunup Plugins

Bunup plugins provide additional hooks into the build process:

```ts [bunup.config.ts]
import { defineConfig, type BunupPlugin } from "bunup";

const myBunupPlugin: BunupPlugin = {
	name: "my-bunup-plugin",
	hooks: {
		onBuildStart(options) {
			// Called before build starts
		},
		onBuildDone(context) {
			// Called after build completes
		},
	},
};

export default defineConfig({
	entry: "src/index.ts",
	plugins: [myBunupPlugin],
});
```

## Built-in Plugins

Bunup provides several built-in plugins:

- [Copy](/docs/builtin-plugins/copy) - Copy files and directories to your build output
- [Tailwind CSS](/docs/builtin-plugins/tailwindcss) - Official Tailwind CSS v4 plugin
- ...and more

Example usage:

```ts [bunup.config.ts]
import { defineConfig } from "bunup";
import { copy } from "bunup/plugins";

export default defineConfig({
	entry: "src/index.ts",
	plugins: [copy(["README.md", "assets/**/*"])],
});
```

## Plugin Development

To learn how to create your own Bunup plugins, see the [Plugin Development Guide](/docs/advanced/plugin-development).
