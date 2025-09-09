# Inject Styles

## What does it do?

The `injectStyles` plugin automatically includes your CSS styles in your JavaScript bundle, so users don't need to manually import CSS files. Instead of creating separate `.css` files, your styles become part of your JavaScript code.

## How it works

Instead of creating separate CSS files, `injectStyles` converts your CSS into JavaScript code that creates `<style>` tags in the browser. When someone imports your library, the styles are automatically injected into the page.

## Before vs After

### Without `injectStyles`
Your build creates separate files:
```
dist/
├── index.js          ← Your JavaScript
└── index.css         ← Your CSS (separate file)
```

Users must import both:

```javascript {2}
import { Button } from 'my-library';
import 'my-library/dist/index.css';
```

### With `injectStyles`
Your build creates only JavaScript:
```
dist/
└── index.js          ← Your JavaScript + CSS combined
```

Users only import JavaScript:

```javascript
import { Button } from 'my-library';
// CSS is automatically included! ✨
```

## Usage

The plugin uses LightningCSS under the hood. Install it as a dev dependency:

```bash
bun add --dev lightningcss
```

Then add the plugin to your config:

```ts [bunup.config.ts]
import { defineConfig } from 'bunup';
import { injectStyles } from 'bunup/plugins';

export default defineConfig({
  entry: 'src/index.ts',
  plugins: [injectStyles()],
});
```

That's it! Your CSS will be automatically included in your JavaScript bundle.

## Advanced

### Custom Injection

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

### LightningCSS Options

The plugin also passes options directly to LightningCSS. Available options include:

- `minify`: Controls whether the CSS should be minified (enabled by default)
- `targets`: Specifies browser targets for CSS feature compatibility

For a complete list of LightningCSS options, refer to the [Lightning CSS documentation](https://lightningcss.dev/docs.html).
