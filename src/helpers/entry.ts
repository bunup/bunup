import type { Entry } from '../options'
import type { BunBuildOptions } from '../types'
import { cleanPath, removeExtension } from '../utils'

export type ProcessableEntry = {
    /** The entry same as the entry option in the config */
    entry: string
    /**
     * The base path of the output file relative to the output directory, excluding the extension.
     * Examples:
     * - If the entry is "src/client/index.ts", the outputBasePath will be "client/index"
     * - If the entry is "src/index.ts", the outputBasePath will be "index"
     */
    outputBasePath: string
}

export function getProcessableEntries(entry: Entry): ProcessableEntry[] {
    if (typeof entry === 'string') {
        return [
            {
                entry,
                outputBasePath: getEntryOutputBasePath(entry),
            },
        ]
    }

    if (typeof entry === 'object' && !Array.isArray(entry)) {
        return Object.entries(entry).map(([name, path]) => ({
            entry: path,
            outputBasePath: name,
        }))
    }

    return entry.map((_entry) => ({
        entry: _entry,
        outputBasePath: getEntryOutputBasePath(_entry),
    }))
}

// utils/index.ts -> index
// src/index.ts -> index
// src/client/index.ts -> client/index
function getEntryOutputBasePath(entry: string): string {
    const pathSegments = cleanPath(removeExtension(entry)).split('/')
    return pathSegments.length > 1
        ? pathSegments.slice(1).join('/')
        : pathSegments.join('/')
}

export function getResolvedNaming(
    outputBasePath: string,
    extension: string,
): BunBuildOptions['naming'] {
    return {
        entry: `[dir]/${outputBasePath}.[ext]`,
        chunk: `${outputBasePath}-[hash].[ext]`,
        asset: `${outputBasePath}-[name]-[hash].[ext]`,
    }
}
