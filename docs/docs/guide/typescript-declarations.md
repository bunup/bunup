# TypeScript Declarations

Bunup automatically generates TypeScript declaration files (`.d.ts`, `.d.mts`, or `.d.cts`) for your library based on your output format, with advanced features like declaration splitting.

## Prerequisites

Enable `isolatedDeclarations` in your tsconfig:

```json [tsconfig.json] {4}
{
  "compilerOptions": {
    "declaration": true,
    "isolatedDeclarations": true
  }
}
```

Bunup uses TypeScript's new isolated declarations feature to generate type declarations quickly and accurately.

Learn more about the benefits and why you need to enable this [here](https://arshadyaseen.com/writing/isolated-declarations).

## Basic

Bunup automatically generates TypeScript declaration files for all TypeScript entry points that require them. Files that do not contain exports, or for which declarations are unnecessary, are skipped.

## Declaration Splitting

Declaration splitting optimizes TypeScript `.d.ts` files when multiple entry points share types. Instead of duplicating shared types across declaration files, Bunup extracts them into shared chunk files that are imported where needed.

::: code-group

```sh [CLI]
bunup src/index.ts --dts.splitting
```

```typescript [bunup.config.ts]
export default defineConfig({
	dts: {
		splitting: true,
	},
});
```

:::

**Without splitting:**

```
dist/
├── index.d.ts           # ~45KB
└── utils.d.ts           # ~40KB
```

**With splitting:**

```
dist/
├── index.d.ts					# ~15KB, imports from shared chunk
├── utils.d.ts					# ~10KB, imports from shared chunk
└── shared/chunk-abc123.d.ts	# ~30KB, shared types
```

The result is clean declarations with no duplicates, improved readability, and reduced bundle size.

<!-- TODO: Uncomment this once Bun fixes the issue with splitting and declaration splitting can be enabled by default when build splitting is enabled
::: info
Declaration splitting is enabled by default if code splitting is enabled.
::: -->

## Minification

You can minify the generated declaration files to reduce their size:

::: code-group

```sh [CLI]
bunup src/index.ts --dts.minify
```

```typescript [bunup.config.ts]
export default defineConfig({
	dts: {
		minify: true,
	},
});
```

:::

Minifying TypeScript declarations is uncommon, but bunup supports it. When enabled, minification keeps public (exported) API names intact, shortens internal type names, and removes documentation comments. This can greatly reduce file size, which is useful if bundle size matters and you don't need JSDoc or readable type definitions for consumers.

### Example

**Original:**

```ts
type DeepPartial<T> = { [P in keyof T]? : DeepPartial<T[P]> };
interface Response<T> {
	data: T;
	error?: string;
	meta?: Record<string, unknown>;
}
declare function fetchData<T>(url: string, options?: RequestInit): Promise<Response<T>>;
export { fetchData, Response, DeepPartial };
```

**Minified:**

```ts
type e<T>={[P in keyof T]?:e<T[P]>};interface t<T>{data:T;error?:string;meta?:Record<string,unknown>;}declare function n<T>(url:string,options?:RequestInit): Promise<t<T>>;export{n as fetchData,t as Response,e as DeepPartial};
```


## Custom Entry Points

For more control, you can specify custom entry points for declarations:

::: code-group

```sh [CLI]
# Single entry
bunup src/index.ts src/utils.ts --dts.entry src/index.ts

# Multiple entries
bunup src/index.ts src/utils.ts src/types.ts --dts.entry src/index.ts,src/types.ts
```

```typescript [bunup.config.ts]
export default defineConfig({
	entry: ['src/index.ts', 'src/utils.ts'],
	dts: {
		// Only generate declarations for index.ts
		entry: ['src/index.ts'],
	},
});
```

:::

### Using Glob Patterns

Bunup supports glob patterns for both main entries and declaration file entries:

::: code-group

```sh [CLI]
# Single glob pattern
bunup src/index.ts --dts.entry "src/public/**/*.ts"

# Multiple patterns (including exclusions)
bunup src/index.ts --dts.entry "src/public/**/*.ts,!src/public/dev/**/*"
```

```typescript [bunup.config.ts]
export default defineConfig({
	dts: {
		entry: [
			'src/public/**/*.ts',
			'!src/public/dev/**/*'
		]
	}
});
```

:::

You can use:
- Simple patterns like `src/**/*.ts` to include files
- Exclude patterns starting with `!` to filter out specific files
- Both for main entries and declaration entries


## TypeScript Configuration

You can specify a custom tsconfig file for declaration generation:

::: code-group

```sh [CLI]
bunup src/index.ts --preferred-tsconfig-path ./tsconfig.build.json
```

```ts [bunup.config.ts]
export default defineConfig({
  entry: "src/index.ts",
  preferredTsconfigPath: "./tsconfig.build.json",
});
```

:::

## Resolving External Types

When generating declaration files, you might need to include type references from external dependencies. Bunup can automatically resolve these external types:

::: code-group

```sh [CLI]
# Enable resolving all external types
bunup src/index.ts --dts.resolve
```

```ts [bunup.config.ts]
export default defineConfig({
      entry: 'src/index.ts',
      dts: {
            // Enable resolving all external types
            resolve: true,
      },
});
```

:::

The `resolve` option helps when your TypeScript code imports types from external packages. Bunup will look for type definitions in `node_modules` and include them in your declaration files.

You can also specify which packages to resolve types for:

::: code-group

```sh [CLI]
# Single package
bunup src/index.ts --dts.resolve react

# Multiple packages
bunup src/index.ts --dts.resolve react,lodash,@types/node
```

```typescript [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	dts: {
		// Only resolve types from these specific packages
		resolve: ['react', 'lodash', /^@types\//],
	},
});
```

:::

## Disabling Declaration Generation

While Bunup automatically generates declaration files for TypeScript entries, you can disable this feature if needed:

::: code-group

```sh [CLI]
bunup src/index.ts --no-dts
```

```ts [bunup.config.ts]
export default defineConfig({
  entry: "src/index.ts",
  dts: false,
});
```

:::

This can be useful when you want to handle declaration generation yourself or when you're working on a project that doesn't need declaration files.
