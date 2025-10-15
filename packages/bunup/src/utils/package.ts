export function getPackageDeps(
	packageJson: Record<string, unknown> | null,
): string[] {
	if (!packageJson) return []

	return Array.from(
		new Set([
			...Object.keys(packageJson.dependencies || {}),
			...Object.keys(packageJson.peerDependencies || {}),
		]),
	)
}
