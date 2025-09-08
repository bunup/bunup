import tailwindPostcss from '@tailwindcss/postcss'
import type { BunPlugin } from 'bun'
import postcss from 'postcss'

/**
 * Configuration options for the TailwindCSS plugin
 */
type TailwindCSSOptions = {
	/** CSS class prefix to apply for scoping. Defaults to 'bunup' */
	prefix?: string
	/** Whether to inject CSS styles dynamically into the document head at runtime instead of bundling them to the build output. Defaults to false */
	inject?: boolean
}

const DEFAULT_PREFIX = `bunup-${generateRandomPrefix()}`

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
			const { prefix = DEFAULT_PREFIX, inject } = options
			const rewriter = new HTMLRewriter()

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

			build.onLoad({ filter: /\.(tsx|jsx)$/ }, async (args) => {
				const source = await Bun.file(args.path).text()

				rewriter.on('*', {
					element(elem) {
						const currentClassName = elem.getAttribute('className')
						const scopedClassName = currentClassName
							?.split(' ')
							.map((c) => `${!c.includes(prefix) ? `${prefix}-` : ''}${c}`)
							.join(' ')
						if (scopedClassName) elem.setAttribute('className', scopedClassName)
					},
				})

				const result = rewriter.transform(source)

				return {
					loader: args.path.endsWith('.tsx') ? 'tsx' : 'jsx',
					contents: result,
				}
			})

			build.onLoad({ filter: /\.css$/ }, async (args) => {
				const source = await Bun.file(args.path).text()

				const result = await postcss([
					tailwindPostcss({
						base: build.config.root,
						transformAssetUrls: false,
					}),
					{
						postcssPlugin: 'scoping',
						Rule(rule) {
							rule.selector = rule.selector.replace(
								/\.([\w-\\/]+)/g,
								(_, cls) => {
									return `.${prefix}-${cls}`
								},
							)
						},
					},
				]).process(source, {
					from: args.path,
				})

				if (inject) {
					return {
						contents: `import injectStyle from '__inject-style';injectStyle(${JSON.stringify(result.css)})`,
						loader: 'js',
					}
				}

				return {
					contents: result.css,
					loader: 'css',
				}
			})
		},
	}
}

function generateRandomPrefix(): string {
	const letters = 'abcdefghijklmnopqrstuvwxyz'
	let result = ''
	for (let i = 0; i < 8; i++) {
		result += letters.charAt(Math.floor(Math.random() * letters.length))
	}
	return result
}
