import fs from 'node:fs/promises'
import path, { normalize } from 'node:path'
import { JS_RE, TS_RE } from './constants/re'
import { BunupBuildError } from './errors'
import type { Format } from './options'

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

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B'

	const units = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))

	if (i === 0) return `${bytes} ${units[i]}`

	return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`
}

export function getShortFilePath(filePath: string, maxLength = 3): string {
	const fileParts = filePath.split('/')
	const shortPath = fileParts.slice(-maxLength).join('/')
	return shortPath
}

export async function cleanOutDir(
	rootDir: string,
	outDir: string,
): Promise<void> {
	const normalizedOutDir = path.normalize(outDir)
	if (
		['/', '.', '..', '~'].includes(normalizedOutDir) ||
		normalizedOutDir.startsWith('/') ||
		normalizedOutDir.startsWith('~')
	) {
		throw new BunupBuildError(
			`Invalid output directory: "${outDir}" is not allowed`,
		)
	}

	const outDirPath = path.join(rootDir, outDir)
	if (!path.normalize(outDirPath).startsWith(path.normalize(rootDir))) {
		throw new BunupBuildError(
			`Output directory "${outDir}" escapes root directory`,
		)
	}

	try {
		await fs.rm(outDirPath, { recursive: true, force: true })
		await fs.mkdir(outDirPath, { recursive: true })
	} catch (error) {
		throw new BunupBuildError(`Failed to manage output directory: ${error}`)
	}
}

export function cleanPath(path: string): string {
	let cleaned = normalize(path).replace(/\\/g, '/')

	cleaned = cleaned.replace(/^[a-zA-Z]:\//, '')

	cleaned = cleaned.replace(/^\/+/, '')

	cleaned = cleaned.replace(/\/+/g, '/')

	return cleaned
}

export function formatListWithAnd(arr: string[]): string {
	return new Intl.ListFormat('en', {
		style: 'long',
		type: 'conjunction',
	}).format(arr)
}

export async function getFilesFromGlobs(
	patterns: string[],
	cwd: string,
): Promise<string[]> {
	const includePatterns = patterns.filter((p) => !p.startsWith('!'))
	const excludePatterns = patterns
		.filter((p) => p.startsWith('!'))
		.map((p) => p.slice(1))

	const includedFiles = new Set<string>()

	for (const pattern of includePatterns) {
		const glob = new Bun.Glob(pattern)
		for await (const file of glob.scan(cwd)) {
			includedFiles.add(file)
		}
	}

	if (excludePatterns.length > 0) {
		for (const pattern of excludePatterns) {
			const glob = new Bun.Glob(pattern)
			for await (const file of glob.scan(cwd)) {
				includedFiles.delete(file)
			}
		}
	}

	return Array.from(includedFiles)
}

export function isTypeScriptFile(path: string | null): boolean {
	if (!path) return false
	return TS_RE.test(path)
}

export function isJavascriptFile(path: string | null): boolean {
	if (!path) return false
	return JS_RE.test(path)
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

export async function detectFileFormatting(filePath: string): Promise<{
	indentation: string
	hasTrailingNewline: boolean
}> {
	try {
		const content = await Bun.file(filePath).text()

		const hasTrailingNewline = content.endsWith('\n')

		const lines = content.split('\n')

		for (const line of lines) {
			const match = line.match(/^(\s+)/)
			if (match) {
				const indent = match[1]
				if (indent.startsWith('\t')) {
					return { indentation: '\t', hasTrailingNewline }
				}
				return { indentation: indent, hasTrailingNewline }
			}
		}

		return { indentation: '  ', hasTrailingNewline }
	} catch {
		return { indentation: '  ', hasTrailingNewline: true }
	}
}

export function isGlobPattern(pattern: string): boolean {
	return /[*?[\]{}]/.test(pattern)
}
