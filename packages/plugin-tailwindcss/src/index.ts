import tailwindPostcss from '@tailwindcss/postcss'
import browserslist from 'browserslist'
import type { BunPlugin } from 'bun'
import { browserslistToTargets, transform } from 'lightningcss'
import postcss from 'postcss'

/**
 * Configuration options for the TailwindCSS plugin
 */
type TailwindCSSOptions = {
	/** Whether to inject CSS styles dynamically into the document head at runtime instead of bundling them to the build output. Defaults to false */
	inject?: boolean
}

const randomPrefix = generateRandomPrefix()

/**
 * A plugin for Bunup that provides seamless integration with Tailwind CSS.
 *
 * @see https://bunup.dev/docs/recipes/tailwindcss
 */
export default function tailwindcss(
	name: string,
	options: TailwindCSSOptions = {},
): BunPlugin {
	return {
		name: 'bunup:tailwindcss',
		setup: (build) => {
			const { inject } = options
			const rewriter = new HTMLRewriter()

			const prefix = `${name}-${randomPrefix}`

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

				// scope classes by prefixing
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

				const cssFromTailwind = (
					await postcss([
						tailwindPostcss({
							base: build.config.root,
							transformAssetUrls: false,
						}),
					]).process(source, {
						from: args.path,
					})
				).css

				const css = transform({
					filename: args.path,
					code: Buffer.from(cssFromTailwind),
					targets: browserslistToTargets(browserslist('>= 0.25%')),
					// scope selectors and variables
					cssModules: {
						dashedIdents: true,
						pattern: `${prefix}-[local]`,
					},
					minify: true,
				}).code.toString()

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

function generateRandomPrefix(): string {
	const letters = 'abcdefghijklmnopqrstuvwxyz'
	let result = ''
	for (let i = 0; i < 8; i++) {
		result += letters.charAt(Math.floor(Math.random() * letters.length))
	}
	return result
}
