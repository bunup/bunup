import { tailwindcss } from '@bunup/plugin-tailwindcss'
import { defineConfig } from '../src'

export default defineConfig({
	entry: ['fixtures/index.tsx'],
	plugins: [
		tailwindcss({
			minify: true,
		}),
	],
})
