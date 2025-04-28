import type { Plugin } from 'rolldown'

import { resolveTsImportPath } from 'ts-import-resolver'
import type { TsConfigData } from '../loaders'
import { generateDtsContent } from './oxc'
import {
	DTS_RE,
	NODE_MODULES_RE,
	getDtsPathFromSourceCodePath,
	isDtsFile,
	isTypeScriptSourceCodeFile,
} from './utils'

export const virtualDtsPlugin = (
	entryFile: string,
	tsconfig: TsConfigData,
	rootDir: string,
): Plugin => {
	const dtsToSourceCodeFileMap = new Map<string, string>()

	return {
		name: 'bunup:virtual-dts',
		async resolveId(source: string, importer?: string) {
			// entry file
			if (importer === undefined) {
				dtsToSourceCodeFileMap.set(source, entryFile)
				return source
			}
			//

			const resolvedPath = resolveTsImportPath({
				path: source,
				importer,
				tsconfig: tsconfig.tsconfig,
				rootDir,
			})

			if (!resolvedPath || !isTypeScriptSourceCodeFile(resolvedPath))
				return null

			const dtsPath = getDtsPathFromSourceCodePath(resolvedPath)

			if (!dtsPath) return null

			dtsToSourceCodeFileMap.set(dtsPath, resolvedPath)

			return dtsPath
		},
		load: {
			filter: {
				id: {
					include: [DTS_RE],
					exclude: [NODE_MODULES_RE],
				},
			},
			async handler(id: string) {
				if (isDtsFile(id)) {
					const sourceCodePath = dtsToSourceCodeFileMap.get(id)
					if (!sourceCodePath) return null
					const declaration = await generateDtsContent(sourceCodePath)
					if (!declaration) return null
					return {
						code: declaration,
						moduleSideEffects: false,
					}
				}
				return null
			},
		},
		buildEnd() {
			dtsToSourceCodeFileMap.clear()
		},
	}
}
