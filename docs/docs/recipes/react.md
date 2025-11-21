# React

Build a production-ready React component library with Bunup in minutes. Zero config. Just works.

## Quick Start

Scaffold a minimal starter or publish-ready React component library in seconds:

```sh
bunx @bunup/cli@latest create
```

Select **React Component Library** from the options. Now you're ready to build components.

## Creating Components

Create your first component:

```tsx [src/components/button.tsx]
export function Button(props: React.ComponentProps<'button'>): React.ReactNode {
  return <button type="button" {...props} />
}
```

Export it from your entry point:

```tsx [src/index.tsx]
export { Button } from './components/button'
```

Build it:

```bash
bunx bunup
```

Your component is now compiled in `dist/index.js` with TypeScript declarations in `dist/index.d.ts`.

## Styling Options

Bunup supports multiple styling approaches out of the box. Choose what works best for your library.

### Pure CSS

Import CSS directly in your components. Bunup bundles everything automatically.

```css [src/styles.css]
[data-slot="button"] {
  background: hsl(211, 100%, 50%);
  color: white;
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

[data-slot="button"]:hover {
  background: hsl(211, 100%, 45%);
}
```

```tsx [src/components/button.tsx]
export function Button(props: React.ComponentProps<'button'>): React.ReactNode {
  return <button type="button" data-slot="button" {...props} />
}
```

```tsx [src/index.tsx]
import './styles.css'

export { Button } from './components/button'
```

Your CSS is automatically bundled into `dist/index.css` with cross-browser compatibility. Learn more about [CSS support](/docs/guide/css).

### CSS Modules

Get automatic class name scoping with CSS modules. Just use `.module.css`:

```css [src/components/button.module.css]
.button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: white;
}

.primary {
  background-color: #007bff;
}

.primary:hover {
  background-color: #0056b3;
}
```

```tsx [src/components/button.tsx]
import styles from './button.module.css'

export function Button(props: React.ComponentProps<'button'>): React.ReactNode {
  return (
    <button
      type="button"
      className={`${styles.button} ${styles.primary}`}
      {...props}
    />
  )
}
```

TypeScript definitions are generated automatically - you get full autocomplete and type safety. Learn more about [CSS modules](/docs/guide/css#css-modules).

### Tailwind CSS

Use Tailwind CSS v4 with zero PostCSS configuration. Your components work everywhere - consumers don't need Tailwind installed.

Install the Tailwind CSS plugin:

```bash
bun add --dev @bunup/plugin-tailwindcss
```

Add it to your config:

```ts [bunup.config.ts]
import { defineConfig } from 'bunup'
import { tailwindcss } from '@bunup/plugin-tailwindcss'

export default defineConfig({
  plugins: [tailwindcss()],
})
```

Create your styles with a scoped prefix to prevent conflicts:

```css [src/styles.css]
@import "tailwindcss" prefix(mylib);
```

Use prefixed classes in your components:

```tsx [src/components/button.tsx]
export function Button(props: React.ComponentProps<'button'>): React.ReactNode {
  return (
    <button
      type="button"
      className="mylib:bg-blue-500 mylib:hover:bg-blue-600 mylib:text-white mylib:px-4 mylib:py-2 mylib:rounded-md"
      {...props}
    />
  )
}
```

```tsx [src/index.tsx]
import './styles.css'

export { Button } from './components/button'
```

The plugin outputs scoped, tree-shaken CSS. Only the classes you use are included, and the prefix prevents conflicts with consumer applications. Learn more about the [Tailwind CSS plugin](/docs/builtin-plugins/tailwindcss).

## Distribution

Configure your `package.json` for npm publishing:

```json [package.json]
{
  "name": "my-component-library",
  "version": "1.0.0",
  "type": "module",
  "files": [
    "dist"
  ],
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    },
    "./styles.css": "./dist/index.css",
    "./package.json": "./package.json"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

Consumers import your library like this:

```tsx
import 'my-component-library/styles.css'
import { Button } from 'my-component-library'

function App() {
  return <Button>Click me</Button>
}
```

### Inject Styles <Badge>Optional</Badge>

Want to skip the separate CSS import? Use the [inject styles](/docs/extra-options/inject-styles) option to bundle CSS directly into JavaScript:

::: code-group

```sh [CLI]
bunup --css.inject
```

```ts [bunup.config.ts]
import { defineConfig } from 'bunup'

export default defineConfig({
  css: {
    inject: true,
  },
})
```

:::

Or with the Tailwind CSS plugin:

```ts [bunup.config.ts]
import { defineConfig } from 'bunup'
import { tailwindcss } from '@bunup/plugin-tailwindcss'

export default defineConfig({
  plugins: [
    tailwindcss({
      inject: true,
    })
  ],
})
```

Now consumers only need to import your components:

```tsx
import { Button } from 'my-component-library'

function App() {
  return <Button>Click me</Button>
}
```

Styles are automatically injected at runtime.

## React Compiler

Optimize your React components automatically with the React Compiler plugin. It intelligently memoizes components and hooks to minimize unnecessary re-renders without manual `useMemo`, `useCallback`, or `memo` usage. Learn more about the [React Compiler](https://react.dev/learn/react-compiler).

Install the React Compiler plugin:

```bash
bun add --dev @bunup/plugin-react-compiler
```

Add it to your config:

```ts [bunup.config.ts]
import { defineConfig } from 'bunup'
import { reactCompiler } from '@bunup/plugin-react-compiler'

export default defineConfig({
  plugins: [reactCompiler()],
})
```

That's it! Your components are now automatically optimized during the build. Write React code naturally:

```tsx [src/components/counter.tsx]
function ExpensiveComponent({ data, onClick }) {
  const processedData = expensiveProcessing(data);

  const handleClick = (item) => {
    onClick(item.id);
  };

  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} onClick={() => handleClick(item)} />
      ))}
    </div>
  );
}
```

The React Compiler plugin automatically transforms your code to be more performant without changing its behavior.

::: info Build performance
Since the React Compiler uses Babel for transformations, builds will be slightly slower compared to Bunup's normally instant builds. The impact is small but may be more noticeable in larger applications. This trade-off is expected and worth it for the runtime performance improvements your components will gain.
:::

### Configuration Options

Customize which files to process or pass options to the React Compiler:

```ts [bunup.config.ts]
import { defineConfig } from 'bunup'
import { reactCompiler } from '@bunup/plugin-react-compiler'

export default defineConfig({
  plugins: [
    reactCompiler({
      // Only process .tsx files (default: /\.[jt]sx$/)
      filter: /\.tsx$/,

      // React Compiler configuration
      reactCompilerConfig: {
        target: '18',
      },
    }),
  ],
})
```

## Examples

Check out complete examples in the [examples directory](https://github.com/bunup/bunup/tree/main/examples):

- [React with Pure CSS](https://github.com/bunup/bunup/tree/main/examples/react-with-pure-css)
- [React with CSS Modules](https://github.com/bunup/bunup/tree/main/examples/react-with-css-modules)
- [React with Tailwind CSS](https://github.com/bunup/bunup/tree/main/examples/react-with-tailwindcss)
