import type { Format } from '../options'

export function getDefaultJsOutputExtension(
	format: Format,
	packageType: string | undefined,
): string {
	switch (format) {
		case 'esm':
			return isModulePackage(packageType) ? '.js' : '.mjs'
		case 'cjs':
			return isModulePackage(packageType) ? '.cjs' : '.js'
		case 'iife':
			return '.global.js'
	}
}

export function getDefaultDtsOutputExtention(
	format: Format,
	packageType: string | undefined,
	kind: 'entry-point' | 'chunk',
): string {
	// always use the .d.ts extension for dts chunk files to avoid duplicate files for each format.
	if (kind === 'chunk') return '.d.ts'

	switch (format) {
		case 'esm':
			return isModulePackage(packageType) ? '.d.ts' : '.d.mts'
		case 'cjs':
			return isModulePackage(packageType) ? '.d.cts' : '.d.ts'
		case 'iife':
			return '.global.d.ts'
	}
}

function isModulePackage(packageType: string | undefined): boolean {
	return packageType === 'module'
}

export function replaceExtension(
	filePath: string,
	newExtension: string,
): string {
	if (!filePath) {
		return filePath
	}

	const normalizedExtension = newExtension.startsWith('.')
		? newExtension
		: `.${newExtension}`

	const lastSlashIndex = Math.max(
		filePath.lastIndexOf('/'),
		filePath.lastIndexOf('\\'),
	)

	const directory =
		lastSlashIndex >= 0 ? filePath.substring(0, lastSlashIndex + 1) : ''
	const filename =
		lastSlashIndex >= 0 ? filePath.substring(lastSlashIndex + 1) : filePath

	const lastDotIndex = filename.lastIndexOf('.')

	if (lastDotIndex === -1) {
		return directory + filename + normalizedExtension
	}

	const nameWithoutExtension = filename.substring(0, lastDotIndex)
	return directory + nameWithoutExtension + normalizedExtension
}
