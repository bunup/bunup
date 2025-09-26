# Programmatic Usage

Bunup can be used programmatically in your scripts. This is useful when you need custom build workflows or want to integrate bunup into your own tools.

::: info
The build function must be run in the Bun runtime.
:::

## Basic Usage

```typescript
import { build } from 'bunup';

const output = await build({
  entry: 'src/index.ts',
});

console.log('Built files:', output.files);
```

## Build Output

The `build` function returns a `BuildOutput` object containing information about the generated files:

```typescript
type BuildOutput = {
  /** Array of generated files with their paths and metadata */
  files: BuildOutputFile[]
}

type BuildOutputFile = {
  /** The entry point for which this file was generated (undefined for chunks/assets) */
  entrypoint: string | undefined
  /** The kind of the file */
  kind: 'entry-point' | 'chunk' | 'asset' | 'sourcemap' | 'bytecode'
  /** Absolute path to the generated file */
  fullPath: string
  /** Path relative to the root directory */
  pathRelativeToRootDir: string
  /** Path relative to the output directory */
  pathRelativeToOutdir: string
  /** Whether the file is a TypeScript declaration file */
  dts: boolean
  /** The format of the output file */
  format: Format
}
```

## Options

The build function accepts the same options as `defineConfig`. See the [Options Guide](/docs/guide/options) for detailed documentation of all available options.

For TypeScript users, the `BuildOptions` type is available:

```typescript
import { build, type BuildOptions } from 'bunup';

const options: BuildOptions = {
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
};

await build(options);
```

The full type definition can be found in the [bunup source code](https://github.com/bunup/bunup/blob/454c78fad5d9c79f2d4472f1f6d9c6137a54cd75/packages/bunup/src/options.ts#L77).

## Custom Root Directory

The build function accepts an optional second parameter to specify a custom root directory. By default, it uses `process.cwd()`.

```typescript
import { build } from 'bunup';

await build({
  entry: 'src/index.ts',
}, '/path/to/your/project');

await build({
  entry: 'src/index.ts',
}, './my-project');
```

## Using Plugins

Plugins can be used programmatically the same way they are used in the configuration file:

```typescript
import { build } from 'bunup';
import { injectStyles } from 'bunup/plugins';

await build({
  entry: 'src/index.ts',
  plugins: [
    injectStyles({
      minify: false,
    })
  ]
});
```
