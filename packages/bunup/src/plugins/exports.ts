import path from 'node:path'
import pc from 'picocolors'
import { CSS_RE, JS_DTS_RE } from '../constants/re'
import { logger } from '../printer/logger'
import { detectFileFormatting } from '../utils/file'
import { cleanPath, getShortFilePath } from '../utils/path'
import type {
	BuildContext,
	BuildOutputFile,
	BunupPlugin,
	OnBuildDoneCtx,
} from './types'

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

export interface ExportsOptions {
	/**
	 * Additional export fields to preserve alongside automatically generated exports
	 *
	 * @see https://bunup.dev/docs/extra-options/exports#customexports
	 */
	customExports?: (ctx: BuildContext) => CustomExports | undefined
	/**
	 * Entry points to exclude from the exports field
	 *
	 * @see https://bunup.dev/docs/extra-options/exports#exclude
	 */
	exclude?: Exclude
	/**
	 * Whether to automatically exclude CLI entry points from the exports field
	 *
	 * When enabled (default), CLI-related entry points are automatically excluded
	 * from package exports since they are typically used for binaries and should
	 * not be exposed as importable package exports.
	 *
	 * The plugin uses glob patterns to match common CLI entry point patterns:
	 * - Files or directories named "cli" (e.g., `cli.ts`, `cli/index.ts`)
	 * - Files or directories named "bin" (e.g., `bin.ts`, `bin/index.ts`)
	 * - CLI-related paths in src directory (e.g., `src/cli.ts`, `src/bin/index.ts`)
	 *
	 * If you want to include CLI entries in your exports, set this to `false` and
	 * optionally use the `exclude` option for more granular control.
	 *
	 * @default true
	 * @see https://bunup.dev/docs/extra-options/exports#excludecli
	 */
	excludeCli?: boolean
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
	 * @see https://bunup.dev/docs/extra-options/exports#includepackagejson
	 */
	includePackageJson?: boolean
	/**
	 * Whether to add a wildcard export that allows deep imports
	 *
	 * When true, adds "./*": "./*" to exports, making all files accessible
	 * When false (default), only explicit exports are accessible
	 *
	 * @default false
	 * @see https://bunup.dev/docs/extra-options/exports#all
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
 * @see https://bunup.dev/docs/extra-options/exports
 */
export function exports(options: ExportsOptions = {}): BunupPlugin {
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
	ctx: OnBuildDoneCtx,
	options: ExportsOptions,
): Promise<void> {
	const { files, options: buildOptions, meta } = ctx

	if (!meta.packageJson.path || !meta.packageJson.data) {
		return
	}

	try {
		const { exportsField, entryPoints } = generateExportsFields(
			files,
			options.exclude,
			options.excludeCli,
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

		await validateBinFields(
			meta.packageJson.data,
			buildOptions.name,
			meta.packageJson.path,
			meta.rootDir,
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
	excludeCli: boolean | undefined,
	excludeCss: boolean | undefined,
	ctx: OnBuildDoneCtx,
): {
	exportsField: ExportsField
	entryPoints: Partial<Record<EntryPoint, string>>
} {
	const filteredFiles = filterFiles(files, exclude, excludeCli, ctx)
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
	customExportsProvider: ExportsOptions['customExports'],
	ctx: OnBuildDoneCtx,
): CustomExports {
	const mergedExports: CustomExports = { ...baseExports }

	if (!customExportsProvider) {
		return mergedExports
	}

	const customExports = customExportsProvider({
		options: ctx.options,
		meta: ctx.meta,
	})
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
	excludeCli: boolean | undefined,
	ctx: OnBuildDoneCtx,
): BuildOutputFile[] {
	return files.filter(
		(file) =>
			(JS_DTS_RE.test(file.fullPath) || CSS_RE.test(file.fullPath)) &&
			(file.kind === 'entry-point' || file.kind === 'asset') &&
			(file.format === 'esm' ||
				file.format === 'cjs' ||
				CSS_RE.test(file.fullPath)) &&
			(!file.entrypoint ||
				!isExcluded(file.entrypoint, exclude, excludeCli, ctx)),
	)
}

/**
 * Glob patterns to match common CLI entry points
 * These patterns match files and directories commonly used for CLI/binary entry points
 */
const CLI_EXCLUSION_PATTERNS = [
	'**/cli.{ts,tsx,js,jsx,mjs,cjs}',
	'**/cli/index.{ts,tsx,js,jsx,mjs,cjs}',
	'**/bin.{ts,tsx,js,jsx,mjs,cjs}',
	'**/bin/index.{ts,tsx,js,jsx,mjs,cjs}',
]

function isExcluded(
	entrypoint: string,
	exclude: Exclude | undefined,
	excludeCli: boolean | undefined,
	ctx: OnBuildDoneCtx,
): boolean {
	const userPatterns =
		typeof exclude === 'function'
			? exclude({ options: ctx.options, meta: ctx.meta })
			: exclude
	const cliPatterns = excludeCli !== false ? CLI_EXCLUSION_PATTERNS : []
	const allPatterns = [...cliPatterns, ...(userPatterns ?? [])]

	return allPatterns.some((pattern) => new Bun.Glob(pattern).match(entrypoint))
}

function getExportKey(pathRelativeToOutdir: string): string {
	const pathSegments = cleanPath(removeExtension(pathRelativeToOutdir)).split(
		'/',
	)

	if (
		pathSegments.length === 1 &&
		(pathSegments[0]?.startsWith('index') ||
			pathSegments[0]?.startsWith('main'))
	) {
		return '.'
	}

	return `./${pathSegments.filter((segment) => !segment.startsWith('index') && !segment.startsWith('main')).join('/')}`
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

async function validateBinFields(
	packageJsonData: Record<string, unknown> | undefined,
	projectName: string | undefined,
	packageJsonPath: string | undefined,
	rootDir: string | undefined,
): Promise<void> {
	if (!packageJsonData?.bin || !rootDir) return

	const bin = packageJsonData.bin
	const invalidBins: string[] = []

	if (typeof bin === 'string') {
		const fullPath = path.resolve(rootDir, bin)
		const exists = await Bun.file(fullPath).exists()
		if (!exists) {
			invalidBins.push(`bin field points to ${pc.yellow(bin)}`)
		}
	} else if (typeof bin === 'object' && bin !== null) {
		for (const [name, binPath] of Object.entries(bin)) {
			if (typeof binPath === 'string') {
				const fullPath = path.resolve(rootDir, binPath)
				const exists = await Bun.file(fullPath).exists()
				if (!exists) {
					invalidBins.push(
						`${pc.yellow(pc.bold(name))} points to ${pc.red(binPath)}`,
					)
				}
			}
		}
	}

	if (invalidBins.length === 0) return

	const project = projectName ? ` ${projectName}` : ''
	const count = invalidBins.length
	const depText = count === 1 ? 'binary' : 'binaries'
	const verb = count === 1 ? 'points' : 'point'
	const fileText = count === 1 ? 'file' : 'files'

	const pathPrefix = packageJsonPath
		? pc.cyan(getShortFilePath(packageJsonPath))
		: ''

	const message = `\nYour project${project} has ${count} ${depText} in the bin field that ${verb} to invalid ${fileText}:\n\n  ${pathPrefix}:\n    ${invalidBins.join('\n    ')}`

	logger.log(message, { leftPadding: true })
}
