# Copy

The copy plugin copies files and directories to your build output. It supports glob patterns, direct folder copying, file transformation with filename changes, and can copy to specific destinations or rename files and folders.

## Basic Usage

```ts [bunup.config.ts]
import { defineConfig } from "bunup";
import { copy } from "bunup/plugins";

export default defineConfig({
	plugins: [copy(["README.md", "assets/**/*"])],
});
```

This will copy the `README.md` file and all files in the `assets` directory to your build output directory.

Use `copy(pattern)` to copy files or folders. Optionally, add `.to(destination)` to set the output name or location, `.with(options)` for extra settings, and `.transform(fn)` to modify files during copy. By default, everything is copied to your build output directory.

## Examples

Below are some examples of how to use the copy plugin.

### Basic File Operations

```ts
// Copy single file
copy("README.md");

// Copy multiple specific files
copy(["README.md", "LICENSE", "CHANGELOG.md"]);

// Copy and rename a file
copy("README.md").to("documentation.md");
```

### Directory Operations

```ts
// Copy entire directory as is (preserves structure)
copy("assets"); // → dist/assets/

// Copy and rename directory
copy("assets").to("static"); // → dist/static/

// Copy multiple directories
copy(["assets", "public", "docs"]);
```

### Glob Patterns

```ts
// Copy all markdown files recursively
copy("**/*.md");

// Copy all files in assets directory
copy("assets/**/*");

// Copy with multiple patterns
copy([
	"assets/**/*", // All files in assets
	"docs/**/*.md", // Markdown files in docs
	"src/**/*.css", // CSS files in src
]);
```

### Pattern Exclusions

```ts
// Exclude specific files and patterns
copy([
	"assets/**/*", // Include all assets
	"!**/*.tmp", // Exclude temporary files
	"!**/*.log", // Exclude log files
	"!**/node_modules", // Exclude node_modules
	"!**/.DS_Store", // Exclude system files
]);
```

### Flattening Structure

```ts
// Flatten all files from subdirectories
copy("assets/**/*").to("static"); // All files → dist/static/

// Flatten specific file types
copy("src/**/*.css").to("styles"); // All CSS → dist/styles/
copy("images/**/*.{png,jpg,svg}").to("assets"); // All images → dist/assets/
```

### Multiple Copy Operations

You can add multiple copy plugins for different copy operations:

```ts
export default defineConfig({
	plugins: [
		copy("README.md"),
		copy("assets/**/*").to("static"),
		copy("docs/**/*.md").to("documentation"),
	],
});
```

## Transform Files

Transform files on the fly during the copy operation using the `transform()` method. The transform function receives a context object with file content, paths, and build options.

```ts
// Simple transformation - minify JSON files
copy("data/**/*.json").transform(({ content }) => {
	// Return content only - keeps original filename
	return JSON.stringify(JSON.parse(content.toString()));
});

// Transform with filename change - TypeScript to JavaScript
copy("scripts/**/*.ts").transform(async ({ content, path }) => {
	const transpiler = new Bun.Transpiler({ loader: "ts" });

	// Return object to change both content and filename
	return {
		content: transpiler.transformSync(content.toString()),
		filename: basename(path).replace(".ts", ".js"),
	};
});

// Access full context including build options
copy("config/**/*").transform(({ content, path, destination, options }) => {
	// options contains build configuration (outDir, minify, etc.)
	// destination is where the file will be written
	const processed = content
		.toString()
		.replace("__BUILD_MODE__", options.watch ? "development" : "production")
		.replace("__OUT_DIR__", options.outDir);

	return processed;
});
```

## Options

The copy plugin supports additional options via the `with()` method to customize copy behavior.

### `followSymlinks`

Whether to follow symbolic links when copying files. By default, symbolic links are not followed.

```ts [bunup.config.ts]
copy("assets/**/*").with({
	followSymlinks: true,
});
```

### `excludeDotfiles`

Whether to exclude dotfiles (files starting with a dot) from being copied. By default, dotfiles are included in the copy operation.

```ts [bunup.config.ts]
copy("assets/**/*").with({
	excludeDotfiles: true,
});
```

### `override`

Whether to override existing files in the destination. By default, existing files are overwritten.

```ts [bunup.config.ts]
// Skip files that already exist in the destination
copy("assets/**/*").with({
	override: false,
});
```

### `watchMode`

Controls the behavior of the copy plugin in watch mode. Available options:

- `'changed'` (default): Only copy files that have been modified since the last build
- `'always'`: Copy all files on every build, regardless of changes
- `'skip'`: Skip copying entirely in watch mode

```ts [bunup.config.ts]
// Only copy changed files in watch mode (default)
copy("assets/**/*").with({
	watchMode: "changed",
});

// Always copy all files, even in watch mode
copy("config/**/*").with({
	watchMode: "always",
});

// Skip copying in watch mode (useful for large static assets)
copy("videos/**/*").with({
	watchMode: "skip",
});
```
