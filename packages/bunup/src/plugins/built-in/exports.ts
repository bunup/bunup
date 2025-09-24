import path from 'node:path'
import { CSS_RE, JS_DTS_RE } from '../../constants/re'
import { logger } from '../../logger'
import { cleanPath, detectFileFormatting } from '../../utils'
import type { BuildContext, BuildOutputFile, BunupPlugin } from '../types'

type ExportField = 'require' | 'import' | 'types'
type EntryPoint = 'main' | 'module' | 'types'
type ExportValue = string | { types: string; default: string }
type ExportsField = Record<
	string,
	string | Partial<Record<ExportField, ExportValue>>
>

type CustomExports = Record<
	string,
	string | Record<string, string | Record<string, string>>
>

type Exclude = ((ctx: BuildContext) => string[] | undefined) | string[]

interface ExportsPluginOptions {
	/**
	 * Additional export fields to preserve alongside automatically generated exports
	 *
	 * @see https://bunup.dev/docs/builtin-plugins/exports#customexports
	 */
	customExports?: (ctx: BuildContext) => CustomExports | undefined
	/**
	 * Entry points to exclude from the exports field
	 *
	 * @see https://bunup.dev/docs/builtin-plugins/exports#exclude
	 */
	exclude?: Exclude
	/**
	 * Whether to exclude CSS files from being added to the exports field
	 *
	 * @default false
	 */
	excludeCss?: boolean
	/**
	 * Whether to include "./package.json": "./package.json" in the exports field
	 *
	 * @default true
	 * @see https://bunup.dev/docs/builtin-plugins/exports#includepackagejson
	 */
	includePackageJson?: boolean
	/**
	 * Whether to add a wildcard export that allows deep imports
	 *
	 * When true, adds "./*": "./*" to exports, making all files accessible
	 * When false (default), only explicit exports are accessible
	 *
	 * @default false
	 * @see https://bunup.dev/docs/builtin-plugins/exports#all
	 */
	all?: boolean
}

interface FileEntry {
	dts: BuildOutputFile | undefined
	source: BuildOutputFile | undefined
}

/**
 * A plugin that generates the exports field in the package.json file automatically.
 *
 * @see https://bunup.dev/docs/builtin-plugins/exports
 */
export function exports(options: ExportsPluginOptions = {}): BunupPlugin {
	return {
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
			options.excludeCss,
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

		const finalExports = addPackageJsonOrWildcardExport(
			mergedExports,
			options.includePackageJson,
			options.all,
		)

		const newPackageJson = createUpdatedPackageJson(
			meta.packageJson.data,
			entryPoints,
			finalExports,
			updatedFiles,
		)

		if (Bun.deepEquals(newPackageJson, meta.packageJson.data)) {
			return
		}

		const formatting = await detectFileFormatting(meta.packageJson.path)

		let jsonContent = JSON.stringify(
			newPackageJson,
			null,
			formatting.indentation,
		)

		if (formatting.hasTrailingNewline) {
			jsonContent += '\n'
		}

		await Bun.write(meta.packageJson.path, jsonContent)
	} catch {
		logger.error('Failed to update package.json')
	}
}

function generateExportsFields(
	files: BuildOutputFile[],
	exclude: Exclude | undefined,
	excludeCss: boolean | undefined,
	ctx: BuildContext,
): {
	exportsField: ExportsField
	entryPoints: Partial<Record<EntryPoint, string>>
} {
	const filteredFiles = filterFiles(files, exclude, ctx)
	const { filesByExportKey, allDtsFiles, cssFiles } =
		groupFilesByExportKey(filteredFiles)
	const exportsField = createExportEntries(filesByExportKey)

	if (!excludeCss) {
		addCssToExports(exportsField, cssFiles)
	}

	const entryPoints = extractEntryPoints(exportsField, allDtsFiles)

	return { exportsField, entryPoints }
}

function groupFilesByExportKey(files: BuildOutputFile[]) {
	const filesByExportKey = new Map<string, Map<string, FileEntry>>()
	const allDtsFiles = new Map<string, BuildOutputFile[]>()
	const cssFiles: BuildOutputFile[] = []

	for (const file of files) {
		const exportKey = getExportKey(cleanPath(file.pathRelativeToOutdir))

		if (CSS_RE.test(file.fullPath)) {
			cssFiles.push(file)
			continue
		}

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

	return { filesByExportKey, allDtsFiles, cssFiles }
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
					types: `./${cleanPath(files.dts.pathRelativeToRootDir)}`,
					default: `./${cleanPath(files.source.pathRelativeToRootDir)}`,
				}
				hasFormatSpecificTypes = true

				if (!primaryTypesPath) {
					primaryTypesPath = `./${cleanPath(files.dts.pathRelativeToRootDir)}`
				}
			} else if (files.source) {
				exportsField[exportKey][formatKey] =
					`./${cleanPath(files.source.pathRelativeToRootDir)}`

				if (files.dts) {
					primaryTypesPath = `./${cleanPath(files.dts.pathRelativeToRootDir)}`
				}
			} else if (files.dts) {
				primaryTypesPath = `./${cleanPath(files.dts.pathRelativeToRootDir)}`
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

	if (!dotExport || typeof dotExport === 'string') {
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
			entryPoints.types = `./${cleanPath(standardDts.pathRelativeToRootDir)}`
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
			file.pathRelativeToRootDir.endsWith('.d.ts') &&
			!file.pathRelativeToRootDir.endsWith('.d.mts') &&
			!file.pathRelativeToRootDir.endsWith('.d.cts'),
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
			(JS_DTS_RE.test(file.fullPath) || CSS_RE.test(file.fullPath)) &&
			(file.kind === 'entry-point' || file.kind === 'asset') &&
			(file.format === 'esm' ||
				file.format === 'cjs' ||
				CSS_RE.test(file.fullPath)) &&
			(!file.entrypoint || !isExcluded(file.entrypoint, exclude, ctx)),
	)
}

const DEFAULT_CLI_EXCLUSIONS = [
	'cli.ts',
	'cli/index.ts',
	'src/cli.ts',
	'src/cli/index.ts',
]

function isExcluded(
	entrypoint: string,
	exclude: Exclude | undefined,
	ctx: BuildContext,
): boolean {
	const userPatterns = typeof exclude === 'function' ? exclude(ctx) : exclude
	const allPatterns = [...DEFAULT_CLI_EXCLUSIONS, ...(userPatterns ?? [])]

	return allPatterns.some((pattern) => new Bun.Glob(pattern).match(entrypoint))
}

function getExportKey(pathRelativeToOutdir: string): string {
	const pathSegments = cleanPath(removeExtension(pathRelativeToOutdir)).split(
		'/',
	)

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

function addCssToExports(
	exportsField: ExportsField,
	cssFiles: BuildOutputFile[],
): void {
	if (cssFiles.length === 0) return

	for (const cssFile of cssFiles) {
		const exportKey = getCssExportKey(cleanPath(cssFile.pathRelativeToOutdir))
		exportsField[exportKey] = `./${cleanPath(cssFile.pathRelativeToRootDir)}`
	}
}

function getCssExportKey(pathRelativeToOutdir: string): string {
	const pathSegments = cleanPath(removeExtension(pathRelativeToOutdir)).split(
		'/',
	)
	const fileName = pathSegments[pathSegments.length - 1]

	if (fileName === 'index') {
		// index.css files
		if (pathSegments.length === 1) {
			// root level index.css -> ./styles.css
			return './styles.css'
		} else {
			// nested index.css -> use parent directory path with .css suffix to avoid conflicts
			// e.g., button/index.css -> ./button.css
			return `./${pathSegments.slice(0, -1).join('/')}.css`
		}
	} else {
		// non-index CSS files -> use full path with .css extension
		// e.g., button.css -> ./button.css, components/button.css -> ./components/button.css
		return `./${pathSegments.join('/')}.css`
	}
}

function addPackageJsonOrWildcardExport(
	exports: CustomExports,
	includePackageJson?: boolean,
	all?: boolean,
): CustomExports {
	const finalExports = { ...exports }

	if (all) {
		finalExports['./*'] = './*'
	} else if (includePackageJson !== false) {
		if (!finalExports['./package.json']) {
			finalExports['./package.json'] = './package.json'
		}
	}

	return finalExports
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
