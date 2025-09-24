import tailwindPostcss from '@tailwindcss/postcss'
import type { BunPlugin } from 'bun'
import { transform } from 'lightningcss'
import postcss from 'postcss'

/**
 * Configuration options for the TailwindCSS plugin
 */
type TailwindCSSOptions = {
	/** Whether to inject CSS styles dynamically into the document head at runtime instead of bundling them to the build output. Defaults to false */
	inject?: boolean
	minify?: boolean
	preflight?: boolean
	prefix?: string | false
}

/**
 * A plugin for Bunup that provides seamless integration with Tailwind CSS.
 *
 * @see https://bunup.dev/docs/recipes/tailwindcss
 */
export default function tailwindcss(
	options: TailwindCSSOptions = {},
): BunPlugin {
	return {
		name: 'bunup:tailwindcss',
		setup: (build) => {
			const { inject, minify, preflight = true, prefix } = options

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

			const rewriter = new HTMLRewriter()

			if (typeof prefix === 'string') {
				build.onLoad({ filter: /\.(tsx|jsx)$/ }, async (args) => {
					const source = await Bun.file(args.path).text()

					// scope classes by prefixing
					rewriter.on('*', {
						element(elem) {
							const currentClassName = elem.getAttribute('className')
							const scopedClassName = currentClassName
								?.split(' ')
								.map((c) => `${!c.includes(prefix) ? `${prefix}-` : ''}${c}`)
								.join(' ')
							if (scopedClassName)
								elem.setAttribute('className', scopedClassName)
						},
					})

					const result = rewriter.transform(source)

					return {
						loader: args.path.endsWith('.tsx') ? 'tsx' : 'jsx',
						contents: result,
					}
				})
			}

			build.onLoad({ filter: /\.css$/ }, async (args) => {
				const source = await Bun.file(args.path).text()

				const cssFromTailwind = (
					await postcss([
						tailwindPostcss({
							base: build.config.root,
							transformAssetUrls: false,
							optimize: false,
						}),
					]).process(preprocessSource(source, preflight), {
						from: args.path,
					})
				).css

				let css = cssFromTailwind

				if (typeof prefix === 'string') {
					css = transform({
						filename: args.path,
						code: Buffer.from(cssFromTailwind),
						cssModules: {
							dashedIdents: true,
							pattern: `${prefix}-[local]`,
						},
						minify: minify ?? !!build.config.minify,
					}).code.toString()
				}

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

const TAILWIND_IMPORT_REGEX =
	/^[\s]*@import\s+["']tailwindcss[^"']*["'][^;]*;[\s]*$/gm

function preprocessSource(source: string, preflight: boolean | undefined) {
	const removedTailwindImports = source.replace(TAILWIND_IMPORT_REGEX, '')

	return `
	@layer theme, base, components, utilities;
	@import "tailwindcss/theme.css" layer(theme);
	${preflight ? '@import "tailwindcss/preflight.css" layer(base);' : ''}
	@import "tailwindcss/utilities.css" layer(utilities);
	@source not inline("{contents,filter,transform}");
	${removedTailwindImports}
`.trim()
}
