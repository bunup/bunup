// https://bun.com/docs/bundler/css#browser-compatibility
// https://bunup.dev/docs/guide/css#browser-compatibility
// Update these target versions when Bun changes its default browser targets for CSS
export function getDefaultCssBrowserTargets(): {
	chrome: number
	firefox: number
	safari: number
	edge: number
} {
	return {
		chrome: 87 << 16,
		firefox: 78 << 16,
		safari: 14 << 16,
		edge: 88 << 16,
	}
}
