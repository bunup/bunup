import { JS_DTS_RE } from '../../../constants/re'
import { logger } from '../../../logger'
import type { Format } from '../../../options'
import { cleanPath, removeExtension } from '../../../utils'
import type { BuildOutputFile, BunupPlugin } from '../../types'

type ExportField = 'require' | 'import' | 'types'
type EntryPoint = 'main' | 'module' | 'types'
type ExportsField = Record<string, Record<ExportField, string>>

/**
 * A plugin that generates the exports field in the package.json file automatically.
 */
export function exports(): BunupPlugin {
	return {
		type: 'bunup',
		name: 'exports',
		hooks: {
			onBuildDone: async ({ output, options, meta }) => {
				if (!meta.packageJson.path || !meta.packageJson.data) {
					return
				}

				try {
					const { exportsField, entryPoints } = generateExportsFields(
						output.files,
					)

					const files = Array.isArray(meta.packageJson.data.files)
						? [...new Set([...meta.packageJson.data.files, options.outDir])]
						: [options.outDir]

					const existingExports = meta.packageJson.data.exports || {}
					const mergedExports: ExportsField = { ...existingExports }

					for (const [key, value] of Object.entries(exportsField)) {
						mergedExports[key] = value
					}

					const newPackageJson: Record<string, unknown> = {
						name: meta.packageJson.data.name,
						description: meta.packageJson.data.description,
						version: meta.packageJson.data.version,
						type: meta.packageJson.data.type,
						private: meta.packageJson.data.private,
						files,
						...entryPoints,
						exports: mergedExports,
					}

					for (const key in meta.packageJson.data) {
						if (
							Object.prototype.hasOwnProperty.call(
								meta.packageJson.data,
								key,
							) &&
							!Object.prototype.hasOwnProperty.call(newPackageJson, key)
						) {
							newPackageJson[key] =
								meta.packageJson.data[key as keyof typeof meta.packageJson.data]
						}
					}

					await Bun.write(
						meta.packageJson.path,
						JSON.stringify(newPackageJson, null, 2),
					)

					logger.cli('Updated package.json with exports')
				} catch {
					logger.error('Failed to update package.json')
				}
			},
		},
	}
}

function generateExportsFields(files: BuildOutputFile[]): {
	exportsField: ExportsField
	entryPoints: Partial<Record<EntryPoint, string>>
} {
	const exportsField: ExportsField = {}
	const entryPoints: Partial<Record<EntryPoint, string>> = {}

	const filteredFiles = filterFiles(files)

	for (const file of filteredFiles) {
		const exportType = formatToExportField(file.format, file.dts)
		const relativePath = `./${cleanPath(file.relativePathToRootDir)}`

		const exportKey = getExportKey(cleanPath(file.relativePathToOutputDir))

		exportsField[exportKey] = {
			...exportsField[exportKey],
			[exportType]: relativePath,
		}
	}

	for (const field of Object.keys(exportsField['.'] ?? {})) {
		const entryPoint = exportFieldToEntryPoint(field as ExportField)

		entryPoints[entryPoint] = exportsField['.'][field as ExportField]
	}

	return { exportsField, entryPoints }
}

function filterFiles(files: BuildOutputFile[]): BuildOutputFile[] {
	return files.filter(
		(file) => JS_DTS_RE.test(file.fullPath) && file.kind === 'entry-point',
	)
}

function getExportKey(relativePathToOutputDir: string): string {
	const pathSegments = removeExtension(relativePathToOutputDir).split('/')

	// index.ts -> .
	// client/index.ts -> ./client
	// utils/index.ts -> ./utils
	// components/ui/button.ts -> ./components/ui/button

	if (pathSegments.length === 1 && pathSegments[0].startsWith('index')) {
		return '.'
	}

	return `./${pathSegments.filter((p) => !p.startsWith('index')).join('/')}`
}

function exportFieldToEntryPoint(exportField: ExportField): EntryPoint {
	return exportField === 'types'
		? 'types'
		: exportField === 'require'
			? 'main'
			: 'module'
}

function formatToExportField(format: Format, dts: boolean): ExportField {
	return dts ? 'types' : format === 'esm' ? 'import' : 'require'
}
