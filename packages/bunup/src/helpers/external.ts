import type { BuildOptions } from '../options'
import { getPackageDeps } from '../utils'

function getPackageDepsPatterns(
	packageJson: Record<string, unknown> | null,
): RegExp[] {
	return getPackageDeps(packageJson).map(
		(dep) => new RegExp(`^${dep}($|\\/|\\\\)`),
	)
}

function matchesPattern(path: string, pattern: string | RegExp): boolean {
	return typeof pattern === 'string' ? pattern === path : pattern.test(path)
}

export function isExternal(
	path: string,
	options: BuildOptions,
	packageJson: Record<string, unknown> | null,
): boolean | undefined {
	const packageDepsPatterns = getPackageDepsPatterns(packageJson)

	const matchesExternalPattern =
		packageDepsPatterns.some((pattern) => pattern.test(path)) ||
		options.external?.some((pattern) => matchesPattern(path, pattern))

	const isExcludedFromExternal = options.noExternal?.some((pattern) =>
		matchesPattern(path, pattern),
	)

	return matchesExternalPattern && !isExcludedFromExternal
}
