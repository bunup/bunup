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
	return normalize(path)
		.replace(/\\/g, '/')
		.replace(/^[a-zA-Z]:\//, '')
		.replace(/^\/+/, '')
		.replace(/\/+/g, '/')
}

const listFormatter = new Intl.ListFormat('en', {
	style: 'long',
	type: 'conjunction',
})

export function formatListWithAnd(arr: string[]): string {
	return listFormatter.format(arr)
}

export function getFilesFromGlobs(patterns: string[], cwd: string): string[] {
	const includePatterns = patterns.filter((p) => !p.startsWith('!'))
	const excludePatterns = patterns
		.filter((p) => p.startsWith('!'))
		.map((p) => p.slice(1))

	const includedFiles = new Set<string>()

	for (const pattern of includePatterns) {
		const glob = new Bun.Glob(pattern)
		for (const file of glob.scanSync(cwd)) {
			includedFiles.add(file)
		}
	}

	if (excludePatterns.length > 0) {
		for (const pattern of excludePatterns) {
			const glob = new Bun.Glob(pattern)
			for (const file of glob.scanSync(cwd)) {
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

export function stripAnsiSafe(text: string): string {
	return Bun.stripANSI ? Bun.stripANSI(text) : text
}

export function ansiHighlight(code: string): string {
	const colors = {
		keyword: '\x1b[35m', // magenta
		string: '\x1b[32m', // green
		comment: '\x1b[90m', // gray
		number: '\x1b[33m', // yellow
		function: '\x1b[36m', // cyan
		reset: '\x1b[0m',
	}

	const keywords =
		/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|try|catch|throw|typeof|interface|type|enum)\b/g
	const strings = /(["'`])(?:(?=(\\?))\2.)*?\1/g
	const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm
	const numbers = /\b(\d+\.?\d*)\b/g
	const functions = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g

	let result = code

	result = result.replace(comments, `${colors.comment}$1${colors.reset}`)
	result = result.replace(strings, `${colors.string}$&${colors.reset}`)
	result = result.replace(keywords, `${colors.keyword}$&${colors.reset}`)
	result = result.replace(numbers, `${colors.number}$&${colors.reset}`)
	result = result.replace(functions, `${colors.function}$&${colors.reset}`)

	return result
}
