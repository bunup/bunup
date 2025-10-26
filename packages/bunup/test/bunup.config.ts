import { defineConfig } from '../src'

export default defineConfig([
	{
		name: 'main',
		entry: 'fixtures/main.ts',
		compile: 'bun-darwin-x64-baseline',
	},
	{
		name: 'root',
		entry: 'fixtures/nice/index.ts',
		compile: {
			outfile: 'cool',
		},
	},
])
