import { basename, extname } from 'node:path'
import type { BuildOptions } from '../options'
import type { BunBuildOptions } from '../types'

export type ProcessableEntry = {
	fullPath: string
	customOutputBasePath: string | null
	dts: boolean
}

export function getEntryNameOnly(entry: string): string {
	const filename = basename(entry)
	const extension = extname(filename)
	return extension ? filename.slice(0, -extension.length) : filename
}

export function getProcessableEntries(
	options: BuildOptions,
): ProcessableEntry[] {
	const dtsEntry =
		typeof options.dts === 'object' && 'entry' in options.dts
			? options.dts.entry
			: undefined

	let entries: ProcessableEntry[] = []

	if (typeof options.entry === 'string') {
		entries = [
			{
				fullPath: options.entry,
				customOutputBasePath: null,
				dts: false,
			},
		]
	} else if (
		typeof options.entry === 'object' &&
		!Array.isArray(options.entry)
	) {
		entries = Object.entries(options.entry).map(([name, path]) => ({
			fullPath: path,
			customOutputBasePath: name,
			dts: false,
		}))
	} else {
		entries = options.entry.map((entry) => ({
			fullPath: entry,
			customOutputBasePath: null,
			dts: false,
		}))
	}

	if (options.dts === true) {
		entries = entries.map((entry) => ({
			...entry,
			dts: true,
		}))
	} else if (dtsEntry) {
		let dtsEntries: ProcessableEntry[] = []

		if (typeof dtsEntry === 'string') {
			dtsEntries = [
				{
					fullPath: dtsEntry,
					customOutputBasePath: null,
					dts: true,
				},
			]
		} else if (typeof dtsEntry === 'object' && !Array.isArray(dtsEntry)) {
			dtsEntries = Object.entries(dtsEntry).map(([name, path]) => ({
				fullPath: path,
				customOutputBasePath: name,
				dts: true,
			}))
		} else {
			dtsEntries = dtsEntry.map((entry) => ({
				fullPath: entry,
				customOutputBasePath: null,
				dts: true,
			}))
		}

		const processedPaths = new Set<string>()

		entries = entries.map((entry) => {
			const shouldGenerateDts = dtsEntries.some(
				(dtsEntry) =>
					dtsEntry.fullPath === entry.fullPath &&
					dtsEntry.customOutputBasePath ===
						entry.customOutputBasePath,
			)
			if (shouldGenerateDts) {
				processedPaths.add(
					`${entry.fullPath}:${entry.customOutputBasePath}`,
				)
			}
			return {
				...entry,
				dts: shouldGenerateDts,
			}
		})

		for (const dtsEntry of dtsEntries) {
			if (
				!processedPaths.has(
					`${dtsEntry.fullPath}:${dtsEntry.customOutputBasePath}`,
				)
			) {
				entries.push(dtsEntry)
			}
		}
	}

	return entries
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
