import path from 'node:path'
import { getDefaultCssBrowserTargets } from '@bunup/shared'
import type { BunPlugin } from 'bun'
import { transform } from 'lightningcss'
import { CSS_RE } from '../../constants/re'
import { logger } from '../../printer/logger'
import type { MaybePromise } from '../../types'

type InjectStylesPluginOptions = {
	/**
	 * Custom function to inject CSS into the document head.
	 *
	 * By default, bunup uses its own `injectStyle` function that creates a `<style>`
	 * tag and appends it to the document head. You can provide your own injection
	 * logic to customize how styles are applied to the document.
	 *
	 * @param css - The processed CSS string (already JSON stringified)
	 * @param filePath - The original file path of the CSS file being processed
	 * @returns JavaScript code that will inject the styles when executed
	 *
	 * @example
	 * ```ts
	 * injectStyles({
	 *   inject: (css, filePath) => {
	 *     return `
	 *       const style = document.createElement('style');
	 *       style.setAttribute('data-source', '${filePath}');
	 *       style.textContent = ${css};
	 *       document.head.appendChild(style);
	 *     `;
	 *   }
	 * })
	 * ```
	 *
	 * The default injection handles cases like when `document` is undefined (e.g., server-side rendering) and compatibility with older browsers. Consider these when implementing custom injection logic.
	 */
	inject?: (css: string, filePath: string) => MaybePromise<string>
	/**
	 * Whether to minify the styles being injected.
	 *
	 * @default true
	 */
	minify?: boolean
}

/**
 * A plugin that injects styles into the document head at runtime instead of bundling them to the build output.
 *
 * @see https://bunup.dev/docs/builtin-plugins/inject-styles
 */
export function injectStyles(options?: InjectStylesPluginOptions): BunPlugin {
	const { inject, minify = true } = options ?? {}

	return {
		name: 'bunup:inject-styles',
		async setup(build) {
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

				const { code, warnings } = transform({
					filename: path.basename(args.path),
					code: Buffer.from(source),
					minify,
					targets: getDefaultCssBrowserTargets(),
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
