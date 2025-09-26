# CSS

Bunup handles CSS automatically. Just import it and it works.

## Quick Start

Import CSS in your TypeScript files:

```typescript [src/index.ts]
import './styles.css';
import { Button } from './components/button';

export { Button };
```

```css [src/styles.css]
.button {
  background-color: #007bff;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
}
```

Bunup automatically bundles your CSS into `dist/index.css` with cross-browser compatibility.

## Entry Points

For separate CSS files, add them as entry points:

```typescript [bunup.config.ts]
import { defineConfig } from 'bunup';

export default defineConfig({
  entry: [
    'src/index.ts', 
    'src/components/button.css'
  ],
});
```

This creates individual CSS files in your build output:

```plaintext
dist/
├── index.js
└── components/
    └── button.css
```

## CSS Modules

CSS modules prevent style conflicts by automatically scoping class names. Just add `.module.css` to your filename:

::: tip
New to CSS modules? Check out [this guide](https://css-tricks.com/css-modules-part-1-need/) to learn what they are and why they're useful.
:::

```css [src/components/button.module.css]
.primary {
  background-color: #007bff;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
}
```

```tsx [src/components/button.tsx]
import styles from "./button.module.css";

export function Button({ children }) {
  return (
    <button className={styles.primary}>
      {children}
    </button>
  );
}
```

That's it! Bunup handles the rest automatically.

### Sharing Styles

Reuse styles with the `composes` property:

```css [src/components/button.module.css] {9,15}
.base {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary {
  composes: base;
  background-color: #007bff;
  color: white;
}

.secondary {
  composes: base;
  background-color: transparent;
  color: #007bff;
  border: 1px solid #007bff;
}
```

**Rules:**
- `composes` must come first in the class
- Works only with single class selectors (not `#id` or `.class1, .class2`)

**From other files:**

```css [src/components/button.module.css] {2}
.primary {
  composes: base from "../shared.module.css";
  background-color: #007bff;
  color: white;
}
```

::: warning
Avoid conflicting properties when composing from separate files.
:::

## Distributing CSS

Export CSS files for package consumers:

```json [package.json]
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

Users can then import your styles:

```javascript
import 'your-package/styles.css';
```

::: tip
Use the [inject styles plugin](/docs/plugins/inject-styles) to bundle CSS directly into JavaScript. No separate imports needed.
:::

## Browser Support

Bunup automatically ensures cross-browser compatibility:

- Converts modern CSS syntax to work in older browsers
- Adds vendor prefixes (`-webkit-`, `-moz-`, etc.) where needed
- Targets: Chrome 87+, Firefox 78+, Safari 14+, Edge 88+

## TypeScript Support

Bunup automatically creates TypeScript definitions for CSS modules. Get autocomplete and type safety for free.

```css [src/components/button.module.css]
.primary {
  background-color: #007bff;
  color: white;
}

.secondary {
  background-color: transparent;
  color: #007bff;
}
```

Bunup generates this TypeScript file:

```ts [src/components/button.module.css.d.ts]
declare const classes: {
  readonly primary: string;
  readonly secondary: string;
};

export default classes;
```

**You get:**
- Autocomplete when typing `styles.`
- Errors for typos like `styles.primry`
- Safe refactoring when renaming CSS classes

### Development

Type definitions generate automatically when you build. For the best experience with CSS modules, use watch mode:

```sh
bunup --watch
```

Watch mode instantly regenerates type definitions when CSS module files change. Change a class name and save, you'll immediately see TypeScript errors wherever the old class name is used.

### Configuration

#### Exclude from Git

Since type definitions are auto-generated, exclude them from version control:

```plaintext [.gitignore]
**/*.module.*.d.ts
```

#### Disable type generation

Turn off automatic type generation if you prefer to handle it manually:

::: code-group

```sh [CLI]
bunup src/index.ts --no-css.typed-modules
```

```ts [bunup.config.ts]
import { defineConfig } from 'bunup';

export default defineConfig({
  css: {
    typedModules: false
  }
});
```

:::
