import { exports, unused } from './packages/bunup/src/plugins'

export default [
	{
		name: 'bunup',
		root: 'packages/bunup',
		config: {
			target: 'bun',
			entry: ['src/index.ts', 'src/plugins.ts', 'src/cli/index.ts'],
			plugins: [exports(), unused()],
			dts: {
				splitting: true,
			},
		},
	},
	{
		name: '@bunup/dts',
		root: 'packages/dts',
		config: {
			entry: ['src/index.ts'],
			plugins: [exports(), unused()],
		},
	},
]
