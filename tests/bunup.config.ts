import { defineConfig } from '../src'
import { copy, exports } from '../src/plugins/built-in'

export default defineConfig({
	entry: [
		'fixtures/index.ts',
		'fixtures/client/index.ts',
		'fixtures/server/index.ts',
	],
	format: ['esm'],
	dts: true,
	plugins: [copy(['fixtures/**/*.css'], 'dist/cool'), exports()],
})
