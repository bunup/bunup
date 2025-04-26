import path from 'node:path'

import {
	type BundleConfig as BuncheeOptions,
	bundle as buncheeBuild,
} from 'bunchee'
import { type Options as TsdownOptions, build as tsdownBuild } from 'tsdown'
import {
	type BuildOptions as UnbuildOptions,
	build as unbuildBuild,
} from 'unbuild'
import {
	type BuildOptions as BunupOptions,
	build as bunupBuild,
} from '../../packages/bunup/dist/index'

import { ENTRY_POINT, RESULTS_FILE } from './constants'
import type { Bundler } from './types'
import { runBenchmarksForBundlers, saveBenchmarkResults } from './utils'

const bundlers: Bundler[] = [
	{
		name: 'bunup',
		buildFn: (options: BunupOptions) => bunupBuild(options),
		options: (dts): BunupOptions => ({
			entry: [ENTRY_POINT],
			outDir: 'dist/bunup',
			format: ['esm', 'cjs'],
			dts,
			clean: true,
			// tree shaking is always enabled, so we don't need to pass treeshake: true
			// https://bun.sh/blog/bun-bundler?utm_source=chatgpt.com#tree-shaking
		}),
	},
	{
		name: 'tsdown',
		buildFn: tsdownBuild,
		options: (dts): TsdownOptions => ({
			entry: [ENTRY_POINT],
			outDir: 'dist/tsdown',
			format: ['esm', 'cjs'],
			...(dts && {
				dts: {
					isolatedDeclarations: true,
				},
			}),
			treeshake: true,
			clean: true,
		}),
	},
	{
		name: 'unbuild',
		buildFn: (options: UnbuildOptions) =>
			// @ts-expect-error
			unbuildBuild(process.cwd(), false, options),
		options: (dts): UnbuildOptions => ({
			// @ts-expect-error
			entries: [ENTRY_POINT],
			outDir: 'dist/unbuild',
			format: ['esm', 'cjs'],
			failOnWarn: false,
			declaration: dts,
			clean: true,
		}),
	},
	{
		name: 'bunchee',
		buildFn: (options: BuncheeOptions) => buncheeBuild('', options),
		options: (dts): BuncheeOptions => ({
			// @ts-expect-error
			format: ['esm', 'cjs'],
			clean: true,
			// @ts-expect-error
			dts,
		}),
	},
]

async function runBenchmarks() {
	try {
		const results = await runBenchmarksForBundlers(bundlers)
		const benchmarkFilePath = path.resolve(process.cwd(), RESULTS_FILE)
		await saveBenchmarkResults(results, benchmarkFilePath)
	} catch (error) {
		console.error('Benchmarking failed:', error)
	}
}

runBenchmarks()
