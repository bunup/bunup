export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B'

	const units = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))

	if (i === 0) return `${bytes} ${units[i]}`

	return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`
}

const listFormatter = new Intl.ListFormat('en', {
	style: 'long',
	type: 'conjunction',
})

export function formatListWithAnd(arr: string[]): string {
	return listFormatter.format(arr)
}

export function stripAnsiSafe(text: string): string {
	return Bun.stripANSI ? Bun.stripANSI(text) : text
}
