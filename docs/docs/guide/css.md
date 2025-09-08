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
  entry: ['src/index.ts', 'src/components/button.css', 'src/components/alert.css'],
});
```

Specifying CSS files as entry points will create separate CSS files in the build output for each entry point. In this example, `dist/components/button.css`, and `dist/components/alert.css` will be created.

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

Unlike specifying CSS files as entry points, if you import CSS files in your JavaScript/TypeScript files, Bunup will bundle them together into a single CSS file named `index.css` in the build output.

## CSS Modules

Bunup supports CSS modules out of the box with zero configuration. CSS modules automatically scope class names to prevent collisions.

### Getting Started

Create a CSS file with the `.module.css` extension:

```css [styles.module.css]
.button {
  color: red;
  padding: 8px 16px;
}
```

```css [other-styles.module.css]
.button {
  color: blue;
  padding: 12px 20px;
}
```

Import and use the CSS module in your component:

```tsx [src/components/Button.tsx]
import styles from "./styles.module.css";
import otherStyles from "./other-styles.module.css";

export function Button() {
  return (
    <>
      <button className={styles.button}>Red button!</button>
      <button className={otherStyles.button}>Blue button!</button>
    </>
  );
}
```

The imported styles object contains unique identifiers for each class:

```javascript
console.log(styles);
// Output: { button: "button_123" }

console.log(otherStyles);
// Output: { button: "button_456" }
```

### Composition

CSS modules support the `composes` property to reuse style rules across multiple classes:

```css [styles.module.css]
.button {
  composes: background;
  color: red;
}

.background {
  background-color: blue;
}
```

This is equivalent to:

```css
.button {
  background-color: blue;
  color: red;
}

.background {
  background-color: blue;
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

```css [background.module.css]
.background {
  background-color: blue;
}
```

```css [styles.module.css]
.button {
  composes: background from "./background.module.css";
  color: red;
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

## Browser Compatibility

Bunup automatically handles browser compatibility by:

- **Syntax Lowering**: Converts modern CSS syntax into backwards-compatible equivalents
- **Vendor Prefixing**: Automatically adds vendor prefixes where needed
- **Target Browsers**: By default, targets ES2020 and modern browsers:
  - Edge 88+
  - Firefox 78+
  - Chrome 87+
  - Safari 14+

## TypeScript

When using CSS modules with TypeScript, you may encounter import errors. To resolve this, create a global type declaration file:

```typescript [global.d.ts]
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
```

This declaration file tells TypeScript that CSS module imports return an object with string keys and values, allowing you to use CSS modules without type errors.
