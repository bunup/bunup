import path from 'node:path'
import { JS_DTS_RE } from '../../constants/re'
import { logger } from '../../logger'
import { cleanPath } from '../../utils'
import type { BuildContext, BuildOutputFile, BunupPlugin } from '../types'

type ExportField = 'require' | 'import' | 'types'
type EntryPoint = 'main' | 'module' | 'types'
type ExportValue = string | { types: string; default: string }
type ExportsField = Record<string, Partial<Record<ExportField, ExportValue>>>

type CustomExports = Record<
	string,
	string | Record<string, string | Record<string, string>>
>

type Exclude = ((ctx: BuildContext) => string[] | undefined) | string[]

interface ExportsPluginOptions {
	/**
	 * Additional export fields to preserve alongside automatically generated exports
	 *
	 * @see https://bunup.dev/docs/plugins/exports#customexports
	 */
	customExports?: (ctx: BuildContext) => CustomExports | undefined
	/**
	 * Entry points to exclude from the exports field
	 *
	 * @see https://bunup.dev/docs/plugins/exports#exclude
	 */
	exclude?: Exclude
}

interface FileEntry {
	dts: BuildOutputFile | undefined
	source: BuildOutputFile | undefined
}

/**
 * A plugin that generates the exports field in the package.json file automatically.
 *
 * @see https://bunup.dev/docs/plugins/exports
 */
export function exports(options: ExportsPluginOptions = {}): BunupPlugin {
	return {
		type: 'bunup',
		name: 'exports',
		hooks: {
			onBuildDone: async (ctx) => {
				await processPackageJsonExports(ctx, options)
			},
		},
	}
}

async function processPackageJsonExports(
	ctx: BuildContext,
	options: ExportsPluginOptions,
): Promise<void> {
	const { output, options: buildOptions, meta } = ctx

	if (!meta.packageJson.path || !meta.packageJson.data) {
		return
	}

	try {
		const { exportsField, entryPoints } = generateExportsFields(
			output.files,
			options.exclude,
			ctx,
		)

		const updatedFiles = createUpdatedFilesArray(
			meta.packageJson.data,
			buildOptions.outDir,
		)

		const mergedExports = mergeCustomExportsWithGenerated(
			exportsField,
			options.customExports,
			ctx,
		)

		const newPackageJson = createUpdatedPackageJson(
			meta.packageJson.data,
			entryPoints,
			mergedExports,
			updatedFiles,
		)

		if (Bun.deepEquals(newPackageJson, meta.packageJson.data)) {
			return
		}

		await Bun.write(
			meta.packageJson.path,
			JSON.stringify(newPackageJson, null, 2),
		)
	} catch {
		logger.error('Failed to update package.json')
	}
}

function generateExportsFields(
	files: BuildOutputFile[],
	exclude: Exclude | undefined,
	ctx: BuildContext,
): {
	exportsField: ExportsField
	entryPoints: Partial<Record<EntryPoint, string>>
} {
	const filteredFiles = filterFiles(files, exclude, ctx)
	const { filesByExportKey, allDtsFiles } = groupFilesByExportKey(filteredFiles)
	const exportsField = createExportEntries(filesByExportKey)
	const entryPoints = extractEntryPoints(exportsField, allDtsFiles)

	return { exportsField, entryPoints }
}

function groupFilesByExportKey(files: BuildOutputFile[]) {
	const filesByExportKey = new Map<string, Map<string, FileEntry>>()
	const allDtsFiles = new Map<string, BuildOutputFile[]>()

	for (const file of files) {
		const exportKey = getExportKey(cleanPath(file.relativePathToOutputDir))
		const format = file.format === 'esm' ? 'import' : 'require'

		if (!filesByExportKey.has(exportKey)) {
			filesByExportKey.set(exportKey, new Map())
			allDtsFiles.set(exportKey, [])
		}

		const formatMap = filesByExportKey.get(exportKey)
		const dtsFiles = allDtsFiles.get(exportKey)

		if (formatMap && dtsFiles) {
			if (!formatMap.has(format)) {
				formatMap.set(format, { dts: undefined, source: undefined })
			}

			const fileEntry = formatMap.get(format)
			if (fileEntry) {
				if (file.dts) {
					fileEntry.dts = file
					dtsFiles.push(file)
				} else {
					fileEntry.source = file
				}
			}
		}
	}

	return { filesByExportKey, allDtsFiles }
}

function createExportEntries(
	filesByExportKey: Map<string, Map<string, FileEntry>>,
): ExportsField {
	const exportsField: ExportsField = {}

	for (const [exportKey, formatMap] of filesByExportKey.entries()) {
		exportsField[exportKey] = {}

		let hasFormatSpecificTypes = false
		let primaryTypesPath: string | undefined

		for (const [format, files] of formatMap.entries()) {
			const formatKey = format as ExportField

			if (files.dts && files.source) {
				exportsField[exportKey][formatKey] = {
					types: `./${cleanPath(files.dts.relativePathToRootDir)}`,
					default: `./${cleanPath(files.source.relativePathToRootDir)}`,
				}
				hasFormatSpecificTypes = true

				if (!primaryTypesPath) {
					primaryTypesPath = `./${cleanPath(files.dts.relativePathToRootDir)}`
				}
			} else if (files.source) {
				exportsField[exportKey][formatKey] =
					`./${cleanPath(files.source.relativePathToRootDir)}`

				if (files.dts) {
					primaryTypesPath = `./${cleanPath(files.dts.relativePathToRootDir)}`
				}
			} else if (files.dts) {
				primaryTypesPath = `./${cleanPath(files.dts.relativePathToRootDir)}`
			}
		}

		if (!hasFormatSpecificTypes && primaryTypesPath) {
			exportsField[exportKey].types = primaryTypesPath
		}
	}

	return exportsField
}

function extractEntryPoints(
	exportsField: ExportsField,
	allDtsFiles: Map<string, BuildOutputFile[]>,
): Partial<Record<EntryPoint, string>> {
	const entryPoints: Partial<Record<EntryPoint, string>> = {}
	const dotExport = exportsField['.']

	if (!dotExport) {
		return entryPoints
	}

	// Extract entry points from the "." export
	for (const [field, value] of Object.entries(dotExport)) {
		if (field === 'types') continue

		const entryPoint = exportFieldToEntryPoint(field as ExportField)

		if (typeof value === 'string') {
			entryPoints[entryPoint] = value
		} else if (value && typeof value === 'object' && 'default' in value) {
			entryPoints[entryPoint] = value.default
		}
	}

	// Handle root types field
	const dotEntryDtsFiles = allDtsFiles.get('.')
	if (dotEntryDtsFiles?.length) {
		const standardDts = findStandardDtsFile(dotEntryDtsFiles)

		if (standardDts) {
			entryPoints.types = `./${cleanPath(standardDts.relativePathToRootDir)}`
		} else {
			entryPoints.types = extractTypesFromExport(dotExport)
		}
	}

	return entryPoints
}

function findStandardDtsFile(
	dtsFiles: BuildOutputFile[],
): BuildOutputFile | undefined {
	return dtsFiles.find(
		(file) =>
			file.relativePathToRootDir.endsWith('.d.ts') &&
			!file.relativePathToRootDir.endsWith('.d.mts') &&
			!file.relativePathToRootDir.endsWith('.d.cts'),
	)
}

function extractTypesFromExport(
	dotExport: Partial<Record<ExportField, ExportValue>>,
): string | undefined {
	const typesValue = dotExport.types
	if (typeof typesValue === 'string') {
		return typesValue
	}

	if (typesValue && typeof typesValue === 'object' && 'types' in typesValue) {
		return typesValue.types
	}

	const importValue = dotExport.import
	if (
		importValue &&
		typeof importValue === 'object' &&
		'types' in importValue
	) {
		return (importValue as Record<string, unknown>).types as string
	}

	return undefined
}

function createUpdatedFilesArray(
	packageJsonData: Record<string, unknown>,
	outDir: string,
): string[] {
	const existingFiles = Array.isArray(packageJsonData.files)
		? packageJsonData.files
		: []

	return [...new Set([...existingFiles, outDir])]
}

function mergeCustomExportsWithGenerated(
	baseExports: ExportsField,
	customExportsProvider: ExportsPluginOptions['customExports'],
	ctx: BuildContext,
): CustomExports {
	const mergedExports: CustomExports = { ...baseExports }

	if (!customExportsProvider) {
		return mergedExports
	}

	const customExports = customExportsProvider(ctx)
	if (!customExports) {
		return mergedExports
	}

	for (const [key, value] of Object.entries(customExports)) {
		if (typeof value === 'string') {
			mergedExports[key] = value
		} else {
			const existingExport = mergedExports[key]
			if (typeof existingExport === 'object' && existingExport !== null) {
				mergedExports[key] = { ...existingExport, ...value }
			} else {
				mergedExports[key] = value
			}
		}
	}

	return mergedExports
}

function createUpdatedPackageJson(
	originalData: Record<string, unknown>,
	entryPoints: Partial<Record<EntryPoint, string>>,
	exports: CustomExports,
	files: string[],
): Record<string, unknown> {
	const { main, module, types, ...restPackageJson } = originalData

	const newPackageJson: Record<string, unknown> = {
		...Object.fromEntries(
			Object.entries({
				name: originalData.name,
				description: originalData.description,
				version: originalData.version,
				type: originalData.type,
				private: originalData.private,
			}).filter(([_, value]) => value !== undefined),
		),
		files,
		...entryPoints,
		exports,
	}

	for (const key in restPackageJson) {
		if (
			Object.hasOwn(restPackageJson, key) &&
			!Object.hasOwn(newPackageJson, key)
		) {
			newPackageJson[key] = restPackageJson[key]
		}
	}

	return newPackageJson
}

function filterFiles(
	files: BuildOutputFile[],
	exclude: Exclude | undefined,
	ctx: BuildContext,
): BuildOutputFile[] {
	return files.filter(
		(file) =>
			JS_DTS_RE.test(file.fullPath) &&
			file.kind === 'entry-point' &&
			file.entrypoint &&
			(file.format === 'esm' || file.format === 'cjs') &&
			!isExcluded(file.entrypoint, exclude, ctx),
	)
}

function isExcluded(
	entrypoint: string,
	exclude: Exclude | undefined,
	ctx: BuildContext,
): boolean {
	if (!exclude) return false

	const patterns = typeof exclude === 'function' ? exclude(ctx) : exclude
	return (
		patterns?.some((pattern) => new Bun.Glob(pattern).match(entrypoint)) ??
		false
	)
}

function getExportKey(relativePathToOutputDir: string): string {
	const pathSegments = cleanPath(
		removeExtension(relativePathToOutputDir),
	).split('/')

	if (pathSegments.length === 1 && pathSegments[0].startsWith('index')) {
		return '.'
	}

	return `./${pathSegments.filter((segment) => !segment.startsWith('index')).join('/')}`
}

function removeExtension(filePath: string): string {
	const basename = path.basename(filePath)
	const firstDotIndex = basename.indexOf('.')

	if (firstDotIndex === -1) {
		return filePath
	}

	const nameWithoutExtensions = basename.slice(0, firstDotIndex)
	const directory = path.dirname(filePath)

	return directory === '.'
		? nameWithoutExtensions
		: path.join(directory, nameWithoutExtensions)
}

function exportFieldToEntryPoint(exportField: ExportField): EntryPoint {
	switch (exportField) {
		case 'types':
			return 'types'
		case 'require':
			return 'main'
		default:
			return 'module'
	}
}
