// https://bun.com/docs/bundler/css#browser-compatibility
export const DEFAULT_CSS_TARGETS: {
	chrome: number
	firefox: number
	safari: number
	edge: number
} = {
	chrome: 87 << 16,
	firefox: 78 << 16,
	safari: 14 << 16,
	edge: 88 << 16,
}
