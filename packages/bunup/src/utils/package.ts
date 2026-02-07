export function getPackageExternalDeps(packageJson: Record<string, unknown> | null): string[] {
	if (!packageJson) return [];

	return Array.from(
		new Set([
			...Object.keys(packageJson.dependencies || {}),
			...Object.keys(packageJson.peerDependencies || {}),
		]),
	);
}

export function getPackageAllDeps(packageJson: Record<string, unknown> | null): string[] {
	if (!packageJson) return [];

	return Array.from(
		new Set([
			...Object.keys(packageJson.dependencies || {}),
			...Object.keys(packageJson.devDependencies || {}),
			...Object.keys(packageJson.peerDependencies || {}),
		]),
	);
}
