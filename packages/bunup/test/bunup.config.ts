import { defineWorkspace } from '../src'

export default defineWorkspace([
	{
		name: 'first',
		root: 'fixtures',
		config: [
			{
				entry: ['index.tsx'],
				format: 'esm',
				target: 'node',
			},
			{
				entry: ['index.tsx'],
				format: ['esm', 'iife'],
				target: 'browser',
				outDir: 'dist/browser',
			},
		],
	},
])
