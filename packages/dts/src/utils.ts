import { existsSync } from 'node:fs'
import { normalize } from 'node:path'
import { type LoadConfigResult, loadConfig } from 'coffi'
import { minify } from 'oxc-minify'
import { isCI, isDevelopment } from 'std-env'
import { EXTENSION_REGEX, TS_RE } from './re'

export function ensureArray<T>(value: T | T[]): T[] {
	return Array.isArray(value) ? value : [value]
}

export function isTypeScriptFile(path: string | null): boolean {
	if (!path) return false
	return TS_RE.test(path)
}

export function returnPathIfExists(path: string): string | null {
	return existsSync(path) ? path : null
}

export function getExtension(filename: string): string {
	const match = filename.match(EXTENSION_REGEX)
	if (!match) return ''

	const ext = match[0]
	return ext
}

export function replaceExtension(filename: string, newExt: string): string {
	if (EXTENSION_REGEX.test(filename)) {
		return filename.replace(EXTENSION_REGEX, newExt)
	}

	return filename + newExt
}

export function deleteExtension(filename: string): string {
	return filename.replace(EXTENSION_REGEX, '')
}

export async function loadTsConfig(
	cwd: string,
	preferredPath: string | undefined,
): Promise<LoadConfigResult<Record<string, unknown>>> {
	const config = await loadConfig<Record<string, unknown>>({
		name: 'tsconfig',
		extensions: ['.json'],
		preferredPath,
		cwd,
	})

	return config
}

export function getShortFilePath(filePath: string, maxLength = 3): string {
	const fileParts = filePath.split('/')
	const shortPath = fileParts.slice(-maxLength).join('/')
	return shortPath
}

export function generateRandomString(length = 10): string {
	return Array.from({ length }, () =>
		String.fromCharCode(97 + Math.floor(Math.random() * 26)),
	).join('')
}

export function isDev(): boolean {
	return isDevelopment || !isCI
}

export function isNullOrUndefined(value: unknown): value is undefined | null {
	return value === undefined || value === null
}

export function cleanPath(path: string): string {
	let cleaned = normalize(path).replace(/\\/g, '/')

	cleaned = cleaned.replace(/^[a-zA-Z]:\//, '')

	cleaned = cleaned.replace(/^\/+/, '')

	cleaned = cleaned.replace(/\/+/g, '/')

	return cleaned
}

export function getDeclarationExtensionFromJsExtension(ext: string): string {
	if (ext === '.mjs') return '.d.mts'
	if (ext === '.cjs') return '.d.cts'
	return '.d.ts'
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

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B'

	const units = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))

	if (i === 0) return `${bytes} ${units[i]}`

	return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`
}

export function filterTypescriptFiles(files: string[]): string[] {
	return files.filter((file) => isTypeScriptFile(file))
}

export function minifyDts(dts: string): string {
	return minify(`${generateRandomString()}.d.ts`, dts, {
		codegen: {
			removeWhitespace: true,
		},
		mangle: false,
		compress: false,
		sourcemap: false,
	}).code
}
