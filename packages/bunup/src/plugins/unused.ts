import pc from 'picocolors'
import type { BuildOptions, External } from '../options'
import { logger } from '../printer/logger'
import { isJavascriptFile, isTypeScriptFile } from '../utils/file'
import { formatListWithAnd } from '../utils/format'
import type { BuildOutputFile, BunupPlugin } from './types'

export interface UnusedOptions {
	/**
	 * The level of reporting for unused or incorrectly categorized dependencies
	 * @default 'warn'
	 */
	level?: 'warn' | 'error'
	/**
	 * Dependencies to ignore when checking
	 * @default []
	 */
	ignore?: string[]
}

/**
 * Detects and reports unused or incorrectly categorized dependencies in your project,
 * helping you maintain a clean dependency tree and keep your `package.json` up to date.
 *
 * @see https://bunup.dev/docs/extra-options/unused
 */
export function unused(options: UnusedOptions = {}): BunupPlugin {
	const { level = 'warn', ignore = [] } = options

	return {
		name: 'unused',
		hooks: {
			onBuildDone: async (ctx) => {
				const { options: buildOptions, meta, files } = ctx

				if (buildOptions.watch || buildOptions.compile) return

				const usedDeps = await collectUsedDependencies(files, buildOptions)
				const pkgDeps = extractPackageDependencies(
					meta.packageJson.data?.dependencies,
				)
				const unusedDeps = findUnusedDependencies(pkgDeps, usedDeps, ignore)
				const misplacedTypes = findMisplacedTypes(pkgDeps, usedDeps, ignore)

				reportIssues(unusedDeps, misplacedTypes, buildOptions.name, level)
			},
		},
	}
}

async function collectUsedDependencies(
	files: BuildOutputFile[],
	buildOptions: BuildOptions,
): Promise<Set<string>> {
	const transpiler = new Bun.Transpiler({ loader: 'ts' })
	const externals = [
		...(buildOptions.external ?? []),
		...(buildOptions.noExternal ?? []),
	]
	const usedDeps = new Set<string>()

	const jsFiles = files.filter(
		(f) => isJavascriptFile(f.fullPath) || isTypeScriptFile(f.fullPath),
	)

	for (const file of jsFiles) {
		const code = (await Bun.file(file.fullPath).text()).replace(/^#!.*$/m, '')
		const imports = transpiler.scanImports(code).map((imp) => imp.path)

		for (const path of imports) {
			if (isExternal(path, externals) || isBuiltin(path)) continue
			usedDeps.add(path)
		}
	}

	return usedDeps
}

function isExternal(path: string, externals: External): boolean {
	return externals.some((ex) =>
		typeof ex === 'string' ? path.startsWith(ex) : ex.test(path),
	)
}

function isBuiltin(path: string): boolean {
	return path.startsWith('node:') || path.startsWith('bun:')
}

function extractPackageDependencies(deps: Record<string, unknown>): string[] {
	return typeof deps === 'object' ? Object.keys(deps) : []
}

function findUnusedDependencies(
	allDeps: string[],
	usedDeps: Set<string>,
	ignore: string[],
): string[] {
	return allDeps.filter((dep) => {
		if (ignore.includes(dep)) return false
		return !Array.from(usedDeps).some(
			(used) => used === dep || used.startsWith(`${dep}/`),
		)
	})
}

function findMisplacedTypes(
	allDeps: string[],
	usedDeps: Set<string>,
	ignore: string[],
): string[] {
	return allDeps.filter((dep) => {
		if (!dep.startsWith('@types/')) return false
		if (ignore.includes(dep)) return false
		return !Array.from(usedDeps).some(
			(used) => used === dep || used.startsWith(`${dep}/`),
		)
	})
}

function reportIssues(
	unused: string[],
	misplaced: string[],
	projectName: string | undefined,
	level: 'warn' | 'error',
) {
	reportIssue(unused, 'unused', projectName, level)
	reportIssue(misplaced, 'misplaced-types', projectName, level)
}

function reportIssue(
	deps: string[],
	type: 'unused' | 'misplaced-types',
	projectName: string | undefined,
	level: 'warn' | 'error',
) {
	if (deps.length === 0) return

	const count = deps.length
	const coloredDeps = formatListWithAnd(deps.map((d) => pc.yellow(d)))
	const project = projectName ? ` ${projectName}` : ''
	const message = buildMessage(type, count, coloredDeps, project, deps)

	if (level === 'error') {
		logger.log(pc.red(message), { leftPadding: true })
		process.exit(1)
	} else {
		logger.log(message, { leftPadding: true })
	}
}

function buildMessage(
	type: 'unused' | 'misplaced-types',
	count: number,
	coloredDeps: string,
	project: string,
	deps: string[],
): string {
	const plural = count === 1 ? 'it' : 'them'

	if (type === 'unused') {
		const depText = count === 1 ? 'dependency' : 'dependencies'
		const cmd = pc.cyan(`bun remove ${deps.join(' ')}`)
		return `\nYour project${project} has ${count} unused ${depText}: ${coloredDeps}. You can remove ${plural} with ${cmd}`
	}

	const depText = count === 1 ? 'package' : 'packages'
	const cmd = pc.cyan(
		`bun remove ${deps.join(' ')} && bun add --dev ${deps.join(' ')}`,
	)
	return `\nYour project${project} has ${count} type ${depText} that should be in devDependencies: ${coloredDeps}. Move ${plural} to devDependencies with ${cmd}`
}
