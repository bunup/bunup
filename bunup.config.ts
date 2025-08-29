import { exports, unused } from './packages/bunup/src/plugins'

export default {
	target: 'bun',
	entry: ['src/index.ts', 'src/plugins.ts', 'src/cli/index.ts'],
	dts: {
		splitting: true,
	},
	plugins: [exports(), unused()],
}
