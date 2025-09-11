# Inject Styles

## What does it do?

The `injectStyles` plugin automatically includes your CSS styles in your JavaScript bundle, so users don't need to manually import CSS files. Instead of creating separate `.css` files, your styles become part of your JavaScript code.

## How it works

Instead of emitting separate CSS files, `injectStyles` converts your CSS into JavaScript that creates `<style>` tags in the browser. When someone imports your library, the styles are automatically injected into the page.

## Before vs After

### Without `injectStyles`

Your build creates separate files:

```
dist/
├── index.js
└── index.css
```

Users must import both:

```javascript
import { Button } from 'my-library';
import 'my-library/dist/index.css';
```

### With `injectStyles`

Your build emits only JavaScript (CSS is inlined):

```
dist/
└── index.js
```

Users only import JavaScript, CSS is automatically included:

```javascript
import { Button } from 'my-library';
```

## Usage

Just add the `injectStyles` plugin to your config.

```ts [bunup.config.ts]
import { defineConfig } from 'bunup';
import { injectStyles } from 'bunup/plugins';

export default defineConfig({
  entry: 'src/index.ts',
  plugins: [injectStyles()],
});
```

That's it! Your CSS will be automatically included in your JavaScript bundle.

::: info
Injected CSS is processed for broad browser compatibility (syntax lowering, vendor prefixing, etc.), as described in the [CSS guide’s Browser Compatibility section](/docs/guide/css#browser-compatibility).
:::

## Options

### `minify`

Minifies injected CSS by default. Set `minify: false` to disable.

```ts [bunup.config.ts]
import { defineConfig } from 'bunup';
import { injectStyles } from 'bunup/plugins';

export default defineConfig({
  entry: 'src/index.ts',
  plugins: [
    injectStyles({
      minify: false,
    })
  ],
});
```

## Advanced Options

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
The above example is basic. The default injection handles cases such as when `document` is undefined (e.g., server-side rendering) and compatibility with older browsers. Consider these when implementing custom injection logic.
:::
