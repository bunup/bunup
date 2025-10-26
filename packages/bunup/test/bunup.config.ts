import { defineConfig } from '../src'

export default defineConfig([
	{
		name: 'root',
		entry: ['fixtures/nice/index.ts'],
		sourceBase: 'fixtures/nice',
		exports: {
			exclude: ['./fixtures/**/**'],
		},
	},
])
