import { basename, extname, join } from 'node:path'
import type { BuildOptions } from '../options'
import { logger } from '../printer/logger'
import { ensureArray, isGlobPattern } from '../utils'
import type { BunupPlugin, BunupPluginHooks } from './types'

type CopyOptions = {
	/** Whether to follow symbolic links when copying files. */
	followSymlinks?: boolean
	/** Whether to exclude dotfiles (files starting with a dot) from being copied. */
	excludeDotfiles?: boolean
	/** Whether to override existing files. Default: true */
	override?: boolean
	/**
	 * Behavior in watch mode:
	 * - 'changed': Only copy files that have changed (default)
	 * - 'always': Always copy all files on each build
	 * - 'skip': Skip copying in watch mode
	 */
	watchMode?: 'changed' | 'always' | 'skip'
}

type TransformContext = {
	/** The file content */
	content: string | ArrayBuffer
	/** The source file path */
	path: string
	/** The destination file path */
	destination: string
	/** Build options */
	options: BuildOptions
}

type TransformResult =
	| string
	| ArrayBuffer
	| { content: string | ArrayBuffer; filename: string }

type TransformFunction = (
	context: TransformContext,
) => TransformResult | Promise<TransformResult>

/**
 * A plugin that copies files and directories to the output directory.
 *
 * @warning When copying large files or directories, this may impact build performance.
 * Consider using symlinks for very large files when appropriate.
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
	private _transform?: TransformFunction
	private _fileCache = new Map<string, number>()

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

	/**
	 * Transforms file contents during copy operation.
	 * Useful for modifying files on the fly (e.g., replacing tokens, minifying, etc.)
	 */
	transform(fn: TransformFunction): this {
		this._transform = fn
		return this
	}

	get name() {
		return 'copy'
	}

	get hooks(): BunupPluginHooks {
		return {
			onBuildDone: async ({ options: buildOptions, meta }) => {
				const isWatchMode = buildOptions.watch
				const watchBehavior = this._options?.watchMode ?? 'changed'

				if (isWatchMode && watchBehavior === 'skip') {
					return
				}

				let destinationPath = ''

				if (this._destination) {
					if (this._destination.startsWith(buildOptions.outDir)) {
						logger.warn(
							"  You don't need to include the output directory in the destination path for the copy plugin. Files are copied to the output directory by default.",
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

				const activeFiles = new Set<string>()

				for (const pattern of this._patterns) {
					const glob = new Bun.Glob(pattern)

					for await (const scannedPath of glob.scan({
						cwd: meta.rootDir,
						dot: !this._options?.excludeDotfiles,
						onlyFiles: isGlobPattern(pattern),
						followSymlinks: this._options?.followSymlinks,
					})) {
						const sourcePath = join(meta.rootDir, scannedPath)
						activeFiles.add(sourcePath)

						if (isWatchMode && watchBehavior === 'changed') {
							const stat = await Bun.file(sourcePath).stat()
							const lastModified = stat?.mtime?.getTime() ?? 0
							const cachedTime = this._fileCache.get(sourcePath)

							if (cachedTime === lastModified) {
								continue
							}

							this._fileCache.set(sourcePath, lastModified)
						}

						const finalDestinationPath = resolveDestinationPath(
							destinationPath,
							scannedPath,
							meta.rootDir,
						)

						const shouldOverride = this._options?.override ?? true
						if (!shouldOverride) {
							const destinationExists =
								await Bun.file(finalDestinationPath).exists()
							if (destinationExists) {
								continue
							}
						}

						if (isDirectoryPath(sourcePath)) {
							await copyDirectory(sourcePath, finalDestinationPath)
						} else {
							await this.copyFileWithTransform(
								sourcePath,
								finalDestinationPath,
								buildOptions,
							)
						}
					}
				}

				if (isWatchMode && watchBehavior === 'changed') {
					for (const cachedPath of this._fileCache.keys()) {
						if (!activeFiles.has(cachedPath)) {
							this._fileCache.delete(cachedPath)
						}
					}
				}
			},
		}
	}

	private async copyFileWithTransform(
		sourcePath: string,
		destinationPath: string,
		buildOptions: BuildOptions,
	): Promise<void> {
		const sourceFile = Bun.file(sourcePath)

		if (this._transform) {
			const content = await sourceFile.arrayBuffer()
			const result = await this._transform({
				content,
				path: sourcePath,
				destination: destinationPath,
				options: buildOptions,
			})

			if (
				typeof result === 'object' &&
				'content' in result &&
				'filename' in result
			) {
				const newDestination = join(
					destinationPath.substring(0, destinationPath.lastIndexOf('/')),
					result.filename,
				)
				await Bun.write(newDestination, result.content)
			} else {
				await Bun.write(destinationPath, result)
			}
		} else {
			await Bun.write(destinationPath, sourceFile)
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
