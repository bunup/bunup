import type { Format, ShimOptions, Shims, Target } from '../../options'
import type { BunPlugin } from '../../types'
import { isNodeCompatibleTarget } from '../../utils'

interface InjectShimsPluginOptions {
	format: Format
	target: Target
	shims?: Shims
}

interface ShebangExtraction {
	shebangLine: string
	codeContent: string
}

interface ShimConfig {
	appliesTo: (format: Format, target: Target) => boolean
	isNeededInFile: (content: string) => boolean
	generateCode: () => string
}

const JS_TS_FILE_PATTERN = /\.(js|ts|jsx|tsx|mts|cts)$/

const registry: Record<keyof ShimOptions, ShimConfig> = {
	dirnameFilename: {
		appliesTo: (format, target) =>
			format === 'esm' && isNodeCompatibleTarget(target),
		isNeededInFile: (content) =>
			/\b__dirname\b/.test(content) || /\b__filename\b/.test(content),
		generateCode: () => `import { fileURLToPath } from 'url';
  import { dirname } from 'path';
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  `,
	},

	importMetaUrl: {
		appliesTo: (format, target) =>
			format === 'cjs' && isNodeCompatibleTarget(target),
		isNeededInFile: (content) => /\bimport\.meta\.url\b/.test(content),
		generateCode: () => `import { pathToFileURL } from 'url';
  
  const importMetaUrl = pathToFileURL(__filename).href;
  
  `,
	},
}

export function injectShimsPlugin({
	format,
	target,
	shims,
}: InjectShimsPluginOptions): BunPlugin {
	const enabledShimNames = getEnabledShimNames(shims)

	const applicableShims = enabledShimNames
		.map((shimName) => registry[shimName])
		.filter((shim) => shim.appliesTo(format, target))

	if (applicableShims.length === 0) {
		return {
			name: 'bunup:inject-shims',
			setup() {},
		}
	}

	return {
		name: 'bunup:inject-shims',
		setup(build) {
			build.onLoad({ filter: JS_TS_FILE_PATTERN }, async ({ path }) => {
				const content = await Bun.file(path).text()

				const neededShims = applicableShims.filter((shim) =>
					shim.isNeededInFile(content),
				)

				if (neededShims.length === 0) return

				const { shebangLine, codeContent } = extractShebang(content)

				const shimCode = neededShims
					.map((shim) => shim.generateCode())
					.join('')

				return {
					contents: shebangLine + shimCode + codeContent,
				}
			})
		},
	}
}

function getEnabledShimNames(shims?: Shims): Array<keyof ShimOptions> {
	if (shims === true) {
		return Object.keys(registry) as Array<keyof ShimOptions>
	}

	if (!shims) {
		return []
	}

	return Object.entries(shims)
		.filter(([name, enabled]) => enabled && name in registry)
		.map(([name]) => name as keyof ShimOptions)
}

function extractShebang(content: string): ShebangExtraction {
	if (!content.startsWith('#!')) {
		return { shebangLine: '', codeContent: content }
	}

	const newlineIndex = content.indexOf('\n')
	return newlineIndex === -1
		? { shebangLine: '', codeContent: content }
		: {
				shebangLine: content.slice(0, newlineIndex + 1),
				codeContent: content.slice(newlineIndex + 1),
			}
}
