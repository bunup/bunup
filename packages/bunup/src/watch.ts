import path from 'node:path'

import pc from 'picocolors'
import { build } from './build'
import { BunupWatchError, handleError, parseErrorMessage } from './errors'
import { type BuildOptions, resolveBuildOptions } from './options'
import { logTime } from './printer/logger'
import { printBuildReport } from './printer/print-build-report'
import { getShortFilePath } from './utils'

export async function watch(
	userOptions: Partial<BuildOptions>,
	rootDir: string,
): Promise<void> {
	const watchPaths = new Set<string>()

	const options = resolveBuildOptions(userOptions)

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
	let buildCount = 0
	let lastChangedFile: string | undefined

	const triggerRebuild = async (initial: boolean, changed?: string) => {
		if (isRebuilding) {
			return
		}
		isRebuilding = true

		try {
			console.clear()

			await new Promise((resolve) => setTimeout(resolve, 20))

			if (lastChangedFile === changed) {
				buildCount++
			} else {
				buildCount = 1
			}

			lastChangedFile = changed

			if (!initial) {
				console.log(
					`\n  ${buildCount > 1 ? pc.magentaBright(`[x${buildCount}] `) : ''}${pc.green(`Changed:`)} ${changed}${options.name ? ` ${pc.bgBlueBright(` ${options.name} `)}` : ''}`,
				)
			}

			const start = performance.now()

			const buildOutput = await build(options, rootDir)

			await printBuildReport(buildOutput, options)

			if (!initial) {
				console.log(
					`\n  ${pc.green('✓')} Rebuild completed in ${pc.green(logTime(performance.now() - start))}`,
				)
			}
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
