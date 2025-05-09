# TypeScript Declarations

Bunup automatically generates TypeScript declaration files (`.d.ts`, `.d.mts`, or `.d.cts` depending on your output format) for your library, making it fully type-safe for consumers.

::: tip
Before you begin, it's recommended to enable `"isolatedDeclarations": true` in your `tsconfig.json`.
Bunup uses TypeScript's [isolatedDeclarations](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#isolated-declarations) feature, which is specially designed for library authors to generate fast, accurate, and robust type definitions.
This setting encourages you to provide explicit type annotations as you write code.
The result? Cleaner, safer, and more reliable type declarations for your library.

```json [tsconfig.json] 4
{
	"compilerOptions": {
		"declaration": true,
		"isolatedDeclarations": true
	}
}
```

:::

## Basic

To generate declarations for all entry points:

```sh 7
# CLI
bunup src/index.ts --dts

# Configuration file
export default defineConfig({
    entry: ['src/index.ts'],
    dts: true,
});
```

## Custom Entry Points

For more control, you can specify custom entry points for declarations:

```typescript
export default defineConfig({
	entry: ['src/index.ts', 'src/cli.ts'],
	dts: {
		// Only generate declarations for index.ts
		entry: ['src/index.ts'],
	},
});
```

## Named Entries

You can use named entries for declarations:

```typescript
export default defineConfig({
	entry: {
		main: 'src/index.ts',
		cli: 'src/cli.ts',
	},
	outdir: "dist",
	dts: {
		entry: {
			types: 'src/index.ts', // Outputs to dist/types.d.ts
			api: 'src/api/v1/index.ts', // Outputs to dist/api.d.ts
			'nested/types': 'src/types.ts', // Outputs to dist/nested/types.d.ts
		},
	},
});
```

## TypeScript Configuration

You can specify a custom tsconfig file for declaration generation:

```sh
# CLI
bunup src/index.ts --dts --preferred-tsconfig-path ./tsconfig.build.json

# Configuration file
export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  preferredTsconfigPath: "./tsconfig.build.json",
});
```

## Resolving External Types

When generating declaration files, you might need to include type references from external dependencies. Bunup can automatically resolve these external types:

```sh
# CLI
bunup src/index.ts --dts --resolve-dts

# CLI (Or specify packages to resolve)
bunup src/index.ts --dts --resolve-dts=react,lodash

# Configuration file
export default defineConfig({
      entry: ['src/index.ts'],
      dts: {
            # Enable resolving all external types
            resolve: true,
      },
});
```

The `resolve` option helps when your TypeScript code imports types from external packages. Bunup will look for type definitions in `node_modules` and include them in your declaration files.

You can also specify which packages to resolve types for:

```typescript
export default defineConfig({
	entry: ['src/index.ts'],
	dts: {
		// Only resolve types from these specific packages
		resolve: ['react', 'lodash', /^@types\//],
	},
});
```
