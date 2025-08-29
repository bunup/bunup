import { dirname } from 'node:path'
import process from 'node:process'
import { ResolverFactory } from 'oxc-resolver'
import type { Resolve } from './options'
import { JS_RE } from './re'
import { isTypeScriptFile, returnPathIfExists } from './utils'

export interface Options {
	cwd: string
	tsconfig: string | null
	resolveOption: Resolve | undefined
}

type Resolver = (id: string, importer?: string) => string | null

export function createResolver({
	tsconfig,
	cwd = process.cwd(),
	resolveOption,
}: Options): Resolver {
	const resolver = new ResolverFactory({
		mainFields: ['types', 'typings', 'module', 'main'],
		conditionNames: ['types', 'typings', 'import', 'require'],
		extensions: ['.d.ts', '.d.mts', '.d.cts', '.ts', '.mts', '.cts'],
		tsconfig: tsconfig
			? { configFile: tsconfig, references: 'auto' }
			: undefined,
	})

	const resolutionCache = new Map<string, string | null>()

	return (importSource: string, importer?: string): string | null => {
		// skip bun types for now
		if (importSource === 'bun') return null

		const cacheKey = `${importSource}:${importer || ''}`

		if (resolutionCache.has(cacheKey)) {
			return resolutionCache.get(cacheKey) || null
		}

		let shouldResolve = false

		if (resolveOption !== undefined) {
			if (typeof resolveOption === 'boolean') {
				shouldResolve = resolveOption
			} else if (Array.isArray(resolveOption)) {
				shouldResolve = resolveOption.some((resolver) => {
					if (typeof resolver === 'string') {
						return resolver === importSource
					}
					return resolver.test(importSource)
				})
			}
		}

		if (!shouldResolve) {
			resolutionCache.set(cacheKey, null)
			return null
		}

		const directory = importer ? dirname(importer) : cwd

		const resolution = resolver.sync(directory, importSource)
		if (!resolution.path) {
			resolutionCache.set(cacheKey, null)
			return null
		}
		const resolved = resolution.path

		// if the resolved path is a js file, check for corresponding d.ts files
		if (JS_RE.test(resolved)) {
			const dts =
				returnPathIfExists(resolved.replace(JS_RE, '.d.ts')) ||
				returnPathIfExists(resolved.replace(JS_RE, '.d.mts')) ||
				returnPathIfExists(resolved.replace(JS_RE, '.d.cts'))

			const result = isTypeScriptFile(dts) ? dts : null
			resolutionCache.set(cacheKey, result)
			return result
		}

		const result = isTypeScriptFile(resolved) ? resolved : null
		resolutionCache.set(cacheKey, result)
		return result
	}
}
