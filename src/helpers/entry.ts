import { basename, extname } from 'node:path'
import type { Entry } from '../options'
import type { BunBuildOptions } from '../types'

export type ProcessableEntry = {
	fullPath: string
	customOutputBasePath: string | null
}

export function getEntryNameOnly(entry: string): string {
	const filename = basename(entry)
	const extension = extname(filename)
	return extension ? filename.slice(0, -extension.length) : filename
}

export function normalizeEntryToProcessableEntries(
	entry: Entry,
): ProcessableEntry[] {
	if (typeof entry === 'string')
		return [{ fullPath: entry, customOutputBasePath: null }]

	if (typeof entry === 'object' && !Array.isArray(entry))
		return Object.entries(entry).map(([name, path]) => ({
			fullPath: path as string,
			customOutputBasePath: name,
		}))

	return entry.map((entry) => ({
		fullPath: entry,
		customOutputBasePath: null,
	}))
}

export function getResolvedNaming(
	customOutputBasePath: string | null,
	extension: string,
): BunBuildOptions['naming'] {
	return {
		entry: `[dir]/${customOutputBasePath || '[name]'}${extension}`,
		chunk: `${customOutputBasePath || '[name]'}-[hash].[ext]`,
		asset: `${customOutputBasePath ? `${customOutputBasePath}-` : ''}[name]-[hash].[ext]`,
	}
}
