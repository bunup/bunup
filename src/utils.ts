import fs from 'node:fs/promises'
import path, { normalize } from 'node:path'

import { BunupBuildError } from './errors'
import type { Format } from './options'

export function addField<T extends Record<string, unknown>, F extends string>(
    objectOrArray: T | T[],
    field: F,
    value: unknown,
): (T & { [key in F]: unknown }) | (T[] & { [key in F]: unknown }[]) {
    return Array.isArray(objectOrArray)
        ? objectOrArray.map((o) => ({ ...o, [field]: value }))
        : { ...objectOrArray, [field]: value }
}

export function ensureArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value]
}

export function getDefaultOutputExtension(
    format: Format,
    packageType: string | undefined,
): string {
    switch (format) {
        case 'esm':
            return isModulePackage(packageType) ? '.js' : '.mjs'
        case 'cjs':
            return isModulePackage(packageType) ? '.cjs' : '.js'
        case 'iife':
            return '.global.js'
    }
}

export function getBaseFileName(filePath: string): string {
    const filename = path.basename(filePath)
    const extension = path.extname(filename)
    return extension ? filename.slice(0, -extension.length) : filename
}

export function removeExtension(filePath: string): string {
    return filePath.replace(path.extname(filePath), '')
}

export function getJsonSpaceCount(fileContent: string): number {
    const match = fileContent.match(/{\n(\s+)/)
    if (!match) return 2
    return match[1].length
}

export function cleanPath(filePath: string): string {
    return filePath.replace(/\\/g, '/')
}

export function isModulePackage(packageType: string | undefined): boolean {
    return packageType === 'module'
}

export function formatTime(ms: number): string {
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`
}

export function getPackageDeps(
    packageJson: Record<string, unknown> | null,
): string[] {
    if (!packageJson) return []

    return Array.from(
        new Set([
            ...Object.keys(packageJson.dependencies || {}),
            ...Object.keys(packageJson.peerDependencies || {}),
        ]),
    )
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const units = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))

    if (i === 0) return `${bytes} ${units[i]}`

    return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`
}

export function getShortFilePath(filePath: string, maxLength = 3): string {
    const fileParts = filePath.split('/')
    const shortPath = fileParts.slice(-maxLength).join('/')
    return shortPath
}

export async function cleanOutDir(
    rootDir: string,
    outDir: string,
): Promise<void> {
    const outDirPath = path.join(rootDir, outDir)
    try {
        await fs.rm(outDirPath, { recursive: true, force: true })
    } catch (error) {
        throw new BunupBuildError(`Failed to clean output directory: ${error}`)
    }
    await fs.mkdir(outDirPath, { recursive: true })
}

export function makePortablePath(path: string): string {
    // First normalize and convert all backslashes to forward slashes
    let cleaned = normalize(path).replace(/\\/g, '/')

    // Remove Windows drive letter prefix
    cleaned = cleaned.replace(/^[a-zA-Z]:\//, '')

    // Remove any leading slashes
    cleaned = cleaned.replace(/^\/+/, '')

    // Remove any duplicate slashes
    cleaned = cleaned.replace(/\/+/g, '/')

    return cleaned
}
