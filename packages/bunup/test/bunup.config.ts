import { defineConfig } from '../src'
import { copy, exports, unused } from '../src/plugins'

export default defineConfig({
	entry: ['fixtures/index.ts'],
	format: ['esm', 'cjs'],
	splitting: true,
	plugins: [unused(), exports(), copy('tsconfig.json')],
})
