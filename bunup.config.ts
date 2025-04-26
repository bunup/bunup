import { type DefineConfigItem, defineWorkspace } from 'bunup'
import { report } from 'bunup/plugins'

const COMMON_OPTIONS: Partial<DefineConfigItem> = {
	outDir: 'dist',
	minify: true,
	splitting: false,
	target: 'bun',
	format: ['esm'],
}

export default defineWorkspace([
	{
		name: 'bunup',
		root: 'packages/bunup',
		config: {
			...COMMON_OPTIONS,
			entry: {
				index: 'src/index.ts',
				cli: 'src/cli.ts',
				plugins: 'src/plugins/built-in/index.ts',
			},
			dts: {
				entry: {
					index: 'src/index.ts',
					plugins: 'src/plugins/built-in/index.ts',
				},
			},
			plugins: [report()],
		},
	},
	{
		name: 'create-bunup',
		root: 'packages/create-bunup',
		config: [
			{
				...COMMON_OPTIONS,
				entry: ['src/index.ts'],
			},
		],
	},
])
