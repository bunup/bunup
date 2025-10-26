import { defineConfig } from '../src'

export default defineConfig([
	{
		name: 'main',
		entry: 'fixtures/main.ts',
		compile: 'bun-windows-x64',
	},
	{
		name: 'root',
		entry: 'fixtures/nice/index.ts',
		compile: true,
	},
])
