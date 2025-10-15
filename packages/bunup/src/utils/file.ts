import fs from 'node:fs/promises'
import path from 'node:path'
import { JS_RE, TS_RE } from '../constants/re'
import { BunupBuildError } from '../errors'

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

export function isGlobPattern(pattern: string): boolean {
	return /[*?[\]{}]/.test(pattern)
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
