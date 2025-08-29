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
	],
	{
		plugins: [exports(), unused()],
		dts: {
			splitting: true,
		},
	},
)
