export function ensureArray<T>(value: T | T[]): T[] {
	return Array.isArray(value) ? value : [value].filter(Boolean)
}

export function ensureObject<T>(
	value: T | Record<string, unknown>,
): Record<string, unknown> {
	return typeof value === 'object' && value !== null
		? (value as Record<string, unknown>)
		: {}
}
