import { defineConfig } from '../src'

export default defineConfig({
	entry: ['fixtures/index.tsx'],
	format: ['esm', 'cjs'],
	name: 'bunup',
})
