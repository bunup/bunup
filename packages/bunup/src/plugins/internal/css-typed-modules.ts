import type { BunPlugin } from 'bun'
import { transform } from 'lightningcss'

/**
 * This plugin will automatically generate type definitions (.d.ts) for css modules
 */
export function cssTypedModulesPlugin(): BunPlugin {
	return {
		name: 'bunup:css-typed-modules',
		setup(build) {
			build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
				const uc = new Set()

				const source = await Bun.file(args.path).text()

				transform({
					filename: args.path,
					code: Buffer.from(source),
					visitor: {
						Rule: {
							style(rule) {
								rule.value.selectors.forEach((selector) => {
									selector.forEach((component) => {
										if (component.type === 'class') {
											uc.add(component.name)
										}
									})
								})
							},
						},
					},
				})

				const classes = Array.from(uc)

				const destination = `${args.path}.d.ts`

				const dts = `declare const classes: {
${classes.map((className) => `  readonly "${className}": string;`).join('\n')}
};
export default classes;
`

				await Bun.write(destination, dts)
			})
		},
	}
}
