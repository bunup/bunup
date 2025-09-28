import path from 'node:path'
import { getDefaultCssBrowserTargets } from '@bunup/shared'
import tailwindPostcss from '@tailwindcss/postcss'
import type { BunPlugin } from 'bun'
import { transform } from 'lightningcss'
import postcss, { type Plugin } from 'postcss'

type TailwindCSSOptions = {
	/**
	 * Whether to inject CSS styles dynamically into the document head at runtime
	 * instead of bundling them to the build output.
	 * @default false
	 */
	inject?: boolean
	/**
	 * Whether to minify the generated CSS output.
	 * @default false
	 */
	minify?: boolean
	/**
	 * Whether to include Tailwind's preflight styles (CSS reset).
	 * @default false
	 */
	preflight?: boolean
	/**
	 * Additional PostCSS plugins to apply during CSS processing.
	 */
	postcssPlugins?: Plugin[]
}

/**
 * A plugin for Bunup that provides seamless integration with Tailwind CSS.
 *
 * @see https://bunup.dev/docs/recipes/tailwindcss
 */
export function tailwindcss(options: TailwindCSSOptions = {}): BunPlugin {
	return {
		name: 'bunup:tailwindcss',
		setup: (build) => {
			const { inject, minify, preflight, postcssPlugins } = options

			if (inject) {
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
			}

			build.onLoad({ filter: /\.css$/ }, async (args) => {
				const source = await Bun.file(args.path).text()

				const cssFromTailwind = (
					await postcss([
						tailwindPostcss({
							base: build.config.root,
							transformAssetUrls: false,
						}),
						...(postcssPlugins ?? []),
					]).process(preprocessSource(source, preflight), {
						from: args.path,
					})
				).css

				const { code: css } = transform({
					filename: path.basename(args.path),
					code: Buffer.from(cssFromTailwind),
					minify: minify ?? !!build.config.minify,
					targets: getDefaultCssBrowserTargets(),
				})

				if (inject) {
					return {
						contents: `import injectStyle from '__inject-style';injectStyle(${JSON.stringify(css)})`,
						loader: 'js',
					}
				}

				return {
					contents: css,
					loader: 'css',
				}
			})
		},
	}
}

export default tailwindcss

const TAILWIND_IMPORT_RE =
	/^[\s]*@import\s+["']tailwindcss[^"']*["'][^;]*;[\s]*$/gm

const PREFIX_RE =
	/^[\s]*@import\s+["']tailwindcss[^"']*["'][^;]*prefix\(([^)]+)\)[^;]*;[\s]*$/gm

function extractPrefix(source: string): string | null {
	const match = source.match(PREFIX_RE)
	if (match) {
		const prefixMatch = match[0].match(/prefix\(([^)]+)\)/)
		return prefixMatch ? prefixMatch[1] : null
	}
	return null
}

function preprocessSource(source: string, preflight: boolean | undefined) {
	const prefix = extractPrefix(source)
	const removedTailwindImports = source.replace(TAILWIND_IMPORT_RE, '')

	return `
	@layer theme, base, components, utilities;
	@import "tailwindcss/theme.css" layer(theme)${prefix ? ` prefix(${prefix});` : ';'};
	${preflight ? `@import "tailwindcss/preflight.css" layer(base)${prefix ? ` prefix(${prefix});` : ';'};` : ''}
	@import "tailwindcss/utilities.css" layer(utilities)${prefix ? ` prefix(${prefix});` : ';'};
	@source not inline("{contents,filter,transform}");
	${removedTailwindImports}
`.trim()
}
