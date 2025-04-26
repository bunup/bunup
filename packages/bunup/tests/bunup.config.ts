import { defineConfig } from '../dist/index.js'

export default defineConfig({
	entry: ['fixtures/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	// plugins: [report()],
})
