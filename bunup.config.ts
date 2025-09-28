import { defineWorkspace } from './packages/bunup/src'
import { exports, unused } from './packages/bunup/src/plugins'

export default defineWorkspace(
	[
		{
			name: 'bunup',
			root: 'packages/bunup',
			config: {
				target: 'bun',
				entry: ['src/index.ts', 'src/plugins.ts', 'src/cli/index.ts'],
			},
		},
		{
			name: '@bunup/dts',
			root: 'packages/dts',
		},
		{
			name: '@bunup/plugin-tailwindcss',
			root: 'packages/plugin-tailwindcss',
		},
		{
			name: '@bunup/shared',
			root: 'packages/shared',
		},
	],
	{
		dts: {
			splitting: true,
		},
		plugins: [exports(), unused()],
	},
)
