import path from 'node:path'
import { dts } from 'bun-dts'
import { BunupBuildError } from './errors'
import { loadPackageJson } from './loaders'
import { logger, setSilent } from './logger'
import {
	type BuildOptions,
	createBuildOptions,
	getResolvedBytecode,
	getResolvedDefine,
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
import type { BunPlugin } from './types'
import {
	cleanOutDir,
	cleanPath,
	ensureArray,
	getFilesFromGlobs,
	getShortFilePath,
} from './utils'

export async function build(
	partialOptions: Partial<BuildOptions>,
	rootDir: string = process.cwd(),
): Promise<void> {
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
		logger.cli(`Using ${getShortFilePath(packageJson.path, 2)}`, {
			muted: true,
			identifier: options.name,
			once: `${packageJson.path}:${options.name}`,
		})
	}

	const bunupPlugins = filterBunupPlugins(options.plugins)

	await runPluginBuildStartHooks(bunupPlugins, options)

	const packageType = packageJson.data?.type as string | undefined

	const plugins: BunPlugin[] = [
		externalOptionPlugin(options, packageJson.data),
		...filterBunupBunPlugins(options.plugins).map((p) => p.plugin),
	]

	if (options.dts) {
		const { resolve, entry, splitting } =
			typeof options.dts === 'object' ? options.dts : {}

		plugins.push(
			dts({
				resolve,
				preferredTsConfigPath: options.preferredTsconfigPath,
				entry: entry
					? await getFilesFromGlobs(ensureArray(entry), rootDir)
					: undefined,
				cwd: rootDir,
				splitting,
				onDeclarationsGenerated({ results, buildConfig }) {
					for (const result of results) {
						logger.progress('DTS', `${options.outDir}/${result.outputPath}`, {
							identifier: options.name,
						})

						const fullPath = path.join(
							rootDir,
							options.outDir,
							result.outputPath,
						)

						if (buildConfig.format) {
							buildOutput.files.push({
								fullPath,
								relativePathToRootDir: getRelativePathToRootDir(
									fullPath,
									rootDir,
								),
								relativePathToOutputDir: result.outputPath,
								dts: true,
								format: buildConfig.format,
								kind: result.kind,
							})
						}
					}
				},
			}),
		)
	}

	const buildPromises = options.format.flatMap(async (fmt) => {
		const result = await Bun.build({
			entrypoints: await getFilesFromGlobs(
				ensureArray(options.entry),
				rootDir,
			).then((files) => files.map((file) => `${rootDir}/${file}`)),
			format: fmt,
			naming: getResolvedNaming(options.naming, fmt, packageType),
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
			plugins,
			throw: false,
		})

		for (const log of result.logs) {
			if (log.level === 'error') {
				throw new BunupBuildError(log.message)
			}
			if (log.level === 'warning') logger.warn(log.message)
			else if (log.level === 'info') logger.info(log.message)
		}

		for (const file of result.outputs) {
			const cleanedBunOutputPath = cleanPath(file.path)
			const relativePathToRootDir = getRelativePathToRootDir(
				cleanedBunOutputPath,
				rootDir,
			)
			if (file.kind === 'entry-point') {
				logger.progress(fmt.toUpperCase(), relativePathToRootDir, {
					identifier: options.name,
				})
			}
			buildOutput.files.push({
				fullPath: cleanedBunOutputPath,
				relativePathToRootDir,
				relativePathToOutputDir: getRelativePathToOutputDir(
					relativePathToRootDir,
					options.outDir,
				),
				dts: false,
				format: fmt,
				kind: file.kind,
			})
		}
	})

	await Promise.all(buildPromises)

	await runPluginBuildDoneHooks(bunupPlugins, options, buildOutput, {
		packageJson,
		rootDir,
	})

	if (options.onSuccess) {
		await options.onSuccess(options)
	}
}

function getRelativePathToRootDir(filePath: string, rootDir: string) {
	return filePath.replace(`${rootDir}/`, '')
}

function getRelativePathToOutputDir(
	relativePathToRootDir: string,
	outDir: string,
) {
	return relativePathToRootDir.replace(`${outDir}/`, '')
}
