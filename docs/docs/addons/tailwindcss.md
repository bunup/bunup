# Tailwind CSS

The official Bunup plugin for Tailwind CSS v4. No PostCSS setup. No extra config. It just works.

## Quick Start

Install the plugin:

```bash
bun add --dev @bunup/plugin-tailwindcss
```

Add it to your Bunup configuration:

```ts [bunup.config.ts]
import { defineConfig } from 'bunup';
import { tailwindcss } from '@bunup/plugin-tailwindcss';

export default defineConfig({
  entry: 'src/index.tsx',
  plugins: [tailwindcss()],
});
```

Create a CSS file and import Tailwind:

```css [src/styles.css]
@import "tailwindcss";
```

Import the CSS file in your entry point and use Tailwind in your components:

```tsx [src/index.tsx]
import './styles.css';

export function Button(): React.ReactNode {
  return (
    <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
      Click me
    </button>
  );
}
```

Run the build:

```sh
bun run build # bunup src/index.tsx
```

That is it. You will find the compiled CSS in your output directory as `index.css`:

```plaintext {3}
dist/
├── index.js
└── index.css
```

You can use all Tailwind CSS (v4) features as usual. Bunup handles processing automatically and ensures broad browser compatibility with syntax lowering and vendor prefixing. See the CSS guide's [Browser Compatibility](/docs/guide/css#browser-compatibility) section.

## React Component Library

Style your React component library with Tailwind without requiring consumers to install Tailwind. The plugin outputs scoped, tree‑shaken CSS that works anywhere.

Scoping CSS classes is essential to prevent conflicts when your library's classes, such as `bg-red-500`, collide with a consumer's existing Tailwind setup if they are using Tailwind in their project. By implementing proper scoping, you can avoid unexpected style overrides and ensure your library's styling remains isolated and predictable.

Use Tailwind's [prefix](https://tailwindcss.com/docs/upgrade-guide#using-a-prefix) feature to scope your classes. In your entry CSS file, add a prefix with your project name. Example using yuku:

```css
@import "tailwindcss" prefix(yuku);
```

Then use the prefixed classes in your components:

```tsx [src/components/button.tsx]
export function Button() {
  return (
    <button className="yuku:bg-blue-500 yuku:hover:bg-blue-600 yuku:text-white yuku:px-4 yuku:py-2 yuku:rounded-md">
      Click me
    </button>
  );
}
```

and when you run the build, the compiled css file in the output directory (index.css) will look like this:

```css [dist/index.css]
@layer theme {
  :root,
  :host {
    --yuku-color-blue-500: oklch(62.3% 0.214 259.815);
    --yuku-color-blue-600: oklch(54.6% 0.245 262.881);
    --yuku-color-white: #fff;
    --yuku-spacing: 0.25rem;
    --yuku-radius-md: 0.375rem;
  }
}

@layer base, components;

@layer utilities {
  .yuku\:rounded-md {
    border-radius: var(--yuku-radius-md);
  }

  .yuku\:bg-blue-500 {
    background-color: var(--yuku-color-blue-500);
  }

  .yuku\:px-4 {
    padding-inline: calc(var(--yuku-spacing) * 4);
  }

  .yuku\:py-2 {
    padding-block: calc(var(--yuku-spacing) * 2);
  }

  .yuku\:text-white {
    color: var(--yuku-color-white);
  }

  @media (hover: hover) {
    .yuku\:hover\:bg-blue-600:hover {
      background-color: var(--yuku-color-blue-600);
    }
  }
}
```

Everything is scoped and clean, with only the CSS your components use. Focus on building.

## Distributing CSS

Your output directory includes a compiled `index.css`. Export it for consumers:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/index.css" // [!code ++]
  }
}
```

Consumers can import your styles:

```js
import 'your-package/styles.css';
import { Button } from 'your-package';

<Button />
```

::: tip
Use the [inject option](/docs/addons/tailwindcss#inject) to bundle CSS directly into JavaScript so users do not need a separate CSS import.
:::

## Options

Configure the plugin with these options.

### `inject`

Inject the generated CSS into the document head at runtime. The CSS ships inside your JavaScript bundle and loads automatically.

```ts
tailwindcss({
  inject: true,
})
```

With inject enabled, users just import your components:

```js
import { Button } from 'your-package';

<Button />;
```

### `minify`

Minify the generated CSS to reduce file size.

```ts
tailwindcss({
  minify: true,
})
```

### `preflight`

Include Tailwind's preflight (CSS reset) for consistent base styles.

```ts
tailwindcss({
  preflight: true,
})
```

::: warning
For component libraries it is usually better to keep preflight disabled. Shipping a global reset can affect the consumer's entire app. Prefer emitting only the CSS your components need.
:::

### `postcssPlugins`

Add custom PostCSS plugins to extend processing.

```ts
tailwindcss({
  postcssPlugins: [
    /* your PostCSS plugins */
  ],
})
```
