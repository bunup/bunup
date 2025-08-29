import path from 'node:path'
import type { BunPlugin } from 'bun'
import { CSS_RE } from '../../constants/re'
import { logger } from '../../logger'
import type { MaybePromise } from '../../types'
import { getPackageForPlugin } from '../utils'

type InjectStylesPluginOptions = Pick<
	import('lightningcss').TransformOptions<import('lightningcss').CustomAtRules>,
	| 'targets'
	| 'nonStandard'
	| 'pseudoClasses'
	| 'unusedSymbols'
	| 'errorRecovery'
	| 'visitor'
	| 'customAtRules'
	| 'include'
	| 'exclude'
	| 'drafts'
> & {
	inject?: (css: string, filePath: string) => MaybePromise<string>
	/** Whether to minify the CSS.
	 * @default true
	 */
	minify?: boolean
}

/**
 * A plugin that injects styles into the document head.
 *
 * @see https://bunup.dev/docs/plugins/inject-styles
 */
export function injectStyles(options?: InjectStylesPluginOptions): BunPlugin {
	const { inject, ...transformOptions } = options ?? {}

	return {
		name: 'bunup:inject-styles',
		async setup(build) {
			const lightningcss = await getPackageForPlugin<
				typeof import('lightningcss')
			>('lightningcss', 'inject-styles')

			build.onResolve({ filter: /^__inject-style$/ }, () => {
				return {
					path: '__inject-style',
					namespace: '__inject-style',
				}
			})

			build.onLoad(
				{ filter: /^__inject-style$/, namespace: '__inject-style' },
				() => {
					return {
						contents: `
                      export default function injectStyle(css) {
                        if (!css || typeof document === 'undefined') return

                        const head = document.head || document.getElementsByTagName('head')[0]
                        const style = document.createElement('style')
                        head.appendChild(style)

                        if (style.styleSheet) {
                          style.styleSheet.cssText = css
                        } else {
                          style.appendChild(document.createTextNode(css))
                        }
                      }
                      `,
						loader: 'js',
					}
				},
			)

			build.onLoad({ filter: CSS_RE }, async (args) => {
				const source = await Bun.file(args.path).text()

				const { code, warnings } = lightningcss.transform({
					...transformOptions,
					filename: path.basename(args.path),
					code: Buffer.from(source),
					minify: transformOptions.minify ?? true,
				})

				for (const warning of warnings) {
					logger.warn(warning.message)
				}

				const stringifiedCode = JSON.stringify(code.toString())

				const js = inject
					? await inject(stringifiedCode, args.path)
					: `import injectStyle from '__inject-style';injectStyle(${stringifiedCode})`

				return {
					contents: js,
					loader: 'js',
				}
			})
		},
	}
}
