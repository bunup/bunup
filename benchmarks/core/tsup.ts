/**
 * TSUP BENCHMARKING (Separate File)
 * --------------------------------
 * This file exists as a separate module for benchmarking tsup because:
 *
 * 1. tsup crashes when run with Bun, causing the main benchmark suite to fail
 * 2. tsup works properly when run with Node.js
 *
 * By separating the tsup benchmark into its own .ts file, we can:
 * - Run the main benchmarks with: bun run benchmarks/src/main.ts
 * - Run the tsup benchmark with: node benchmarks/src/tsup.ts
 *
 * This approach ensures we can still compare tsup performance against other bundlers
 * while working around the Bun compatibility issue.
 */

import path from 'node:path'
import { build as tsupBuild } from 'tsup'

import { ENTRY_POINT, RESULTS_FILE } from './constants'
import type { Bundler } from './types'
import { appendBenchmarkResults, runBenchmarksForBundlers } from './utils'

const tsupBundler: Bundler = {
	name: 'tsup',
	buildFn: (options) => tsupBuild(options),
	options: (dts) => ({
		entry: [ENTRY_POINT],
		outDir: 'tsup-dist',
		format: ['esm', 'cjs'],
		dts,
		treeshake: true,
		clean: true,
	}),
}

async function runBenchmarks() {
	try {
		const results = await runBenchmarksForBundlers([tsupBundler])
		const benchmarkFilePath = path.resolve(process.cwd(), RESULTS_FILE)
		await appendBenchmarkResults(results, benchmarkFilePath)
	} catch (error) {
		console.error('Tsup benchmarking failed:', error)
	}
}

runBenchmarks()
