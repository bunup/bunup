import { build } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

import type { TsConfigData } from '../loaders'
import { logger } from '../logger'
import type { BuildOptions } from '../options'
import { typesResolvePlugin } from '../plugins/internal/types-resolve'
import { runPostDtsValidation } from './generator'
import {
	addDtsVirtualPrefix,
	dtsShouldTreatAsExternal,
	getDtsPathFromSourceCodePath,
} from './utils'
import { virtualDtsPlugin } from './virtual-dts'

export async function bundleDts(
	entryFile: string,
	options: BuildOptions,
	packageJson: Record<string, unknown> | null,
	tsconfig: TsConfigData,
	rootDir: string,
): Promise<string> {
	const entryDtsPath = getDtsPathFromSourceCodePath(entryFile)
	const initialDtsEntry = addDtsVirtualPrefix(entryDtsPath)

	const dtsResolve =
		typeof options.dts === 'object' && 'resolve' in options.dts
			? options.dts.resolve
			: undefined

	const { output } = await build({
		input: initialDtsEntry,
		write: false,
		...(tsconfig.path && {
			resolve: {
				tsconfigFilename: tsconfig.path,
			},
		}),
		onwarn(warning, handler) {
			if (
				[
					'UNRESOLVED_IMPORT',
					'CIRCULAR_DEPENDENCY',
					'EMPTY_BUNDLE',
				].includes(warning.code ?? '')
			)
				return
			handler(warning)
		},
		plugins: [
			virtualDtsPlugin(entryFile, tsconfig, rootDir),
			dtsResolve && typesResolvePlugin(tsconfig, dtsResolve),
			dts({
				dtsInput: true,
				emitDtsOnly: true,
			}),
		],
		external: (source) =>
			dtsShouldTreatAsExternal(source, options, packageJson, dtsResolve),
	})

	runPostDtsValidation(!!options.watch)

	const bundledDts = output[0]?.code

	if (!bundledDts) {
		logger.warn(
			`Generated empty declaration file for entry "${entryFile}"`,
			{
				muted: true,
			},
		)

		return ''
	}

	return bundledDts
}
