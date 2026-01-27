# TypeScript Declarations

Bunup automatically generates TypeScript declaration files (`.d.ts`, `.d.mts`, or `.d.cts`) for your library. These files tell other developers (and TypeScript) what types your library exports, enabling proper type checking and autocomplete when others use your code.

## Isolated Declarations

Enable `isolatedDeclarations` in your tsconfig:

```json [tsconfig.json] {3-4}
{
	"compilerOptions": {
		"declaration": true,
		"isolatedDeclarations": true
	}
}
```

TypeScript 5.5's [isolated declarations](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5-beta/#isolated-declarations) changes how declaration files are generated. Instead of analyzing your entire project to figure out types (slow), it processes each file independently (instant). This requires explicit return types on your **public exports only** - a good practice that makes your API clearer and more predictable.

This transforms builds from seconds/minutes to milliseconds (**50-100x faster**), enabling instant builds and rebuilds, creates clearer APIs, and ensures compatibility with modern build tools.

```ts
// Required: Explicit return type on public exports
export function getData(): Promise<User> {
	return fetchUser();
}

// Internal functions don't need explicit types
function fetchUser() {
	return api.get("/user");
}
```

Learn more about isolated declarations [here](https://arshad.fyi/writing/isolated-declarations).

For new projects, we strongly recommend isolated declarations for instant builds and rebuilds and clearer APIs. Explicitly typing your public exports is considered a best practice for library development.

You only need to disable isolated declarations in rare cases with complex generic types that are genuinely difficult to type explicitly (like some advanced Zod schemas). Check the [Infer Types](#infer-types) section for this alternative approach.

## Basic

Bunup automatically generates TypeScript declaration files for all TypeScript entry points that require them. Files that do not contain exports, or for which declarations are unnecessary, are skipped.

## Declaration Splitting

Declaration splitting prevents code duplication when multiple entry points share the same types. Instead of copying shared types into every declaration file, Bunup extracts them into separate chunk files that get imported where needed.

::: code-group

```sh [CLI]
bunup --dts.splitting
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
├── index.d.ts           # ~45KB (includes duplicated types)
└── utils.d.ts           # ~40KB (includes duplicated types)
```

**With splitting:**

```
dist/
├── index.d.ts					# ~15KB, imports shared types
├── utils.d.ts					# ~10KB, imports shared types
└── shared/chunk-abc123.d.ts	# ~30KB, shared types extracted here
```

The result is smaller files with no duplicate type definitions.

## Minification

You can minify the generated declaration files to reduce their size:

::: code-group

```sh [CLI]
bunup --dts.minify
```

```typescript [bunup.config.ts]
export default defineConfig({
	dts: {
		minify: true,
	},
});
```

:::

Minification keeps your public API names unchanged but shortens internal type names and removes comments. This reduces file size significantly, useful when bundle size matters more than readable type definitions.

### Example

**Original:**

```ts
type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };
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
type e<T> = { [P in keyof T]?: e<T[P]> };
interface t<T> {
	data: T;
	error?: string;
	meta?: Record<string, unknown>;
}
declare function n<T>(url: string, options?: RequestInit): Promise<t<T>>;
export { n as fetchData, t as Response, e as DeepPartial };
```

## Infer Types

By default, Bunup uses isolated declarations which require explicit type annotations. The `inferTypes` option switches back to traditional TypeScript compilation, allowing you to rely on TypeScript's automatic type inference instead of writing explicit return types.

This is useful for projects with complex generic types where explicit typing is verbose or challenging.

::: code-group

```sh [CLI]
bunup --dts.infer-types
```

```typescript [bunup.config.ts]
export default defineConfig({
	dts: {
		inferTypes: true,
	},
});
```

:::

::: tip
For new projects, stick with [isolated declarations](#isolated-declarations) (default behavior) for instant builds and rebuilds and clearer APIs. Only use `inferTypes` when explicit typing becomes impractical.
:::

### Tsgo

When `inferTypes` is enabled, Bunup uses the regular TypeScript compiler (tsc) by default. You can switch to TypeScript's experimental native compiler ([tsgo](https://devblogs.microsoft.com/typescript/typescript-native-port/)) for ~10x faster declaration generation.

First, install the required package:

```sh
bun add --dev @typescript/native-preview
```

Then enable tsgo:

::: code-group

```sh [CLI]
bunup --dts.infer-types --dts.tsgo
```

```typescript [bunup.config.ts]
export default defineConfig({
	dts: {
		inferTypes: true,
		tsgo: true,
	},
});
```

:::

::: info
`tsgo` only works with `inferTypes` enabled. It's experimental but stable enough for declaration generation. Once TypeScript officially releases it, Bunup will use tsgo by default when `inferTypes` is enabled.
:::

## Custom Entry Points

By default, Bunup generates declarations for all your entry points. You can specify which files should have declarations generated:

::: code-group

```sh [CLI]
# Single entry
bunup src/index.ts src/utils.ts --dts.entry src/index.ts

# Multiple entries
bunup src/index.ts src/utils.ts src/types.ts --dts.entry src/index.ts,src/types.ts
```

```typescript [bunup.config.ts]
export default defineConfig({
	entry: ["src/index.ts", "src/utils.ts"],
	dts: {
		// Only generate declarations for index.ts
		entry: ["src/index.ts"],
	},
});
```

:::

### Using Glob Patterns

Bunup supports glob patterns to match multiple files:

::: code-group

```sh [CLI]
# Single glob pattern
bunup --dts.entry "src/public/**/*.ts"

# Multiple patterns (including exclusions)
bunup --dts.entry "src/public/**/*.ts,!src/public/dev/**/*"
```

```typescript [bunup.config.ts]
export default defineConfig({
	dts: {
		entry: ["src/public/**/*.ts", "!src/public/dev/**/*"],
	},
});
```

:::

You can use:

- Simple patterns like `src/**/*.ts` to include files
- Exclude patterns starting with `!` to filter out specific files
- Both for main entries and declaration entries

## TypeScript Configuration

You can specify a custom tsconfig file for declaration generation. This mainly affects how TypeScript resolves import paths during the declaration generation process.

See [Custom Tsconfig Path](/docs/guide/options#custom-tsconfig-path) for details.

By default, the nearest `tsconfig.json` file will be used.

## Resolving External Types

When your code imports types from external packages, you might need to include those type definitions in your declaration files. The `resolve` option tells Bunup to look up and include external types from your dependencies.

::: code-group

```sh [CLI]
# Enable resolving all external types
bunup --dts.resolve
```

```ts [bunup.config.ts]
export default defineConfig({
	dts: {
		// Enable resolving all external types
		resolve: true,
	},
});
```

:::

You can also specify which packages to resolve types for:

::: code-group

```sh [CLI]
# Single package
bunup --dts.resolve react

# Multiple packages
bunup --dts.resolve react,lodash,@types/node
```

```typescript [bunup.config.ts]
export default defineConfig({
	dts: {
		// Only resolve types from these specific packages
		resolve: ["react", "lodash", /^@types\//],
	},
});
```

:::

## Declaration Files Only

If you only want to generate TypeScript declaration files without building JavaScript output, use the `dtsOnly` option:

::: code-group

```sh [CLI]
bunup --dts-only
```

```ts [bunup.config.ts]
export default defineConfig({
	entry: "src/index.ts",
	dtsOnly: true,
});
```

:::

This is useful when:

- You're using a different bundler for JavaScript but want Bunup to handle TypeScript declarations
- You need to generate type definitions separately from your build process
- You're working on a types-only package

When `dtsOnly` is enabled, Bunup skips the entire JavaScript build process and only generates `.d.ts` files.

## Disabling Declaration Generation

You can completely disable automatic declaration file generation:

::: code-group

```sh [CLI]
bunup --no-dts
```

```ts [bunup.config.ts]
export default defineConfig({
	entry: "src/index.ts",
	dts: false,
});
```

:::

This is useful when you want to handle declaration generation yourself or when working on projects that don't need type definitions.
