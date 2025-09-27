import { basename, extname, join } from 'node:path'
import { logger } from '../../printer/logger'
import { ensureArray, isGlobPattern } from '../../utils'
import type { BunupPlugin, BunupPluginHooks } from '../types'

type CopyOptions = {
	/** Whether to follow symbolic links when copying files. */
	followSymlinks?: boolean
	/** Whether to exclude dotfiles (files starting with a dot) from being copied. */
	excludeDotfiles?: boolean
}

/**
 * A plugin that copies files and directories to the output directory.
 *
 * @see https://bunup.dev/docs/builtin-plugins/copy
 */
export function copy(pattern: string | string[]): BunupPlugin & CopyBuilder {
	return new CopyBuilder(pattern)
}

class CopyBuilder {
	private _patterns: string[]
	private _destination?: string
	private _options?: CopyOptions

	constructor(pattern: string | string[]) {
		this._patterns = ensureArray(pattern)
	}

	/**
	 * Sets the destination directory or file path where files will be copied.
	 * Relative to the output directory.
	 */
	to(destination: string): this {
		this._destination = destination
		return this
	}

	/**
	 * Sets additional options for the copy operation.
	 */
	with(options: CopyOptions): this {
		this._options = options
		return this
	}

	get name() {
		return 'copy'
	}

	get hooks(): BunupPluginHooks {
		return {
			onBuildDone: async ({ options: buildOptions, meta }) => {
				let destinationPath = ''

				if (this._destination) {
					if (this._destination.startsWith(buildOptions.outDir)) {
						logger.warn(
							"You don't need to include the output directory in the destination path for the copy plugin. Files are copied to the output directory by default.",
							{
								verticalSpace: true,
							},
						)
						destinationPath = this._destination
					} else {
						destinationPath = join(buildOptions.outDir, this._destination)
					}
				} else {
					destinationPath = buildOptions.outDir
				}

				for (const pattern of this._patterns) {
					const glob = new Bun.Glob(pattern)

					for await (const scannedPath of glob.scan({
						cwd: meta.rootDir,
						dot: !this._options?.excludeDotfiles,
						onlyFiles: isGlobPattern(pattern),
						followSymlinks: this._options?.followSymlinks,
					})) {
						const sourcePath = join(meta.rootDir, scannedPath)

						const finalDestinationPath = resolveDestinationPath(
							destinationPath,
							scannedPath,
							meta.rootDir,
						)

						if (isDirectoryPath(sourcePath)) {
							await copyDirectory(sourcePath, finalDestinationPath)
						} else {
							await copyFile(sourcePath, finalDestinationPath)
						}
					}
				}
			},
		}
	}
}

function resolveDestinationPath(
	destinationPath: string,
	scannedPath: string,
	rootDir: string,
): string {
	const fullDestinationPath = join(rootDir, destinationPath)
	const isScannedPathDir = isDirectoryPath(scannedPath)
	const isDestinationDir = isDirectoryPath(fullDestinationPath)

	if (isDestinationDir && !isScannedPathDir) {
		return join(fullDestinationPath, basename(scannedPath))
	}

	return fullDestinationPath
}

function isDirectoryPath(filePath: string): boolean {
	return extname(filePath) === ''
}

async function copyDirectory(
	sourcePath: string,
	finalDestinationPath: string,
): Promise<void> {
	await Bun.$`cp -r ${sourcePath} ${finalDestinationPath}`
}

async function copyFile(
	sourcePath: string,
	finalDestinationPath: string,
): Promise<void> {
	const sourceFile = Bun.file(sourcePath)
	await Bun.write(finalDestinationPath, sourceFile)
}
