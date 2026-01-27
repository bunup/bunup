# Unused

Bunup detects and reports unused or incorrectly categorized dependencies in your project, helping you maintain a clean dependency tree and keep your `package.json` up to date.

## Usage

::: code-group

```sh [CLI]
bunup --unused
```

```ts [bunup.config.ts]
import { defineConfig } from "bunup";

export default defineConfig({
	unused: true,
});
```

:::

## Options

::: code-group

```sh [CLI]
# Set warning level to error
bunup --unused.level=error

# Ignore specific dependencies
bunup --unused.ignore=intentionally-unused-pkg

# Combine multiple options
bunup --unused.level=error --unused.ignore=pkg1,pkg2
```

```ts [bunup.config.ts]
import { defineConfig } from "bunup";

export default defineConfig({
	unused: {
		level: "error", // Fail the build on unused dependencies, defaults to 'warn'
		ignore: ["intentionally-unused-pkg"], // Dependencies to ignore when checking for unused dependencies
	},
});
```

:::
