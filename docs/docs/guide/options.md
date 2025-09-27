# Options

Bunup provides a rich set of options to customize your build. Use the table of contents on the right side or search to quickly navigate to the option you are looking for.

## Entry Points

Bunup supports multiple ways to define entry points. Entry points are the source files that Bunup will use as starting points for bundling.

### Single Entry Point

The simplest way to define an entry point is to provide a single file path:

::: code-group

```sh [CLI]
bunup src/index.ts
```

```ts [bunup.config.ts]
export default defineConfig({
      entry: 'src/index.ts',
});
```

:::

This will generate an output file named after the input file (e.g., `dist/index.js`).

### Multiple Entry Points

You can specify multiple entry points in several ways:

::: code-group

```sh [CLI - method 1]
bunup src/index.ts src/cli.ts
```

```sh [CLI - using --entry flag]
bunup --entry src/index.ts --entry src/cli.ts
# or using alias
bunup -e src/index.ts -e src/cli.ts
```

```ts [bunup.config.ts]
export default defineConfig({
      entry: ['src/index.ts', 'src/cli.ts'],
});
```

:::

This will generate output files named after each input file (e.g., `dist/index.js` and `dist/cli.js`).

### Using Glob Patterns

You can use glob patterns to include multiple files that match a pattern:

::: code-group

```sh [CLI]
bunup 'src/**/*.ts' '!src/**/*.test.ts'
```

```ts [bunup.config.ts]
export default defineConfig({
      entry: [
            'src/**/*.ts',
            '!src/**/*.test.ts',
            '!src/internal/**/*.ts'
      ],
});
```

:::

Glob pattern features:
- Use patterns like `**/*.ts` to match files recursively
- Prefix patterns with `!` to exclude files that match the pattern
- Patterns are resolved relative to the project root


## Output Directory

You can specify where Bunup should output the bundled files:

::: code-group

```sh [CLI]
bunup src/index.ts --out-dir build
# or using alias
bunup src/index.ts -o build
```

```ts [bunup.config.ts]
export default defineConfig({
    entry: 'src/index.ts',
    outDir: 'build',
});
```

:::

The default output directory is `dist`.

## Output Formats

Bunup supports three output formats:

- **esm**: ECMAScript modules (default)
- **cjs**: CommonJS modules
- **iife**: Immediately Invoked Function Expression (for browser)

You can specify one or more formats:

### Using the CLI

::: code-group

```sh [CLI]
# Single format
bunup src/index.ts --format esm
# or using alias
bunup src/index.ts -f esm

# Multiple formats
bunup src/index.ts --format esm,cjs,iife
# or using alias
bunup src/index.ts -f esm,cjs,iife
```

```ts [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	// Single format
	format: 'esm',

	// Or multiple formats
	// format: ['esm', 'cjs', 'iife'],
});
```

:::

### Output File Extensions

The file extensions are determined automatically based on the format and your package.json `type` field:

**When package.json has `"type": "module"`:**

| Format | JavaScript Extension | TypeScript Declaration Extension |
| ------ | -------------------- | -------------------------------- |
| esm    | `.js`                | `.d.ts`                          |
| cjs    | `.cjs`               | `.d.cts`                         |
| iife   | `.global.js`         | `.global.d.ts`                   |

**When package.json has `"type": "commonjs"` or is unspecified:**

| Format | JavaScript Extension | TypeScript Declaration Extension |
| ------ | -------------------- | -------------------------------- |
| esm    | `.mjs`               | `.d.mts`                         |
| cjs    | `.js`                | `.d.ts`                          |
| iife   | `.global.js`         | `.global.d.ts`                   |

## Named Configurations

You can give your build configurations names for better logging:

::: code-group

```sh [CLI]
bunup src/index.ts --name my-library
```

```ts [bunup.config.ts]
export default defineConfig({
    name: 'my-library',
    entry: 'src/index.ts',
});
```

:::

This is especially useful when you have multiple configurations:

```typescript
export default defineConfig([
	{
		name: 'node-build',
		entry: 'src/index.ts',
		format: 'esm',
		target: 'node',
		// ... other options
	},
	{
		name: 'browser-build',
		entry: 'src/index.ts',
		format: ['esm', 'iife'],
		// ... other options
	},
]);
```

## External Dependencies

When you build a library with Bunup, you need to decide which packages should be included in your bundle and which should be left out. This section explains how to control this behavior.

### What Happens by Default

Bunup looks at your `package.json` file and automatically decides what to bundle:

- **Packages in `dependencies`**: These are **not included** in your bundle. These will be installed automatically when your package is installed.
- **Packages in `peerDependencies`**: These are also **not included**. Users of your library are expected to install these dependencies manually.
- **Packages in `devDependencies`**: These **are included** if you actually use them in your code.

### Why This Matters

Imagine you're building a library that uses `lodash`:

- If you put `lodash` in `dependencies`, it won't be bundled with your library
- `lodash` will be installed automatically when your package is installed
- This keeps your library smaller and avoids version conflicts

### Making Packages External

If you want to make sure a package is not bundled (even if it's not in your `package.json`):

::: code-group

```sh [CLI]
# Single package
bunup src/index.ts --external lodash

# Multiple packages
bunup src/index.ts --external lodash,react,vue
```

```ts [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	external: ['lodash'],
});
```

:::

### Forcing Packages to Be Bundled

If you want to include a package in your bundle (even if it's normally external):

::: code-group

```sh [CLI]
# Single package
bunup src/index.ts --no-external lodash

# Multiple packages
bunup src/index.ts --no-external lodash,react,vue
```

```ts [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	noExternal: ['lodash'],
});
```

:::

::: info
Both `external` and `no-external` support exact strings and regular expressions for flexible dependency management.
:::

## Tree Shaking

Bunup tree-shakes your code by default. No configuration is needed.

## Code Splitting

Code splitting allows Bunup to split your code into multiple chunks for better performance and caching.

### Default Behavior

- Code splitting is **enabled by default** for ESM format
- Code splitting is **disabled by default** for CJS and IIFE formats

### Configuring Code Splitting

You can explicitly enable or disable code splitting:

#### Using the CLI

::: code-group

```sh [CLI]
# Enable code splitting
bunup src/index.ts --splitting

# Disable code splitting
bunup src/index.ts --no-splitting
```

```ts [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	format: 'esm',
	// Enable for all formats
	splitting: true,

	// Or disable for all formats
	// splitting: false,
});
```

:::

## Minification

Bunup provides several minification options to reduce the size of your output files.

### Basic Minification

To enable all minification options:

::: code-group

```sh [CLI]
bunup src/index.ts --minify
```

```ts [bunup.config.ts]
export default defineConfig({
    entry: 'src/index.ts',
    minify: true,
});
```

:::

### Granular Minification Control

You can configure individual minification options:

#### Using the CLI

::: code-group

```sh [CLI]
# Single option - minify whitespace only
bunup src/index.ts --minify-whitespace

# Multiple options - minify whitespace and syntax, but not identifiers
bunup src/index.ts --minify-whitespace --minify-syntax
```

```ts [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	// Configure individual options
	minifyWhitespace: true,
	minifyIdentifiers: false,
	minifySyntax: true,
});
```

:::

The `minify` option is a shorthand that enables all three specific options. If you set individual options, they take precedence over the `minify` setting.

## Source Maps

Bunup can generate source maps for your bundled code:

::: code-group

```sh [CLI]
# Linked source maps
bunup src/index.ts --sourcemap linked

# Inline source maps
bunup src/index.ts --sourcemap
```

```ts [bunup.config.ts]
export default defineConfig({
    entry: 'src/index.ts',
    sourcemap: 'linked'
    // Can also use boolean
    // sourcemap: true // equivalent to 'inline'
});
```

:::

Available sourcemap values:

- `none`
- `linked`
- `external`
- `inline`
- `true` (equivalent to 'inline')

For detailed explanations of these values, see the [Bun documentation on source maps](https://bun.sh/docs/bundler#sourcemap).

## Define Global Constants

Bunup allows you to define global constants that will be replaced at build time. This is useful for feature flags, version numbers, or any other build-time constants.

::: code-group

```sh [CLI]
bunup src/index.ts --define.PACKAGE_VERSION='"1.0.0"' --define.DEBUG='false'
```

```typescript [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	define: {
		PACKAGE_VERSION: '"1.0.0"',
		DEBUG: 'false',
	},
});
```

:::

The `define` option takes an object where:

- Keys are the identifiers to replace
- Values are the strings to replace them with

For more information on how define works, see the [Bun documentation on define](https://bun.sh/docs/bundler#define).

## Banner and Footer

You can add custom text to the beginning and end of your bundle files:

::: code-group

```sh [CLI]
bunup src/index.ts --banner 'use client' --footer '// built with love in SF'
```

```ts [bunup.config.ts]
export default defineConfig({
      entry: 'src/index.ts',
      // Add text to the beginning of bundle files
      banner: '"use client";',
      // Add text to the end of bundle files
      footer: '// built with love in SF',
});
```

:::

The `banner` option adds text to the beginning of the bundle, useful for directives like "use client" for React or license information.

The `footer` option adds text to the end of the bundle, which can be used for license information or other closing comments.

For more information, see the Bun documentation on [banner](https://bun.sh/docs/bundler#banner) and [footer](https://bun.sh/docs/bundler#footer).

## Drop Function Calls

You can remove specific function calls from your bundle:

::: code-group

```sh [CLI]
# Single function
bunup src/index.ts --drop console

# Multiple functions
bunup src/index.ts --drop console,debugger
```

```typescript [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	drop: ['console', 'debugger', 'anyIdentifier.or.propertyAccess'],
});
```

:::

The `drop` option removes function calls specified in the array. For example, `drop: ["console"]` will remove all calls to `console.log`. Arguments to calls will also be removed, regardless of if those arguments may have side effects. Dropping `debugger` will remove all `debugger` statements.

For more information, see the [Bun documentation on drop](https://bun.sh/docs/bundler#drop).

## Package.json Export Conditions

You can specify custom package.json export conditions for import resolution:

::: code-group

```sh [CLI]
# Single condition
bunup src/index.ts --conditions development

# Multiple conditions
bunup src/index.ts --conditions development,node
```

```typescript [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	conditions: ['development', 'node'],
});
```

:::

This allows you to control which conditional exports are used when resolving imports.

## Dead Code Elimination

Control how dead code elimination annotations are handled:

::: code-group

```sh [CLI]
# Ignore @__PURE__ annotations and sideEffects
bunup src/index.ts --ignore-dce-annotations

# Force emit @__PURE__ annotations even with minification
bunup src/index.ts --emit-dce-annotations
```

```typescript [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	ignoreDCEAnnotations: true,
	// or
	emitDCEAnnotations: true,
});
```

:::

- `ignore-dce-annotations`: Ignores dead code elimination annotations like `@__PURE__` and `sideEffects` in package.json
- `emit-dce-annotations`: Forces emission of `@__PURE__` annotations even when minification is enabled

## Silent Mode

Disable logging during the build process:

::: code-group

```sh [CLI]
bunup src/index.ts --silent
# or using alias
bunup src/index.ts -q
```

```typescript [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	silent: true,
});
```

:::

This is useful when you want minimal output, such as in CI/CD environments.

## Build Report

Configure the build report that shows file sizes and compression statistics:

::: code-group

```sh [CLI]
# Enable brotli compression reporting (gzip is enabled by default)
bunup src/index.ts --report.brotli

# Set maximum bundle size warning threshold (in bytes)
bunup src/index.ts --report.max-bundle-size 1048576

# Disable gzip compression reporting
bunup src/index.ts --no-report.gzip
```

```typescript [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	report: {
		gzip: true,        // Enable gzip size calculation (default: true)
		brotli: false,     // Enable brotli size calculation (default: false)
		maxBundleSize: 1024 * 1024, // Warn if bundle exceeds 1MB
	},
});
```

:::

The `report` option controls the build output report:

- **gzip**: Calculate and display gzip compressed file sizes (enabled by default)
- **brotli**: Calculate and display brotli compressed file sizes (disabled by default)
- **maxBundleSize**: Set a size threshold in bytes - bunup will warn if the total bundle size exceeds this limit

::: info
For large output files, compression size calculation may slow down the build process. Consider disabling compression reporting if build speed is critical.
:::

## Custom Loaders

You can configure how different file types are loaded:

::: code-group

```sh [CLI]
bunup src/index.ts --loader.'.css'=text --loader.'.txt'=file
```

```typescript [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	loader: {
		'.css': 'text',
		'.txt': 'file',
	},
});
```

:::

The `loader` option takes a map of file extensions to built-in loader names, allowing you to customize how different file types are processed during bundling.

For more information, see the [Bun documentation on loaders](https://bun.sh/docs/bundler#loader).

## Public Path

You can specify a prefix to be added to specific import paths in your bundled code:

::: code-group

```sh [CLI]
bunup src/index.ts --public-path https://cdn.example.com/
```

```ts [bunup.config.ts]
export default defineConfig({
      entry: 'src/index.ts',
      publicPath: 'https://cdn.example.com/',
});
```

:::

The `publicPath` option only affects certain types of imports in the final bundle:

- Asset imports (like images or SVG files)
- External modules
- Chunk files when code splitting is enabled

By default, these imports are relative. Setting `publicPath` will prefix these specific file paths with the specified value, which is useful for serving assets from a CDN.

For example:

```js [Input]
import logo from './logo.svg';
console.log(logo);
```

```js [Output without publicPath]
var logo = './logo-a7305bdef.svg';
console.log(logo);
```

```js [Output with publicPath]
var logo = 'https://cdn.example.com/logo-a7305bdef.svg';
console.log(logo);
```

For more information, see the [Bun documentation on publicPath](https://bun.sh/docs/bundler#publicpath).

## Environment Variables

Bunup provides flexible options for handling environment variables in your bundled code:

::: code-group
```sh [CLI]
# Inline all environment variables available at build time
FOO=bar API_KEY=secret bunup src/index.ts --env inline

# Disable all environment variable inlining
bunup src/index.ts --env disable

# Only inline environment variables with a specific prefix (e.g., PUBLIC_)
PUBLIC_URL=https://example.com bunup src/index.ts --env PUBLIC_*

# Explicitly provide specific environment variables
bunup src/index.ts --env.NODE_ENV="production" --env.API_URL="https://api.example.com"
```

```ts [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',

	// Inline all available environment variables at build time
	env: 'inline',

	// Or disable inlining entirely (keep process.env.FOO in the output)
	// env: "disable",

	// Or inline only variables that start with a specific prefix
	// env: "PUBLIC_*",

	// Or explicitly provide specific environment variables
	// These will replace both process.env.FOO and import.meta.env.FOO
	// env: {
	//   API_URL: "https://api.example.com",
	//   DEBUG: "false",
	// },
});
```
:::

### How it Works

The `env` option controls how `process.env.*` and `import.meta.env.*` expressions are replaced at build time:

| Value            | Behavior                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `"inline"`       | Replaces all `process.env.VAR` references in your code with the actual values of those environment variables at the time of the build. |
| `"disable"`      | Disables environment variable replacement. Keeps `process.env.VAR` as-is in output.                                                    |
| `"PREFIX_*"`     | Only inlines environment variables matching the given prefix (e.g. `PUBLIC_*`).                                                        |
| `{ key: value }` | Replaces both `process.env.KEY` and `import.meta.env.KEY` with the provided values, regardless of the environment.                     |

For more information, see the [Bun documentation on environment variables](https://bun.sh/docs/bundler#env).

## Shims

Bunup can automatically provide compatibility layers for Node.js globals and ESM/CJS interoperability. When enabled, it detects usage of environment-specific features in your code and adds appropriate shims:

::: code-group

```sh [CLI]
bunup src/index.ts --shims
```

```ts [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	shims: true,
});
```

:::

### How Shims Work

When shims are enabled, Bunup automatically transforms environment-specific code:

- **For CJS output**: `import.meta.url` references are transformed to `pathToFileURL(__filename).href`
- **For ESM output**: `__dirname` and `__filename` references are transformed to use `dirname(fileURLToPath(import.meta.url))`

This ensures your code works consistently across different module formats and environments without requiring manual compatibility code.

## Target Environments

Bunup allows you to specify the target environment for your bundle:

::: code-group

```sh [CLI]
bunup src/index.ts --target browser
# or using alias
bunup src/index.ts -t browser
```

```ts [bunup.config.ts]
export default defineConfig({
    entry: 'src/index.ts',
    target: 'browser',
});
```

:::

Available targets:

- `node` (default): Optimized for Node.js
- `browser`: Optimized for browsers
- `bun`: For generating bundles that are intended to be run by the Bun runtime.

If a file contains a Bun shebang (`#!/usr/bin/env bun`), the `bun` target will be used automatically for that file.

When targeting `bun`, bundles are marked with a special `// @bun` pragma that tells the Bun runtime not to re-transpile the file before execution. While bundling isn't always necessary for server-side code, it can improve startup times and runtime performance.

## Cleaning the Output Directory

By default, Bunup cleans the output directory before each build. You can disable this behavior:

::: code-group

```sh [CLI]
bunup src/index.ts --no-clean
```

```ts [bunup.config.ts]
export default defineConfig({
    entry: 'src/index.ts',
    clean: false,
});
```

:::

## Post-build Operations

The `onSuccess` option runs after the build process successfully completes. It supports three different formats:

### Function Callback

Execute custom JavaScript code after a successful build:

```typescript
export default defineConfig({
	entry: 'src/index.ts',
	onSuccess: (options) => {
		console.log('Build completed!');

		const server = startDevServer();

		// Optional: return a cleanup function for watch mode
		return () => server.close();
	},
});
```

### Simple Command

Execute a shell command as a string:

::: code-group

```sh [CLI]
bunup src/index.ts --on-success "bun run ./scripts/server.ts"
```

```ts [bunup.config.ts]
export default defineConfig({
	entry: 'src/index.ts',
	onSuccess: 'bun run ./scripts/server.ts',
});
```

:::

### Advanced Command Options

For more control over command execution:

```typescript
export default defineConfig({
	entry: 'src/index.ts',
	onSuccess: {
		cmd: 'bun run ./scripts/server.ts',
		options: {
			cwd: './app',
			env: { ...process.env, FOO: 'bar' },
			timeout: 30000, // 30 seconds
			killSignal: 'SIGKILL',
		},
	},
});
```

Available command options:
- **cwd**: Working directory for the command
- **env**: Environment variables (defaults to `process.env`)
- **timeout**: Maximum execution time in milliseconds
- **killSignal**: Signal used to terminate the process (defaults to `'SIGTERM'`)

::: info
In watch mode, `onSuccess` runs after each successful rebuild.
:::

::: warning
The function callback and advanced command options for `onSuccess` are only available in the configuration file, not via CLI flags.
:::
