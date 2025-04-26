import path from 'node:path'

import { build } from './build'
import { BunupWatchError, handleError, parseErrorMessage } from './errors'
import { normalizeEntryToProcessableEntries } from './helpers/entry'
import { logger } from './logger'
import { type BuildOptions, createBuildOptions } from './options'
import { formatTime } from './utils'

export async function watch(
	partialOptions: Partial<BuildOptions>,
	rootDir: string,
): Promise<void> {
	const watchPaths = new Set<string>()

	const options = createBuildOptions(partialOptions)

	const normalizedEntry = normalizeEntryToProcessableEntries(options.entry)

	for (const entry of normalizedEntry) {
		const entryPath = path.resolve(rootDir, entry.fullEntryPath)
		const parentDir = path.dirname(entryPath)
		watchPaths.add(parentDir)
	}

	const chokidar = await import('chokidar')

	const watcher = chokidar.watch(Array.from(watchPaths), {
		persistent: true,
		ignoreInitial: true,
		atomic: true,
		ignorePermissionErrors: true,
		ignored: [
			/[\\/]\.git[\\/]/,
			/[\\/]node_modules[\\/]/,
			path.join(rootDir, options.outDir),
		],
	})

	let isRebuilding = false

	const triggerRebuild = async (initial = false) => {
		if (isRebuilding) return
		isRebuilding = true
		try {
			const start = performance.now()
			await build(
				{
					...options,
					entry: normalizedEntry.map((entry) => entry.fullEntryPath),
					clean: false,
				},
				rootDir,
			)
			if (!initial) {
				logger.cli(
					`📦 Rebuild finished in ${formatTime(performance.now() - start)}`,
				)
			}
		} catch (error) {
			handleError(error)
		} finally {
			isRebuilding = false
		}
	}

	watcher.on('change', (filePath) => {
		const changedFile = path.relative(rootDir, filePath)
		logger.cli(`File changed: ${changedFile}`, {
			muted: true,
			once: changedFile,
		})
		triggerRebuild()
	})

	watcher.on('error', (error) => {
		throw new BunupWatchError(`Watcher error: ${parseErrorMessage(error)}`)
	})

	await triggerRebuild(true)
}
