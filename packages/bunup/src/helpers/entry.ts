import { basename, dirname, extname } from 'node:path'
import { isTypeScriptSourceCodeFile } from '../dts/utils'
import type { Entry } from '../options'
export type ProcessableEntry = {
	fullEntryPath: string
	name: string
}

export function getEntryNameOnly(entry: string): string {
	const filename = basename(entry)
	const extension = extname(filename)
	return extension ? filename.slice(0, -extension.length) : filename
}

/**
 * Normalizes different entry formats into a consistent array of ProcessableEntry objects.
 *
 * Examples:
 * - String: "src/index.ts" → [{ fullEntryPath: "src/index.ts", name: "index" }]
 * - Array: ["src/index.ts", "src/utils.ts"] → [{ fullEntryPath: "src/index.ts", name: "index" }, ...]
 * - Object: { main: "src/index.ts" } → [{ fullEntryPath: "src/index.ts", name: "main" }]
 *
 * Handles name conflicts by using folder structure to create unique output paths.
 */
export function normalizeEntryToProcessableEntries(
	entry: Entry,
): ProcessableEntry[] {
	if (typeof entry === 'string') {
		return [
			{
				fullEntryPath: entry,
				name: getEntryNameOnly(entry),
			},
		]
	}

	if (typeof entry === 'object' && !Array.isArray(entry)) {
		return Object.entries(entry).map(([name, path]) => ({
			fullEntryPath: path as string,
			name: name,
		}))
	}

	const result: ProcessableEntry[] = []
	const usedOutputPaths = new Set<string>()

	for (const path of entry) {
		const baseName = getEntryNameOnly(path)

		if (!usedOutputPaths.has(baseName)) {
			result.push({ fullEntryPath: path, name: baseName })
			usedOutputPaths.add(baseName)
			continue
		}

		const dir = dirname(path)
		const segments = dir.split('/').filter((s) => s !== '.' && s !== '')

		if (segments.length === 0) {
			let counter = 1
			let newName: string
			do {
				newName = `${baseName}_${counter++}`
			} while (usedOutputPaths.has(newName))

			result.push({ fullEntryPath: path, name: newName })
			usedOutputPaths.add(newName)
			continue
		}

		let found = false
		for (let i = 1; i <= segments.length && !found; i++) {
			const relevantSegments = segments.slice(-i)
			const newName = `${relevantSegments.join('/')}/${baseName}`

			if (!usedOutputPaths.has(newName)) {
				result.push({
					fullEntryPath: path,
					name: newName,
				})
				usedOutputPaths.add(newName)
				found = true
			}
		}

		if (!found) {
			let counter = 1
			let newName: string
			do {
				newName = `${segments.join('/')}/${baseName}_${counter++}`
			} while (usedOutputPaths.has(newName))

			result.push({ fullEntryPath: path, name: newName })
			usedOutputPaths.add(newName)
		}
	}

	return result
}

export function filterTypeScriptEntries(
	entries: ProcessableEntry[],
): ProcessableEntry[] {
	return entries.filter((entry) =>
		isTypeScriptSourceCodeFile(entry.fullEntryPath),
	)
}

export function getEntryNamingFormat(name: string, extension: string) {
	return `[dir]/${name}${extension}`
}
