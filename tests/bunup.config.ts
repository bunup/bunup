import { defineConfig } from '../dist/index.js'
import { report } from '../dist/plugins.js'

export default defineConfig({
	entry: ['fixtures/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	plugins: [report()],
	splitting: false,
})
