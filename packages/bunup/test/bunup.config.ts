import { defineConfig } from '../src'

export default defineConfig([
	{
		name: 'root',
		entry: ['fixtures/nice/index.ts'],
	},
	{
		name: 'main',
		entry: ['fixtures/main.ts'],
	},
])
