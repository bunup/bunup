# Inject Styles

The `injectStyles` plugin transforms CSS imports (like `import "./styles.css"`) or CSS entries into JavaScript code that automatically injects styles into the document head at runtime. This is particularly useful for component libraries where styles should be automatically applied without requiring users to manually include CSS files.

## Installation

The plugin uses LightningCSS under the hood. Install it as a dev dependency:

```bash
bun add --dev lightningcss
```

## Usage

```ts [bunup.config.ts]
import { defineConfig } from 'bunup';
import { injectStyles } from 'bunup/plugins';

export default defineConfig({
  entry: 'src/index.ts',
  plugins: [injectStyles()],
});
```

CSS imports in your code will be automatically processed:

```ts [src/index.ts]
// These CSS imports will be transformed into JavaScript code
// that injects the styles into <head> at runtime
import "./styles.css";
import "./components/button.css";

export { Button } from "./components/Button";
```

Instead of bundling CSS files to build output, the styles will be embedded as JavaScript code that creates `<style>` tags in the document head.

## Custom Injection

By default, bunup uses its own `injectStyle` function that creates a `<style>` tag and appends it to the document head. You can provide your own injection logic using the `inject` option to customize how styles are applied to the document.

The `inject` function receives the processed CSS string (already JSON stringified) and the original file path, and should return JavaScript code that will inject the styles when executed.

```ts [bunup.config.ts]
import { defineConfig } from 'bunup';
import { injectStyles } from 'bunup/plugins';

export default defineConfig({
  entry: 'src/index.ts',
  plugins: [
    injectStyles({
      inject: (css, filePath) => {
        return `
          const style = document.createElement('style');
          style.setAttribute('data-source', '${filePath}');
          style.textContent = ${css};
          document.head.appendChild(style);
        `;
      }
    })
  ],
});
```

:::info
The above example is basic. The default injection handles cases like when `document` is undefined (e.g., server-side rendering) and compatibility with older browsers. Consider these when implementing custom injection logic.
:::

## Other Options

The plugin also passes options directly to LightningCSS. Available options include:

- `minify`: Controls whether the CSS should be minified (enabled by default)
- `targets`: Specifies browser targets for CSS feature compatibility

For a complete list of LightningCSS options, refer to the [Lightning CSS documentation](https://lightningcss.dev/docs.html).
