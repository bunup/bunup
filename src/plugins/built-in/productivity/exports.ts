import { JS_DTS_RE } from '../../../constants/re'
import { logger } from '../../../logger'
import type { Format } from '../../../options'
import { getUpdatedPackageJson, makePortablePath } from '../../../utils'
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
                    const packageJsonContent = await Bun.file(
                        meta.packageJson.path,
                    ).text()

                    const packageJson = JSON.parse(packageJsonContent)

                    const { exportsField, entryPoints } = generateExportsFields(
                        output.files,
                    )

                    const files = Array.isArray(packageJson.files)
                        ? [...new Set([...packageJson.files, options.outDir])]
                        : [options.outDir]

                    const existingExports = packageJson.exports || {}
                    const mergedExports = { ...existingExports }

                    for (const [key, value] of Object.entries(exportsField)) {
                        mergedExports[key] = {
                            ...(mergedExports[key] || {}),
                            ...value,
                        }
                    }

                    const newPackageJson: Record<string, unknown> = {
                        name: packageJson.name,
                        description: packageJson.description,
                        version: packageJson.version,
                        type: packageJson.type,
                        private: packageJson.private,
                        files,
                        ...entryPoints,
                        exports: mergedExports,
                    }

                    for (const key in packageJson) {
                        if (
                            Object.prototype.hasOwnProperty.call(
                                packageJson,
                                key,
                            ) &&
                            !Object.prototype.hasOwnProperty.call(
                                newPackageJson,
                                key,
                            )
                        ) {
                            newPackageJson[key] =
                                packageJson[key as keyof typeof packageJson]
                        }
                    }

                    await Bun.write(
                        meta.packageJson.path,
                        getUpdatedPackageJson(
                            packageJsonContent,
                            newPackageJson,
                        ),
                    )

                    logger.cli('Updated package.json with exports')
                } catch (error) {
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

    for (const file of filterJsDtsFiles(files)) {
        const exportType = formatToExportField(file.format, file.dts)
        const relativePath = `./${makePortablePath(file.relativePathToRootDir)}`

        const exportKey = getExportKey(file.outputBasePath)

        exportsField[exportKey] = {
            ...exportsField[exportKey],
            [exportType]: relativePath,
        }

        for (const field of Object.keys(exportsField['.'] ?? {})) {
            entryPoints[
                exportFieldToEntryPoint(field as ExportField, file.dts)
            ] = exportsField['.'][field as ExportField]
        }
    }

    return { exportsField, entryPoints }
}

export function filterJsDtsFiles(files: BuildOutputFile[]): BuildOutputFile[] {
    return files.filter((file) => JS_DTS_RE.test(file.fullPath))
}

function getExportKey(outputBasePath: string): string {
    const pathSegments = outputBasePath.split('/')

    // index -> .
    // client/index -> ./client
    // utils/index -> ./utils
    // components/ui/button -> ./components/ui/button

    if (pathSegments.length === 1 && pathSegments[0] === 'index') {
        return '.'
    }

    return `./${pathSegments.filter((p) => p !== 'index').join('/')}`
}

function exportFieldToEntryPoint(
    exportField: ExportField,
    dts: boolean,
): EntryPoint {
    return dts ? 'types' : exportField === 'require' ? 'main' : 'module'
}

function formatToExportField(format: Format, dts: boolean): ExportField {
    return dts ? 'types' : format === 'esm' ? 'import' : 'require'
}
