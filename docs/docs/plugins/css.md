# CSS Plugins

CSS plugins enable seamless integration of stylesheets into your JavaScript/TypeScript bundles.

::: tip
If you have suggestions or ideas for CSS plugins, please [open a new issue](https://github.com/arshad-yaseen/bunup/issues/new).
:::

## `injectStyles`

The `injectStyles` plugin transforms CSS files and automatically injects them into the document head at runtime. This is particularly useful when building component libraries where you want styles to be automatically applied when components are used.

### Installation

The `injectStyles` plugin uses LightningCSS under the hood. You'll need to install it as a dev dependency:

::: code-group

```bash [npm]
npm install --save-dev lightningcss
```

```bash [yarn]
yarn add --dev lightningcss
```

```bash [pnpm]
pnpm add --save-dev lightningcss
```

```bash [bun]
bun add --dev lightningcss
```

:::

### Usage

```ts
import { defineConfig } from 'bunup';
import { injectStyles } from 'bunup/plugins';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  plugins: [injectStyles()],
});
```

With this configuration, any imported CSS files will be transformed and injected into the document head when your JavaScript code runs.

### Options

The plugin leverages [Lightning CSS](https://lightningcss.dev/docs) for transformations and accepts most Lightning CSS transformation options including:

- `minify`: Controls whether the CSS should be minified
- `targets`: Specifies browser targets for CSS feature compatibility

For a complete list of transformation options, refer to the [Lightning CSS documentation](https://lightningcss.dev/docs).
