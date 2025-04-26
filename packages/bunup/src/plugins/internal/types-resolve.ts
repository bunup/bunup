import path from 'node:path'

import { ResolverFactory } from 'oxc-resolver'
import type { Plugin } from 'rolldown'

import {
	getDtsPathFromSourceCodePath,
	isSourceCodeFile,
	removeDtsVirtualPrefix,
} from '../../dts/utils'
import type { TsConfigData } from '../../loaders'
import type { DtsResolve } from '../../options'

let resolver: ResolverFactory

export function typesResolvePlugin(
	tsconfig: TsConfigData,
	dtsResolve: DtsResolve,
): Plugin {
	return {
		name: 'bunup:types-resolve',
		buildStart() {
			resolver ||= new ResolverFactory({
				mainFields: ['types', 'typings', 'module', 'main'],
				conditionNames: ['types', 'typings', 'import', 'require'],
				extensions: [
					'.d.ts',
					'.d.mts',
					'.d.cts',
					'.ts',
					'.mts',
					'.cts',
				],
				...(tsconfig.path && {
					tsconfig: {
						configFile: tsconfig.path,
					},
				}),
				modules: ['node_modules', 'node_modules/@types'],
			})
		},
		async resolveId(id, importer) {
			if (dtsResolve === false) return

			// skip bun types for now
			if (id === 'bun') return

			const cleanedImporter = importer
				? removeDtsVirtualPrefix(importer)
				: undefined

			// skip rollup virtual modules
			if (/\0/.test(id)) return

			if (Array.isArray(dtsResolve)) {
				const shouldResolve = dtsResolve.some((resolver) =>
					typeof resolver === 'string'
						? resolver === id
						: resolver.test(id),
				)
				if (!shouldResolve) {
					return
				}
			}

			const directory = cleanedImporter
				? path.dirname(cleanedImporter)
				: process.cwd()

			const { path: resolved } = await resolver.async(directory, id)

			if (!resolved) return

			// if resolved file is a js/ts file, try to resolve the corresponding d.ts file
			if (isSourceCodeFile(resolved)) {
				const dtsPath = getDtsPathFromSourceCodePath(resolved)

				try {
					const { path: dtsResolved } = await resolver.async(
						path.dirname(resolved),
						dtsPath,
					)
					if (dtsResolved) {
						return dtsResolved
					}
				} catch (error) {}

				return
			}

			return resolved
		},
	}
}
