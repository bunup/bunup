import path from 'node:path'
import pc from 'picocolors'
import { generateDts, logIsolatedDeclarationErrors } from 'typeroll'
import {
	BunupBuildError,
	BunupDTSBuildError,
	parseErrorMessage,
} from './errors'
import { executeOnSuccess } from './helpers/on-success'
import { loadPackageJson } from './loaders'
import { logger, setSilent, silent } from './logger'
import {
	type BuildOptions,
	createBuildOptions,
	getDefaultChunkNaming,
	getResolvedBytecode,
	getResolvedDefine,
	getResolvedDtsSplitting,
	getResolvedEnv,
	getResolvedMinify,
	getResolvedNaming,
	getResolvedSourcemap,
	getResolvedSplitting,
} from './options'
import { externalOptionPlugin } from './plugins/internal/external-option'
import type { BuildOutput } from './plugins/types'
import {
	filterBunupBunPlugins,
	filterBunupPlugins,
	runPluginBuildDoneHooks,
	runPluginBuildStartHooks,
} from './plugins/utils'
import {
	cleanOutDir,
	cleanPath,
	ensureArray,
	getDefaultDtsExtention,
	getFilesFromGlobs,
	getShortFilePath,
	isTypeScriptFile,
} from './utils'

let ac: AbortController | null = null

export async function build(
	partialOptions: Partial<BuildOptions>,
	rootDir: string = process.cwd(),
): Promise<void> {
	if (ac) {
		ac.abort()
	}

	ac = new AbortController()

	const buildOutput: BuildOutput = {
		files: [],
	}

	const options = createBuildOptions(partialOptions)

	if (!options.entry || options.entry.length === 0 || !options.outDir) {
		throw new BunupBuildError(
			'Nothing to build. Please make sure you have provided a proper bunup configuration or cli arguments.',
		)
	}

	if (options.clean) {
		cleanOutDir(rootDir, options.outDir)
	}

	setSilent(options.silent)

	const packageJson = await loadPackageJson(rootDir)

	if (packageJson.data && packageJson.path) {
		logger.info(`Using ${getShortFilePath(packageJson.path, 2)}`, {
			muted: true,
			identifier: options.name,
			once: `${packageJson.path}:${options.name}`,
		})
	}

	const bunupPlugins = filterBunupPlugins(options.plugins)

	await runPluginBuildStartHooks(bunupPlugins, options)

	const packageType = packageJson.data?.type as string | undefined

	const entrypoints = await getFilesFromGlobs(
		ensureArray(options.entry),
		rootDir,
	)

	if (!entrypoints.length) {
		throw new BunupBuildError(
			`One or more of the entrypoints you provided do not exist. Please check that each entrypoint points to a valid file.`,
		)
	}

	const buildPromises = options.format.flatMap(async (fmt, index) => {
		const result = await Bun.build({
			entrypoints: entrypoints.map((file) => `${rootDir}/${file}`),
			format: fmt,
			naming: getResolvedNaming(fmt, packageType, options.name),
			splitting: getResolvedSplitting(options.splitting, fmt),
			bytecode: getResolvedBytecode(options.bytecode, fmt),
			define: getResolvedDefine(options.define, options.env),
			minify: getResolvedMinify(options),
			outdir: `${rootDir}/${options.outDir}`,
			target: options.target,
			sourcemap: getResolvedSourcemap(options.sourcemap),
			loader: options.loader,
			drop: options.drop,
			banner: options.banner,
			footer: options.footer,
			publicPath: options.publicPath,
			env: getResolvedEnv(options.env),
			ignoreDCEAnnotations: options.ignoreDCEAnnotations,
			emitDCEAnnotations: options.emitDCEAnnotations,
			throw: false,
			plugins: [
				externalOptionPlugin(options, packageJson.data),
				...filterBunupBunPlugins(options.plugins, {
					excludeRunOncePlugins: index > 0,
				}).map((p) => p.plugin),
			],
		})

		for (const log of result.logs) {
			if (log.level === 'error') {
				throw new BunupBuildError(log.message)
			}
			if (log.level === 'warning') logger.warn(log.message)
			else if (log.level === 'info') logger.info(log.message)
		}

		let entrypointIndex = 0

		for (const file of result.outputs) {
			const relativePathToRootDir = getRelativePathToRootDir(file.path, rootDir)
			const relativePathToOutputDir = getRelativePathToOutputDir(
				relativePathToRootDir,
				options.outDir,
			)
			if (file.kind === 'entry-point') {
				logger.success(
					`${pc.dim(`${options.outDir}/`)}${relativePathToOutputDir}`,
					{
						identifier: options.name,
					},
				)
			}
			buildOutput.files.push({
				fullPath: file.path,
				relativePathToRootDir,
				relativePathToOutputDir,
				dts: false,
				format: fmt,
				kind: file.kind,
				entrypoint:
					file.kind === 'entry-point'
						? cleanPath(entrypoints[entrypointIndex])
						: undefined,
			})

			if (file.kind === 'entry-point') {
				entrypointIndex++
			}
		}
	})

	await Promise.all(buildPromises)

	if (options.dts ?? entrypoints.some(isTypeScriptFile)) {
		try {
			const { entry, splitting, ...dtsOptions } =
				typeof options.dts === 'object' ? options.dts : {}

			const dtsResult = await generateDts(ensureArray(entry ?? entrypoints), {
				cwd: rootDir,
				preferredTsConfigPath: options.preferredTsconfigPath,
				splitting: getResolvedDtsSplitting(options.splitting, splitting),
				naming: {
					chunk: getDefaultChunkNaming(options.name),
				},
				...dtsOptions,
			})

			if (dtsResult.errors.length && !silent) {
				logIsolatedDeclarationErrors(dtsResult.errors)
			}

			for (const fmt of options.format) {
				for (const file of dtsResult.files) {
					const dtsExtension = getDefaultDtsExtention(
						fmt,
						packageType,
						file.kind,
					)
					const relativePathToOutputDir = cleanPath(
						`${file.pathInfo.outputPathWithoutExtension}${dtsExtension}`,
					)
					const relativePathToRootDir = cleanPath(
						`${options.outDir}/${relativePathToOutputDir}`,
					)

					if (file.kind === 'entry-point') {
						logger.success(
							`${pc.dim(`${options.outDir}/`)}${relativePathToOutputDir}`,
							{
								identifier: options.name,
							},
						)
					}

					const fullPath = path.join(rootDir, relativePathToRootDir)

					await Bun.write(fullPath, file.dts)

					buildOutput.files.push({
						fullPath,
						relativePathToRootDir,
						relativePathToOutputDir,
						dts: true,
						format: fmt,
						kind: file.kind,
						entrypoint: file.entrypoint
							? cleanPath(file.entrypoint)
							: undefined,
					})
				}
			}
		} catch (error) {
			throw new BunupDTSBuildError(parseErrorMessage(error))
		}
	}

	await runPluginBuildDoneHooks(bunupPlugins, options, buildOutput, {
		packageJson,
		rootDir,
	})

	if (options.onSuccess) {
		await executeOnSuccess(options.onSuccess, options, ac.signal)
	}
}

function getRelativePathToRootDir(filePath: string, rootDir: string) {
	return cleanPath(filePath).replace(`${cleanPath(rootDir)}/`, '')
}

function getRelativePathToOutputDir(
	relativePathToRootDir: string,
	outDir: string,
) {
	return cleanPath(relativePathToRootDir).replace(`${cleanPath(outDir)}/`, '')
}
