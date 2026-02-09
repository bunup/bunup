import type { BuildOptions } from "../options";
import { getPackageExternalDeps, getPackageAllDeps } from "../utils/package";

function getDepsPatterns(deps: string[]): RegExp[] {
	return deps.map((dep) => new RegExp(`^${dep}($|\\/|\\\\)`));
}

function matchesPattern(path: string, pattern: string | RegExp): boolean {
	return typeof pattern === "string" ? pattern === path : pattern.test(path);
}

export function isExternalFromPackageJson(
	path: string,
	options: BuildOptions,
	packageJson: Record<string, unknown> | null,
): boolean | undefined {
	const packageExternalDepsPatterns = getDepsPatterns(getPackageExternalDeps(packageJson));
	const packageAllDepsPatterns = getDepsPatterns(getPackageAllDeps(packageJson));

	if (options.packages === "bundle") {
		const explicitlyExternal = options.external?.some((pattern) => matchesPattern(path, pattern));
		return explicitlyExternal;
	}

	if (options.packages === "external") {
		const explicitlyBundled = options.noExternal?.some((pattern) => matchesPattern(path, pattern));

		if (explicitlyBundled) {
			return false;
		}

		return packageAllDepsPatterns.some((pattern) => pattern.test(path));
	}

	const matchesExternalPattern =
		packageExternalDepsPatterns.some((pattern) => pattern.test(path)) ||
		options.external?.some((pattern) => matchesPattern(path, pattern));

	const isExcludedFromExternal = options.noExternal?.some((pattern) =>
		matchesPattern(path, pattern),
	);

	return matchesExternalPattern && !isExcludedFromExternal;
}

export function getBundledDepsForDtsResolve(
	options: BuildOptions,
	packageJson: Record<string, unknown> | null,
): (string | RegExp)[] | undefined {
	if (options.packages === "bundle") {
		const allDeps = getPackageAllDeps(packageJson);
		const bundled = options.external?.length
			? allDeps.filter((dep) => !options.external!.some((p) => matchesPattern(dep, p)))
			: allDeps;
		return bundled.length ? getDepsPatterns(bundled) : undefined;
	}

	if (options.packages === "external") {
		return options.noExternal?.length ? [...options.noExternal] : undefined;
	}

	// Default: devDeps are bundled, noExternal overrides force bundling
	const externalDeps = new Set(getPackageExternalDeps(packageJson));
	const allDeps = getPackageAllDeps(packageJson);
	const devDeps = allDeps.filter((dep) => !externalDeps.has(dep));
	const bundledDevDeps = options.external?.length
		? devDeps.filter((dep) => !options.external!.some((p) => matchesPattern(dep, p)))
		: devDeps;

	const patterns: (string | RegExp)[] = [
		...getDepsPatterns(bundledDevDeps),
		...(options.noExternal ?? []),
	];

	return patterns.length ? patterns : undefined;
}
