# CSS

Bunup supports CSS out of the box with powerful bundling capabilities.

## Usage

You can provide CSS files as entry points or import CSS files in your JavaScript/TypeScript files. 

All CSS files encountered during the build process are bundled into cross-browser compatible CSS files in the build output with vendor prefixing and syntax lowering.

### CSS Entry Points

You can specify CSS files as entry points in your configuration:

```typescript [bunup.config.ts]
import { defineConfig } from 'bunup';

export default defineConfig({
  entry: [
    'src/index.ts', 
    'src/components/button.css', 
    'src/components/alert.css'
  ],
});
```

Specifying CSS files as entry points will create separate CSS files in the build output for each entry point. 

In this example:

```plaintext
dist/
├── index.js
├── components/
│   ├── button.css
│   └── alert.css
```

### Importing CSS in JavaScript/TypeScript

The most common approach is importing CSS files in your main entry point, especially when building component libraries:

```typescript [src/index.tsx]
import './styles.css';
import { Button } from './components/Button';

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

.button:hover {
  background-color: #0056b3;
}
```

Unlike specifying CSS files as entry points, if you import CSS files in your JavaScript/TypeScript files, Bunup will bundle them together into a single CSS file named `index.css` in the build output:

```plaintext
dist/
├── index.js
└── index.css
```

## CSS Modules

Bunup supports CSS modules out of the box with zero configuration. CSS modules automatically scope class names to prevent collisions.

### Getting Started

Create a CSS file with the `.module.css` extension:

```css [Button.module.css]
.primary {
  background-color: #007bff;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
}

.secondary {
  background-color: transparent;
  color: #007bff;
  padding: 8px 16px;
  border: 1px solid #007bff;
  border-radius: 4px;
}
```

Import and use the CSS module in your component:

```tsx [src/components/Button.tsx]
import styles from "./Button.module.css";

export function Button({ variant = "primary", children }) {
  return (
    <button className={styles[variant]}>
      {children}
    </button>
  );
}
```

### Composition

CSS modules support the `composes` property to reuse style rules across multiple classes:

```css [Button.module.css]
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

#### Composition Rules

- The `composes` property must come before any regular CSS properties
- You can only use `composes` on simple selectors with a single class name

```css
/* Invalid - not a class selector */
#button {
  composes: background;
}

/* Invalid - not a simple selector */
.button,
.button-secondary {
  composes: background;
}

/* Valid */
.button {
  composes: background;
}
```

#### Composing from Separate Files

You can compose classes from separate CSS module files:

```css [shared.module.css]
.base {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
```

```css [Button.module.css]
.primary {
  composes: base from "./shared.module.css";
  background-color: #007bff;
  color: white;
  border: none;
}
```

::: warning
When composing classes from separate files, ensure they don't contain conflicting properties, as this can lead to undefined behavior.
:::

## CSS Exports

When you include CSS files as entry points, they are bundled and available for consumers to import. You can export CSS files in your package's exports field:

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

Consumers can then import your CSS in their applications:

```javascript
import 'your-package/styles.css';
```

When using the [exports plugin](/docs/plugins/exports), CSS entry points are automatically added to your package's exports field.

Alternatively, you can use the [inject styles plugin](/docs/plugins/inject-styles) to automatically include CSS in your JavaScript bundle, eliminating the need for consumers to manually import CSS files.

## Browser Compatibility

Bunup automatically handles browser compatibility by:

- **Syntax Lowering**: Converts modern CSS syntax into backwards-compatible equivalents
- **Vendor Prefixing**: Automatically adds vendor prefixes where needed
- **Target Browsers**: By default, targets ES2020 and modern browsers:
  - Edge 88+
  - Firefox 78+
  - Chrome 87+
  - Safari 14+

## CSS Modules and TypeScript

When using CSS modules with TypeScript, you may encounter import errors. To resolve this, create a global type declaration file:

```typescript [global.d.ts]
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
```

Make sure to include this file in your TypeScript configuration:

```json [tsconfig.json]
{
  "include": [
    "src/**/*",
    "global.d.ts"
  ]
}
```

This declaration file tells TypeScript that CSS module imports return an object with string keys and values, allowing you to use CSS modules without type errors.
