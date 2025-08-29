import { defineConfig } from '../src'
import { copy, exports, unused } from '../src/plugins'

export default defineConfig({
	entry: [
		'fixtures/index.ts',
		'fixtures/client/index.ts',
		'fixtures/server/index.ts',
	],
	format: ['esm'],
	splitting: true,
	plugins: [unused(), exports(), copy('tsconfig.json')],
})
