import { normalize } from 'node:path'

export function getShortFilePath(filePath: string, maxLength = 3): string {
	const fileParts = filePath.split('/')
	const shortPath = fileParts.slice(-maxLength).join('/')
	return shortPath
}

export function cleanPath(path: string): string {
	return normalize(path)
		.replace(/\\/g, '/')
		.replace(/^[a-zA-Z]:\//, '')
		.replace(/^\/+/, '')
		.replace(/\/+/g, '/')
}
