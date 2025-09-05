import { basename, join } from 'node:path'
import { ensureArray, isDirectoryPath } from '../../utils'
import type { BunupPlugin } from '../types'

/**
 * A plugin that copies files and directories to the output directory.
 *
 * @param pattern - String or array of glob patterns to match files for copying. Patterns starting with '!' exclude matching files.
 * @param outPath - Optional output path. If not provided, uses the build output directory
 * @see https://bunup.dev/docs/plugins/copy
 */
export function copy(
	pattern: string | string[],
	outPath?: string,
): BunupPlugin {
	return {
		name: 'copy',
		hooks: {
			onBuildDone: async ({ options, meta }) => {
				const destinationPath = outPath || options.outDir

				for (const p of ensureArray(pattern)) {
					const glob = new Bun.Glob(p)

					for await (const filePath of glob.scan({
						cwd: meta.rootDir,
						dot: true,
					})) {
						const sourceFile = Bun.file(join(meta.rootDir, filePath))

						await Bun.write(
							isDirectoryPath(destinationPath)
								? join(meta.rootDir, destinationPath, basename(filePath))
								: join(meta.rootDir, destinationPath),
							sourceFile,
						)
					}
				}
			},
		},
	}
}
