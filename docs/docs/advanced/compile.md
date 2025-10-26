# Compile to Executable

Bunup supports creating standalone executables using the `compile` option. This allows you to bundle your code and the Bun runtime into a single executable file that can be distributed and run without requiring Bun to be installed.

## Use Case

The `compile` option is useful when you want to:

- Distribute CLI tools that users can run without installing Bun
- Create standalone executables for scripts and utilities
- Package your code with all dependencies included

## Output Directory

Compiled executables output to `bin/` by default, unlike normal builds which output to `dist/` by default. If you want to change the output location, you can use the `outDir` option to specify a different directory like `dist/` or any other location.

## Basic Usage

```typescript [bunup.config.ts]
export default defineConfig({
  entry: 'src/cli.ts',
  compile: true, // Create executable for current platform
});
```

This will output the executable to the `bin/` directory.

## Customizing Output Directory

You can change the output directory using the `outDir` option:

```typescript [bunup.config.ts]
export default defineConfig({
  entry: 'src/cli.ts',
  compile: true,
  outDir: 'dist', // Output to dist/ instead of bin/
});
```

## Cross-Compilation

Target specific platforms:

```typescript [bunup.config.ts]
export default defineConfig({
  entry: 'src/cli.ts',
  compile: 'bun-linux-x64', // Cross-compile for Linux
});
```

## Advanced Configuration

```typescript [bunup.config.ts]
export default defineConfig({
  entry: 'src/cli.ts',
  compile: {
    target: 'bun-linux-x64',
    outfile: './bin/my-app',
    windows: {
      hideConsole: true,
      icon: './icon.ico',
    },
  },
});
```

## Multiple Entrypoints

Only one entrypoint can be compiled at a time. If you want to compile multiple entrypoints, you need to use a build config array with separate configurations:

```typescript [bunup.config.ts]
export default defineConfig([
  {
    name: 'main',
    entry: 'src/main.ts',
    compile: true,
  },
  {
    name: 'cli',
    entry: 'src/cli.ts',
    compile: {
      outfile: 'my-cli',
    },
  },
]);
```

This will create separate executables for each entrypoint.

## Cross-Compiling for Multiple Targets

If you want to cross-compile the same entrypoint for multiple targets, or use different configurations for different targets, you can create separate objects in the config array:

```typescript [bunup.config.ts]
export default defineConfig([
  {
    name: 'cli-linux',
    entry: 'src/cli.ts',
    compile: 'bun-linux-x64',
  },
  {
    name: 'cli-windows',
    entry: 'src/cli.ts',
    compile: {
      target: 'bun-windows-x64',
      outfile: './bin/my-app-windows.exe',
      windows: {
        hideConsole: true,
        icon: './icon.ico',
      },
    },
  },
  {
    name: 'cli-macos',
    entry: 'src/cli.ts',
    compile: {
      target: 'bun-darwin-arm64',
      outfile: './bin/my-app-macos',
    },
  },
]);
```

This approach allows you to:
- Build executables for multiple platforms in a single build command
- Apply platform-specific configurations (like Windows console hiding or custom icons)
- Customize the output filename for each target platform

## Mixing Executables and Library Builds

You can also mix executable compilation with normal library builds in the same config array. This is useful when you want to build both a library and CLI tools:

```typescript [bunup.config.ts]
export default defineConfig([
  {
    name: 'library',
    entry: 'src/index.ts',
    format: ['esm', 'cjs'],
    dts: true,
    // Normal library build
  },
  {
    name: 'cli',
    entry: 'src/cli.ts',
    compile: true,
    // Compile to executable
  },
]);
```

This allows you to build your library and create executables in a single build process.

## Learn More

For detailed information about available targets and configuration options, see the [Bun documentation on executables](https://bun.com/docs/bundler/executables).
