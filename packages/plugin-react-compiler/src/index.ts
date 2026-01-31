import babel from "@babel/core";
import BabelPluginReactCompiler, { type PluginOptions } from "babel-plugin-react-compiler";

/**
 * Options for the React Compiler Bun plugin
 */
export interface ReactCompilerPluginOptions {
	/**
	 * RegExp filter to determine which files to process
	 * @default /\.[jt]sx$/
	 */
	filter?: RegExp;
	/**
	 * Configuration options passed to babel-plugin-react-compiler
	 */
	reactCompilerConfig?: PluginOptions;
}

/**
 * Bunup plugin for React's new compiler to automatically optimize React component libraries.
 *
 * @see https://bunup.dev/docs/recipes/react#react-compiler
 * ```
 */
export function reactCompiler(options: ReactCompilerPluginOptions = {}): Bun.BunPlugin {
	const filter: RegExp = options.filter || /\.[jt]sx$/;
	const reactCompilerConfig: Record<string, unknown> = options.reactCompilerConfig || {};

	return {
		name: "bunup:react-compiler",
		setup({ onLoad }) {
			onLoad({ filter }, async (args) => {
				const input = await Bun.file(args.path).text();

				const result = await babel.transformAsync(input, {
					filename: args.path,
					plugins: [[BabelPluginReactCompiler, reactCompilerConfig]],
					parserOpts: {
						plugins: ["jsx", "typescript"],
					},
					ast: false,
					sourceMaps: true,
					configFile: false,
					babelrc: false,
				});

				if (result == null) {
					return { contents: input, loader: "tsx" };
				}

				const { code, map } = result;

				return {
					contents: `${code}\n//# sourceMappingURL=${toUrl(map)}`,
					loader: "tsx",
				};
			});
		},
	};
}

function b64enc(b: string | Buffer): string {
	return Buffer.from(b).toString("base64");
}

function toUrl(map: babel.BabelFileResult["map"]): string {
	return `data:application/json;charset=utf-8;base64,${b64enc(JSON.stringify(map))}`;
}

export default reactCompiler;
