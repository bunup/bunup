import { defineConfig } from '../src'

export default defineConfig({
	name: 'esm',
	entry: ['fixtures/main.ts', 'fixtures/nice/index.ts'],
	exports: true,
})
