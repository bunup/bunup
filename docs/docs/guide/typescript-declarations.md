# TypeScript Declarations

Bunup automatically generates TypeScript declaration files (`.d.ts`, `.d.mts`, or `.d.cts`) for your library based on your output format, ensuring full type safety for consumers.

## Isolated Declarations

Make your library lightning-fast and future-ready. TypeScript 5.5 introduced [`isolatedDeclarations`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#isolated-declarations) to solve slow declaration file generation. With isolated declarations, Bunup generates your `.d.ts` files in parallel at blazing speed, reducing build times from seconds to milliseconds while ensuring compatibility with all modern tools.

### Why This Matters

Traditional declaration generation required analyzing entire projects and complex cross-file type inference, creating build bottlenecks that prevented faster tools like Bun, and other modern tools from implementing TypeScript tooling. They didn't want to implement the full TypeScript compiler just for this, which made the process slow.

With `isolatedDeclarations`, every tool can now generate declarations extremely quickly without needing the full TypeScript compiler. This breakthrough enables parallel, super-fast generation that works reliably across the ecosystem. **This is the future** - modern and future tools are moving this way because of the significant performance benefits. Bun is already going to add support for super-fast TypeScript declaration generation because of this.

By adopting isolated declarations now, your codebase becomes early-compatible with this future ecosystem, ensuring it works seamlessly with every modern tool and bundler that's adopting this approach.

### Benefits for Your Library

Enable `isolatedDeclarations` and join the modern TypeScript ecosystem with:
- **Dramatically faster builds**
- **Universal compatibility** with cutting-edge tools and bundlers
- **Future-proofing** - your codebase is ready for when this becomes the standard

### How It Works

Simplly add explicit return types to your public exports only. Internal code stays unchanged. Think of it as clearly labeling your library's public interface - which is a good practice that makes your API predictable for tools and developers.

```typescript [src/index.ts]
// Before: TypeScript infers
export function createUser(name: string) {
  return { id: generateId(), name };
}

// After: Clear public interface
export function createUser(name: string): User {
  return { id: generateId(), name };
}
```

### Enable It Now

Add to your `tsconfig.json`:

```json  [tsconfig.json] {4}
{
  "compilerOptions": {
    "declaration": true,
    "isolatedDeclarations": true
  }
}
```

TypeScript will guide you through adding any missing return types. Your library is now future-ready and will build significantly faster with perfect ecosystem compatibility.

## Basic

Bunup automatically generates TypeScript declaration files for entry points that contain exports. CLI entries and other files without exports are skipped.

## Custom Entry Points

For more control, you can specify custom entry points for declarations:

```typescript
export default defineConfig({
	entry: ['src/index.ts', 'src/utils.ts'],
	dts: {
		// Only generate declarations for index.ts
		entry: ['src/index.ts'],
	},
});
```

### Using Glob Patterns

Bunup supports glob patterns for both main entries and declaration file entries:

```typescript
export default defineConfig({
	dts: {
		entry: [
			'src/public/**/*.ts',
			'!src/public/dev/**/*'
		]
	}
});
```

You can use:
- Simple patterns like `src/**/*.ts` to include files
- Exclude patterns starting with `!` to filter out specific files
- Both for main entries and declaration entries

## Declaration Splitting

Declaration splitting optimizes TypeScript `.d.ts` files when multiple entry points share types. Instead of duplicating shared types across declaration files, Bunup extracts them into shared chunk files that are imported where needed.

```typescript
export default defineConfig({
	dts: {
		splitting: true,
	},
});
```

**Without splitting:**

```
dist/
├── index.d.ts           # ~45KB
└── utils.d.ts           # ~40KB
```

**With splitting:**

```
dist/
├── index.d.ts         		    # ~15KB, imports from shared chunk
├── utils.d.ts           		  # ~10KB, imports from shared chunk
└── shared/chunk-abc123.d.ts  # ~30KB, shared types
```

The result is clean declarations with no duplicates, improved readability, and reduced bundle size.

<!-- TODO: Uncomment this once Bun fixes the issue with splitting and declaration splitting can be enabled by default when build splitting is enabled
::: info
Declaration splitting is enabled by default if code splitting is enabled.
::: -->

## Minification

You can minify the generated declaration files to reduce their size:

```typescript
export default defineConfig({
	dts: {
		minify: true,
	},
});
```

When enabled, minification preserves public (exported) API names while minifying internal type names and removes documentation comments. This provides significant size reduction especially for large declaration files, making it valuable when bundle size is a priority and JSDoc comments aren't essential.

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

```sh [CLI - all packages]
bunup src/index.ts --resolve-dts
```

```sh [CLI - specific packages]
bunup src/index.ts --resolve-dts=react,lodash
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

```typescript
export default defineConfig({
	entry: 'src/index.ts',
	dts: {
		// Only resolve types from these specific packages
		resolve: ['react', 'lodash', /^@types\//],
	},
});
```

## Disabling Declaration Generation

While Bunup automatically generates declaration files for TypeScript entries, you can disable this feature if needed:

::: code-group

```sh [CLI]
bunup src/index.ts --dts=false
```

```ts [bunup.config.ts]
export default defineConfig({
  entry: "src/index.ts",
  dts: false,
});
```

:::

This can be useful when you want to handle declaration generation yourself or when you're working on a project that doesn't need declaration files.
