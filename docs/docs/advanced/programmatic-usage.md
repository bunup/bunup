# Programmatic Usage

Bunup can be used programmatically in your scripts. This is useful when you need custom build workflows or want to integrate bunup into your own tools.

::: info
The build function must be run in the Bun runtime.
:::

## Basic Usage

```typescript
import { build } from 'bunup';

await build({
  entry: 'src/index.ts',
});
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

The full type definition can be found in the [bunup source code](https://github.com/bunup/bunup/blob/main/src/options.ts#L70).

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
    	minify: true,
     	targets: { chrome: 95 }
   	})
  ]
});
```
