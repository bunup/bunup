# Tailwind CSS

Bunup has first-class support for Tailwind CSS. This means you can style your components completely with modern Tailwind CSS when building component libraries, such as React component libraries. The best part is that consumers of your library don't need to install or configure Tailwind CSS in their own projects.

## How it works

You just use tailwindcss v4 to style your components as exactly how you use tailwindcss, no changes, css first config, and you style components using tailwind classes, and using all tailwindcss benefits, i mean exactly how you use tailwindcss, and Bunup handle the rest for you at build time, Bunup will process them and bundle them to single css index.css to build output, while handling scoping, the one concern of you was i know like, for example if we use "text-sm", what if your component library using in a already tailwind using project, the text-sm will conflict with the text-sm in their project? No, bunup will scope your class, You just don't need to worry about it, You use tailwindcss as how you usually use it, Bunup will change the class names and etc scope, like change the "text-sm" to something like "your-app-name-kwem4nlk3[random]-text-sm" as well as in the bundled css at build time. All very fast!

## Usage

First, you need to install Bunup's official tailwindcss plugin:

```sh
bun add --dev @bunup/plugin-tailwind
```

Then, add it to your bunup configuration:

```typescript [bunup.config.ts]
import { defineConfig } from "bunup";
import tailwindcss from "@bunup/plugin-tailwind";

export default defineConfig({
  entry: "src/index.tsx",
  plugins: [tailwindcss()],
});
```

Now, create a css file with this intial content:

```css [src/styles.css]
@layer theme, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
```

Make sure to import this CSS file in your main entry file:

```tsx [src/index.tsx]
import './styles.css';
import { Button } from './components/button';

export { Button };
```

Now, you can use tailwindcss in your components:

```tsx
import { Button } from './button';

export function Button() {
  return <button className="bg-blue-500 text-white p-2 rounded">Click me</button>;
}
```

and you build your components with tailwindcss.

And when you build, at build time, bunup will handle scoping, and you will get a single css file in your build output.

for example:

```js [dist/index.js]
```

and you can export the css from your library, like this:

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
