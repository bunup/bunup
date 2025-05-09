import { dts } from 'bun-dts'
import { BunupBuildError } from './errors'
import {
	getResolvedNaming,
	normalizeEntryToProcessableEntries,
} from './helpers/entry'
import { loadPackageJson } from './loaders'
import { logger, setSilent } from './logger'
import {
	type BuildOptions,
	createBuildOptions,
	getResolvedBytecode,
	getResolvedDefine,
	getResolvedEnv,
	getResolvedMinify,
	getResolvedSourcemap,
	getResolvedSplitting,
} from './options'
import { externalPlugin } from './plugins/internal/external'
import { injectShimsPlugin } from './plugins/internal/shims'
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
	getDefaultOutputExtension,
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

	const { packageJson, path } = await loadPackageJson(rootDir)

	if (packageJson && path) {
		logger.cli(`Using ${getShortFilePath(path, 2)}`, {
			muted: true,
			identifier: options.name,
			once: `${path}:${options.name}`,
		})
	}

	const bunupPlugins = filterBunupPlugins(options.plugins)

	await runPluginBuildStartHooks(bunupPlugins, options)

	const processableEntries = normalizeEntryToProcessableEntries(options.entry)

	const packageType = packageJson?.type as string | undefined

	const plugins: BunPlugin[] = [
		externalPlugin(options, packageJson),
		...filterBunupBunPlugins(options.plugins).map((p) => p.plugin),
	]

	if (options.dts) {
		const dtsEntry =
			typeof options.dts === 'object' && 'entry' in options.dts
				? options.dts.entry
				: undefined

		const dtsResolve =
			typeof options.dts === 'object' && 'resolve' in options.dts
				? options.dts.resolve
				: undefined

		plugins.push(
			dts({
				entry: dtsEntry,
				preferredTsConfigPath: options.preferredTsconfigPath,
				warnInsteadOfError: options.watch,
				resolve: dtsResolve,
				onDeclarationGenerated: (filePath) => {
					const relativePathToRootDir = getRelativePathToRootDir(
						filePath,
						rootDir,
					)
					buildOutput.files.push({
						fullPath: filePath,
						relativePathToRootDir,
					})
					logger.progress('DTS', relativePathToRootDir, {
						identifier: options.name,
					})
				},
			}),
		)
	}

	const buildPromises = options.format.flatMap((fmt) =>
		processableEntries.map(async (entry) => {
			const extension =
				options.outputExtension?.({
					format: fmt,
					packageType,
					options,
					entry,
				}).js ?? getDefaultOutputExtension(fmt, packageType)

			const result = await Bun.build({
				entrypoints: [`${rootDir}/${entry.fullPath}`],
				format: fmt,
				naming: getResolvedNaming(
					entry.customOutputBasePath,
					extension,
				),
				splitting: getResolvedSplitting(options.splitting, fmt),
				bytecode: getResolvedBytecode(options.bytecode, fmt),
				define: getResolvedDefine(
					options.define,
					options.shims,
					options.env,
					fmt,
				),
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
				plugins: [
					...plugins,
					injectShimsPlugin({
						format: fmt,
						target: options.target,
						shims: options.shims,
					}),
				],
				throw: false,
			})

			for (const log of result.logs) {
				if (log.level === 'error') {
					console.log('\n')
					console.log(log)
					console.log('\n')
					throw new Error()
				}
				if (log.level === 'warning') logger.warn(log.message)
				else if (log.level === 'info') logger.info(log.message)
			}

			for (const file of result.outputs) {
				const relativePathToRootDir = getRelativePathToRootDir(
					file.path,
					rootDir,
				)
				if (file.kind === 'entry-point') {
					logger.progress(fmt.toUpperCase(), relativePathToRootDir, {
						identifier: options.name,
					})
				}
				buildOutput.files.push({
					fullPath: file.path,
					relativePathToRootDir,
				})
			}
		}),
	)

	await Promise.all(buildPromises)

	await runPluginBuildDoneHooks(bunupPlugins, options, buildOutput)

	if (options.onSuccess) {
		await options.onSuccess(options)
	}
}

function getRelativePathToRootDir(filePath: string, rootDir: string) {
	return filePath.replace(`${rootDir}/`, '')
}
