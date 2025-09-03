import tailwindPostcss from '@tailwindcss/postcss'
import type { BunPlugin } from 'bun'
import postcss from 'postcss'

/**
 * Configuration options for the TailwindCSS plugin
 */
type TailwindCSSOptions = {
	/** CSS class prefix to apply for scoping. Defaults to 'bunup' */
	prefix?: string
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
			const { prefix = 'bunup' } = options
			const rewriter = new HTMLRewriter()

			build.onLoad({ filter: /\.tsx$/ }, async (args) => {
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
					loader: 'tsx',
					contents: result,
				}
			})

			// Handle CSS files - process with TailwindCSS and add prefix to selectors
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

				return {
					contents: result.css,
					loader: 'css',
				}
			})
		},
	}
}
