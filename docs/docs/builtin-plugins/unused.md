# Unused

This plugin detects and reports unused dependencies in your project.

## Usage

```ts [bunup.config.ts]
import { defineConfig } from 'bunup';
import { unused } from 'bunup/plugins';

export default defineConfig({
	entry: 'src/index.ts',
	plugins: [unused()],
});
```

## Options

```ts
unused({
	level: 'error', // Fail the build on unused dependencies, defaults to 'warn'
	ignore: ['intentionally-unused-pkg'], // Dependencies to ignore when checking for unused dependencies
})
```
