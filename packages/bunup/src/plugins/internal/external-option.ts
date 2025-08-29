import type { BunPlugin } from 'bun'
import { isExternal } from '../../helpers/external'
import type { BuildOptions } from '../../options'

export function externalOptionPlugin(
	options: BuildOptions,
	packageJson: Record<string, unknown> | null,
): BunPlugin {
	return {
		name: 'bunup:external-option-plugin',
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
