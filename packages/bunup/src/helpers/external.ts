import type { BuildOptions } from '../options'
import { getPackageDeps } from '../utils/package'

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

export function isExternalFromPackageJson(
	path: string,
	options: BuildOptions,
	packageJson: Record<string, unknown> | null,
): boolean | undefined {
	const packageDepsPatterns = getPackageDepsPatterns(packageJson)

	if (options.packages === 'bundle') {
		// bundle all by default, but respect explicit external
		const explicitlyExternal = options.external?.some((pattern) =>
			matchesPattern(path, pattern),
		)
		return explicitlyExternal
	}

	if (options.packages === 'external') {
		// externalize all by default, but respect explicit noExternal
		const explicitlyBundled = options.noExternal?.some((pattern) =>
			matchesPattern(path, pattern),
		)
		if (explicitlyBundled) {
			return false
		}
		return packageDepsPatterns.some((pattern) => pattern.test(path))
	}

	const matchesExternalPattern =
		packageDepsPatterns.some((pattern) => pattern.test(path)) ||
		options.external?.some((pattern) => matchesPattern(path, pattern))

	const isExcludedFromExternal = options.noExternal?.some((pattern) =>
		matchesPattern(path, pattern),
	)

	return matchesExternalPattern && !isExcludedFromExternal
}
