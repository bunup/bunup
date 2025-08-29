import path from 'node:path'

import pc from 'picocolors'
import { build } from './build'
import { BunupWatchError, handleError, parseErrorMessage } from './errors'
import { logTime } from './logger'
import { type BuildOptions, createBuildOptions } from './options'
import { getShortFilePath } from './utils'

export async function watch(
	partialOptions: Partial<BuildOptions>,
	rootDir: string,
): Promise<void> {
	const watchPaths = new Set<string>()

	const options = createBuildOptions(partialOptions)

	const uniqueEntries = new Set(options.entry)

	for (const entry of uniqueEntries) {
		const entryPath = path.resolve(rootDir, entry)
		const parentDir = path.dirname(entryPath)
		watchPaths.add(parentDir)
	}

	const chokidar = await import('chokidar')

	const watcher = chokidar.watch(Array.from(watchPaths), {
		ignoreInitial: true,
		ignorePermissionErrors: true,
		ignored: [
			/[\\/]\.git[\\/]/,
			/[\\/]node_modules[\\/]/,
			path.join(rootDir, options.outDir),
		],
	})

	let isRebuilding = false
	let rebuildCount = 0

	const triggerRebuild = async (initial: boolean, changed?: string) => {
		if (isRebuilding) {
			return
		}
		isRebuilding = true
		try {
			await new Promise((resolve) => setTimeout(resolve, 20))
			const start = performance.now()
			await build({ ...options, silent: !initial }, rootDir)
			if (!initial) {
				console.clear()
				console.log(
					`${rebuildCount > 1 ? pc.magenta(`[x${rebuildCount}] `) : ''}${pc.green(`Rebuilt in ${logTime(performance.now() - start)}`)}: ${changed}${options.name ? ` ${pc.bgBlueBright(` ${options.name} `)}` : ''} `,
				)
			}

			rebuildCount++
		} catch (error) {
			handleError(error)
		} finally {
			isRebuilding = false
		}
	}

	watcher.on('change', (path) => {
		triggerRebuild(false, getShortFilePath(path))
	})

	watcher.on('error', (error) => {
		throw new BunupWatchError(`Watcher error: ${parseErrorMessage(error)}`)
	})

	await triggerRebuild(true)
}
