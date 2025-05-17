import { logger } from '../../../logger'
import type { Format } from '../../../options'
import { getJsonSpaceCount, makePortablePath } from '../../../utils'
import type { BuildOutputFile, BunupPlugin } from '../../types'

type ExportsField = Record<string, Record<string, string>>

/**
 * A plugin that generates the exports field in the package.json file automatically.
 */
export function exports(): BunupPlugin {
    return {
        type: 'bunup',
        name: 'exports',
        hooks: {
            onBuildDone: async ({ output, meta }) => {
                if (!meta.packageJson.path || !meta.packageJson.data) {
                    return
                }

                try {
                    const packageJsonContent = await Bun.file(
                        meta.packageJson.path,
                    ).text()

                    const packageJson = JSON.parse(packageJsonContent)

                    const { exportsField, otherExports } =
                        generateExportsFields(output.files)

                    const newPackageJson = {
                        ...packageJson,
                        ...otherExports,
                        exports: exportsField,
                    }

                    await Bun.write(
                        meta.packageJson.path,
                        JSON.stringify(
                            newPackageJson,
                            null,
                            getJsonSpaceCount(packageJsonContent),
                        ),
                    )

                    logger.cli('Added exports field to package.json')
                } catch {
                    logger.error(
                        'Failed to generate exports field in package.json',
                    )
                }
            },
        },
    }
}

function generateExportsFields(files: BuildOutputFile[]): {
    exportsField: ExportsField
    otherExports: Record<string, string>
} {
    const exportsField: ExportsField = {}
    const otherExports: Record<string, string> = {}

    console.log(files)

    for (const file of files) {
        const exportType = formatToExportField(file.format, file.dts)
        const relativePath = `./${makePortablePath(file.relativePathToRootDir)}`

        const exportKey = getExportKey(file.outputBasePath)

        exportsField[exportKey] = {
            ...exportsField[exportKey],
            [exportType]: relativePath,
        }

        for (const field of Object.keys(exportsField['.'] ?? {})) {
            otherExports[field] = exportsField['.'][field]
        }
    }

    return { exportsField, otherExports }
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

export function formatToExportField(format: Format, dts: boolean): string {
    return dts ? 'types' : format === 'esm' ? 'import' : 'require'
}
