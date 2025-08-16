import pc from 'picocolors'
import { logger, loggerSymbols } from '../../logger'
import { formatListWithAnd, getShortFilePath } from '../../utils'
import type { Plugin } from '../types'

interface UnusedOptions {
	/**
	 * The level of reporting for unused dependencies
	 * @default 'warn'
	 */
	level?: 'warn' | 'error'
	/**
	 * Dependencies to ignore when checking for unused dependencies
	 * @default []
	 */
	ignore?: string[]
}

/**
 * A plugin that detects and reports unused dependencies.
 *
 * @see https://bunup.dev/docs/plugins/unused
 */
export function unused(options: UnusedOptions = {}): Plugin[] {
	const { level = 'warn', ignore = [] } = options

	return [
		{
			type: 'bunup',
			name: 'unused-dependencies',
			hooks: {
				onBuildDone: async (ctx) => {
					const { options: buildOptions, output, meta } = ctx

					const transpiler = new Bun.Transpiler({
						loader: 'js',
					})

					const jsFiles = output.files.filter((file) =>
						file.fullPath.endsWith('.js'),
					)

					const packageDependencies =
						typeof meta.packageJson.data?.dependencies === 'object'
							? meta.packageJson.data.dependencies
							: {}

					const externals = [
						...(buildOptions.external ?? []),
						...(buildOptions.noExternal ?? []),
					]

					const allImportPaths = new Set<string>()
					for (const file of jsFiles) {
						const importPaths = (
							await getImports(file.fullPath, transpiler)
						).map((imp) => imp.path)

						for (const importPath of importPaths) {
							if (
								externals.some((ex) =>
									typeof ex === 'string'
										? importPath.startsWith(ex)
										: ex.test(importPath),
								)
							)
								continue

							if (
								importPath.startsWith('node:') ||
								importPath.startsWith('bun:')
							)
								continue

							allImportPaths.add(importPath)
						}
					}

					const allDependencies = Object.keys(packageDependencies)

					const unusedDependencies = allDependencies.filter((dependency) => {
						if (ignore.includes(dependency)) return false
						return !Array.from(allImportPaths).some(
							(importPath) =>
								importPath === dependency ||
								importPath.startsWith(`${dependency}/`),
						)
					})

					if (unusedDependencies.length > 0) {
						const count = unusedDependencies.length
						const depText = count === 1 ? 'dependency' : 'dependencies'
						const coloredDeps = formatListWithAnd(
							unusedDependencies.map((dep) => pc.yellow(dep)),
						)
						const removeCommand = pc.cyan(
							`bun remove ${unusedDependencies.join(' ')}`,
						)

						const message = [
							`\nYour project has ${count} unused ${depText}: ${coloredDeps}.`,
							`You can remove ${count === 1 ? 'it' : 'them'} with ${removeCommand}`,
						].join(' ')

						if (level === 'error') {
							logger.log(pc.red(message))
							process.exit(1)
						} else {
							logger.log(message)
						}
					}
				},
			},
		},
		{
			type: 'bun',
			name: 'unused-exports',
			runOnce: true,
			plugin: {
				name: 'bunup:unused-exports',
				setup(build) {
					const transpiler = new Bun.Transpiler({
						loader: 'ts',
					})

					let allText = ''

					build.onResolve({ filter: /.*/ }, (args) => {
						if (
							allText.includes(`export * from '${args.path}'`) ||
							allText.includes(`export * from "${args.path}"`)
						) {
							return {
								path: args.path,
								external: true,
							}
						}

						return null
					})

					build.onLoad({ filter: /.*/ }, async ({ path }) => {
						const code = await Bun.file(path).text()

						const exports = await getExports(path, transpiler)

						for (const exp of exports) {
							if (isIndexFile(path)) {
								continue
							}

							if (!allText.includes(exp)) {
								if (!unusedExports.has(path)) {
									unusedExports.set(path, [])
								}
								unusedExports.get(path)?.push(exp)
							}
						}

						allText += code
					})
				},
			},
		},
		// TODO: Move this into the build.onEnd hook in the unused-exports plugin once Bun.build plugin supports onEnd.
		// This is just a temporary solution to log unused exports after the build is complete.
		// Track upstream: https://github.com/oven-sh/bun/issues/2771
		{
			type: 'bunup',
			name: 'log-unused-exports',
			hooks: {
				onBuildDone: async () => {
					if (unusedExports.size > 0) {
						logger.space()
						logger.tree(
							'Unused exports:',
							Array.from(unusedExports.entries()).map(
								([path, exports]) =>
									`${getShortFilePath(path)} ${loggerSymbols.arrowRight} ${pc.yellow(formatListWithAnd(exports))}`,
							),
						)
					}

					unusedExports.clear()
				},
			},
		},
	]
}

const unusedExports = new Map<string, string[]>()

function isIndexFile(path: string) {
	return path.endsWith('index.ts')
}

// Remove shebangs to fix transpiler error "UNEXPECTED #!/usr/bin/env bun"
function removeShebang(code: string) {
	return code.replace(/^#!.*$/m, '')
}

async function getImports(filePath: string, transpiler: Bun.Transpiler) {
	const code = await Bun.file(filePath).text()
	const codeWithoutShebang = removeShebang(code)
	return transpiler.scanImports(codeWithoutShebang)
}

async function getExports(filePath: string, transpiler: Bun.Transpiler) {
	const code = await Bun.file(filePath).text()
	const codeWithoutShebang = removeShebang(code)
	return transpiler.scan(codeWithoutShebang).exports
}
