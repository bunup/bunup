import path from 'node:path'
import { generateDts, logIsolatedDeclarationErrors } from '@bunup/dts'
import { ensureMinimumBunVersion } from './ensure-bun-version'
import {
	BunupBuildError,
	BunupDTSBuildError,
	formatBunBuildError,
	formatInvalidEntryPointsError,
	formatNoEntryPointsFoundError,
	parseErrorMessage,
} from './errors'
import { executeOnSuccess } from './helpers/on-success'
import { loadPackageJson } from './loaders'
import {
	type BuildOptions,
	DEFAULT_ENTYPOINTS,
	getDefaultChunkNaming,
	getResolvedDefine,
	getResolvedDtsSplitting,
	getResolvedEnv,
	getResolvedMinify,
	getResolvedSourcemap,
	getResolvedSplitting,
	getResolvedTarget,
	resolveBuildOptions,
	resolvePlugins,
} from './options'
import type { BuildOutput } from './plugins/types'
import {
	filterBunPlugins,
	filterBunupPlugins,
	runPluginBuildDoneHooks,
	runPluginBuildStartHooks,
} from './plugins/utils'
import { logger } from './printer/logger'
import { ensureArray } from './utils/common'
import {
	getDefaultDtsOutputExtention,
	getDefaultJsOutputExtension,
	replaceExtension,
} from './utils/extension'
import { cleanOutDir, getFilesFromGlobs, isJavascriptFile } from './utils/file'
import { formatListWithAnd } from './utils/format'
import { cleanPath, getShortFilePath } from './utils/path'

let ac: AbortController | null = null

export async function build(
	userOptions: Partial<BuildOptions>,
	rootDir: string = process.cwd(),
): Promise<BuildOutput> {
	ensureMinimumBunVersion()

	if (ac) {
		ac.abort()
	}

	ac = new AbortController()

	const options = resolveBuildOptions(userOptions)

	const buildOutput: BuildOutput = {
		files: [],
		options,
	}

	if (options.silent) {
		logger.setSilent(options.silent)
	}

	if (options.clean) {
		cleanOutDir(rootDir, options.outDir)
	}

	const packageJson = await loadPackageJson(rootDir)

	if (packageJson.data && packageJson.path) {
		logger.info(`Using ${getShortFilePath(packageJson.path, 2)}`, {
			muted: true,
			identifier: options.name,
			once: `${packageJson.path}:${options.name}`,
		})
	}

	const packageType = packageJson.data?.type as string | undefined

	const allPlugins = resolvePlugins(options, packageJson.data)

	const bunupPlugins = filterBunupPlugins(allPlugins)

	const bunPlugins = filterBunPlugins(allPlugins)

	await runPluginBuildStartHooks(bunupPlugins, options)

	const entryArray = ensureArray(options.entry)

	const entrypoints = getFilesFromGlobs(entryArray, rootDir)

	if (!entrypoints.length) {
		if (!ensureArray(userOptions.entry).length) {
			throw new BunupBuildError(
				formatNoEntryPointsFoundError(DEFAULT_ENTYPOINTS),
			)
		}
		throw new BunupBuildError(formatInvalidEntryPointsError(entryArray))
	}

	logger.info(`entry: ${formatListWithAnd(entrypoints)}`, {
		identifier: options.name,
		once: options.name,
		muted: true,
	})

	const absoluteEntrypoints = entrypoints.map((file) => `${rootDir}/${file}`)
	const resolvedDefine = getResolvedDefine(options.define, options.env)
	const resolvedMinify = getResolvedMinify(options)
	const resolvedTarget = getResolvedTarget(options.target)
	const resolvedSourcemap = getResolvedSourcemap(options.sourcemap)
	const resolvedEnv = getResolvedEnv(options.env)
	const chunkNaming = getDefaultChunkNaming(options.name)

	const buildPromises = ensureArray(options.format).map(async (fmt) => {
		const result = await Bun.build({
			entrypoints: absoluteEntrypoints,
			format: fmt,
			splitting: getResolvedSplitting(options.splitting, fmt),
			define: resolvedDefine,
			minify: resolvedMinify,
			target: resolvedTarget,
			sourcemap: resolvedSourcemap,
			loader: options.loader,
			drop: options.drop,
			naming: {
				chunk: chunkNaming,
			},
			conditions: options.conditions,
			banner: options.banner,
			footer: options.footer,
			publicPath: options.publicPath,
			env: resolvedEnv,
			ignoreDCEAnnotations: options.ignoreDCEAnnotations,
			emitDCEAnnotations: options.emitDCEAnnotations,
			jsx: options.jsx,
			throw: false,
			plugins: bunPlugins,
			tsconfig: options.preferredTsconfig
				? path.resolve(rootDir, options.preferredTsconfig)
				: undefined,
		})

		for (const log of result.logs) {
			if (log.level === 'error') {
				throw new BunupBuildError(formatBunBuildError(log))
			}
			if (log.level === 'warning') logger.warn(log.message)
			if (log.level === 'verbose') logger.log(log.message)
			else if (log.level === 'info') logger.info(log.message)
		}

		let entrypointIndex = 0

		for (const file of result.outputs) {
			const content = await file.text()

			const pathRelativeToOutdir = cleanPath(
				isJavascriptFile(file.path) && file.kind === 'entry-point'
					? replaceExtension(
							file.path,
							getDefaultJsOutputExtension(fmt, packageType),
						)
					: file.path,
			)

			const pathRelativeToRootDir = path.join(
				options.outDir,
				pathRelativeToOutdir,
			)

			const fullPath = path.resolve(rootDir, pathRelativeToRootDir)

			await Bun.write(fullPath, content)

			if (!buildOutput.files.some((f) => f.fullPath === fullPath)) {
				buildOutput.files.push({
					fullPath,
					pathRelativeToRootDir,
					pathRelativeToOutdir,
					dts: false,
					format: fmt,
					kind: file.kind,
					entrypoint:
						file.kind === 'entry-point'
							? cleanPath(entrypoints[entrypointIndex])
							: undefined,
					size: file.size,
				})

				if (file.kind === 'entry-point') {
					entrypointIndex++
				}
			}
		}
	})

	await Promise.all(buildPromises)

	if (options.dts) {
		try {
			const { entry, splitting, ...dtsOptions } =
				typeof options.dts === 'object' ? options.dts : {}

			const dtsResult = await generateDts(ensureArray(entry ?? entrypoints), {
				cwd: rootDir,
				preferredTsconfig: options.preferredTsconfig,
				splitting: getResolvedDtsSplitting(options.splitting, splitting),
				naming: {
					chunk: getDefaultChunkNaming(options.name),
				},
				...dtsOptions,
			})

			if (dtsResult.errors.length && !logger.isSilent()) {
				logIsolatedDeclarationErrors(dtsResult.errors)
			}

			for (const fmt of ensureArray(options.format)) {
				for (const file of dtsResult.files) {
					const dtsExtension = getDefaultDtsOutputExtention(
						fmt,
						packageType,
						file.kind,
					)

					const pathRelativeToOutdir = cleanPath(
						`${file.pathInfo.outputPathWithoutExtension}${dtsExtension}`,
					)

					const pathRelativeToRootDir = cleanPath(
						`${options.outDir}/${pathRelativeToOutdir}`,
					)

					const fullPath = path.join(rootDir, pathRelativeToRootDir)

					await Bun.write(fullPath, file.dts)

					buildOutput.files.push({
						fullPath,
						pathRelativeToRootDir,
						pathRelativeToOutdir,
						dts: true,
						format: fmt,
						kind: file.kind,
						entrypoint: file.entrypoint
							? cleanPath(file.entrypoint)
							: undefined,
						size: file.dts.length,
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

	return buildOutput
}
