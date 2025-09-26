# Tailwind CSS

The official Bunup plugin for creating component libraries with Tailwind CSS.

## Quick Start

Install the official plugin:

```bash
bun add --dev @bunup/plugin-tailwindcss
```

Add the plugin to your Bunup configuration:

```ts [bunup.config.ts]
import { defineConfig } from 'bunup';
import { tailwindcss } from '@bunup/plugin-tailwindcss';

export default defineConfig({
	entry: 'src/index.ts',
	plugins: [tailwindcss()],
});
```
