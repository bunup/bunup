import { defineWorkspace } from './packages/bunup/src'

export default defineWorkspace(
	[
		// build shared first, because it's used in other packages too
		{
			name: '@bunup/shared',
			root: 'packages/shared',
		},
		{
			name: 'bunup',
			root: 'packages/bunup',
			config: {
				target: 'bun',
				entry: ['src/index.ts', 'src/plugins.ts', 'src/cli/index.ts'],
				splitting: true,
			},
		},
		{
			name: '@bunup/plugin-tailwindcss',
			root: 'packages/plugin-tailwindcss',
		},
		{
			name: '@bunup/plugin-react-compiler',
			root: 'packages/plugin-react-compiler',
		},
	],
	{
		dts: {
			splitting: true,
		},
		exports: true,
		unused: true,
		// dtsOnly: true,
	},
)
