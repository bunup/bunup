import { isExternal } from '../../helpers/external'
import type { BuildOptions } from '../../options'
import type { BunPlugin } from '../../types'

export function externalPlugin(
	options: BuildOptions,
	packageJson: Record<string, unknown> | null,
): BunPlugin {
	return {
		name: 'bunup:external-plugin',
		setup(build) {
			build.onResolve({ filter: /.*/ }, (args) => {
				const importPath = args.path

				if (isExternal(importPath, options, packageJson)) {
					return {
						path: importPath,
						external: true,
					}
				}

				return null
			})
		},
	}
}
