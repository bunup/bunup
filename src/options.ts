import type { BuildConfig } from 'bun'
import type { GenerateDtsOptions } from 'typeroll'
import { report } from './plugins/internal/report'
import { useClient } from './plugins/internal/use-client'
import type { Plugin } from './plugins/types'
import type { MaybePromise, WithRequired } from './types'
import { getDefaultOutputExtension } from './utils'

type Loader =
	| 'js'
	| 'jsx'
	| 'ts'
	| 'tsx'
	| 'json'
	| 'toml'
	| 'file'
	| 'napi'
	| 'wasm'
	| 'text'
	| 'css'
	| 'html'

type Define = Record<string, string>

type Sourcemap = 'none' | 'linked' | 'inline' | 'external' | 'linked' | boolean

export type Format = 'esm' | 'cjs' | 'iife'

type Target = 'bun' | 'node' | 'browser'

type External = (string | RegExp)[]

type Env = 'inline' | 'disable' | `${string}*` | Record<string, string>

type Naming = string | { entry?: string; chunk?: string; asset?: string }

export interface BuildOptions {
	/**
	 * Name of the build configuration
	 * Used for logging and identification purposes
	 */
	name?: string

	/**
	 * Entry point files for the build
	 *
	 * This can be:
	 * - A string path to a file
	 * - An array of file paths
	 *
	 * @see https://bunup.dev/docs/#entry-points
	 */
	entry: string | string[]

	/**
	 * Output directory for the bundled files
	 * Defaults to 'dist' if not specified
	 */
	outDir: string

	/**
	 * Output formats for the bundle
	 * Can include 'esm', 'cjs', and/or 'iife'
	 * Defaults to ['esm'] if not specified
	 */
	format: Format[]

	/**
	 * Whether to enable all minification options
	 * When true, enables minifyWhitespace, minifyIdentifiers, and minifySyntax
	 */
	minify?: boolean

	/**
	 * Whether to enable code splitting
	 * Defaults to true for ESM format, false for CJS format
	 */
	splitting?: boolean

	/**
	 * Whether to minify whitespace in the output
	 * Removes unnecessary whitespace to reduce file size
	 */
	minifyWhitespace?: boolean

	/**
	 * Whether to minify identifiers in the output
	 * Renames variables and functions to shorter names
	 */
	minifyIdentifiers?: boolean

	/**
	 * Whether to minify syntax in the output
	 * Optimizes code structure for smaller file size
	 */
	minifySyntax?: boolean

	/**
	 * Whether to watch for file changes and rebuild automatically
	 */
	watch?: boolean

	/**
	 * Whether to generate TypeScript declaration files (.d.ts)
	 * When set to true, generates declaration files for all entry points
	 * Can also be configured with DtsOptions for more control
	 */
	dts?:
		| boolean
		| (Pick<GenerateDtsOptions, 'resolve' | 'splitting' | 'minify'> & {
				entry?: string | string[]
		  })

	/**
	 * Path to a preferred tsconfig.json file to use for declaration generation
	 *
	 * If not specified, the tsconfig.json in the project root will be used.
	 * This option allows you to use a different TypeScript configuration
	 * specifically for declaration file generation.
	 *
	 * @example
	 * preferredTsconfigPath: './tsconfig.build.json'
	 */
	preferredTsconfigPath?: string

	/**
	 * External packages that should not be bundled
	 * Useful for dependencies that should be kept as external imports
	 */
	external?: External

	/**
	 * Packages that should be bundled even if they are in external
	 * Useful for dependencies that should be included in the bundle
	 */
	noExternal?: External

	/**
	 * The target environment for the bundle.
	 * Can be 'browser', 'bun', 'node', etc.
	 * Defaults to 'node' if not specified.
	 *
	 * Bun target is for generating bundles that are intended to be run by the Bun runtime. In many cases,
	 * it isn't necessary to bundle server-side code; you can directly execute the source code
	 * without modification. However, bundling your server code can reduce startup times and
	 * improve running performance.
	 *
	 * All bundles generated with `target: "bun"` are marked with a special `// @bun` pragma, which
	 * indicates to the Bun runtime that there's no need to re-transpile the file before execution.
	 */
	target?: Target

	/**
	 * Whether to clean the output directory before building
	 * When true, removes all files in the outDir before starting a new build
	 * Defaults to true if not specified
	 */
	clean?: boolean
	/**
	 * Specifies the type of sourcemap to generate
	 * Can be 'none', 'linked', 'external', or 'inline'
	 * Can also be a boolean - when true, it will use 'inline'
	 *
	 * @see https://bun.sh/docs/bundler#sourcemap
	 *
	 * @default 'none'
	 *
	 * @example
	 * sourcemap: 'linked'
	 * // or
	 * sourcemap: true // equivalent to 'inline'
	 */
	sourcemap?: Sourcemap
	/**
	 * Define global constants for the build
	 * These values will be replaced at build time
	 *
	 * @see https://bun.sh/docs/bundler#define
	 *
	 * @example
	 * define: {
	 *   'process.env.NODE_ENV': '"production"',
	 *   'PACKAGE_VERSION': '"1.0.0"'
	 * }
	 */
	define?: Define
	/**
	 * A callback function that runs after the build process completes
	 * This can be used for custom post-build operations like copying files,
	 * running additional tools, or logging build information
	 *
	 * If watch mode is enabled, this callback runs after each rebuild
	 *
	 * @param options The build options that were used
	 */
	onSuccess?: (options: Partial<BuildOptions>) => MaybePromise<void>
	/**
	 * A banner to be added to the final bundle, this can be a directive like "use client" for react or a comment block such as a license for the code.
	 *
	 * @see https://bun.sh/docs/bundler#banner
	 *
	 * @example
	 * banner: '"use client";'
	 */
	banner?: string
	/**
	 * A footer to be added to the final bundle, this can be something like a comment block for a license or just a fun easter egg.
	 *
	 * @see https://bun.sh/docs/bundler#footer
	 *
	 * @example
	 * footer: '// built with love in SF'
	 */
	footer?: string
	/**
	 * Remove function calls from a bundle. For example, `drop: ["console"]` will remove all calls to `console.log`. Arguments to calls will also be removed, regardless of if those arguments may have side effects. Dropping `debugger` will remove all `debugger` statements.
	 *
	 * @see https://bun.sh/docs/bundler#drop
	 *
	 * @example
	 * drop: ["console", "debugger", "anyIdentifier.or.propertyAccess"]
	 */
	drop?: string[]
	/**
	 * A map of file extensions to [built-in loader names](https://bun.sh/docs/bundler/loaders#built-in-loaders). This can be used to quickly customize how certain files are loaded.
	 *
	 * @see https://bun.sh/docs/bundler#loader
	 *
	 * @example
	 * loader: {
	 *   ".png": "dataurl",
	 *   ".txt": "file",
	 * }
	 */
	loader?: { [k in string]: Loader }
	/**
	 * Generate bytecode for the output. This can dramatically improve cold start times, but will make the final output larger and slightly increase memory usage.
	 *
	 * Bytecode is currently only supported for CommonJS (format: "cjs").
	 *
	 * Must be target: "bun"
	 *
	 * @see https://bun.sh/docs/bundler#bytecode
	 *
	 * @default false
	 */
	bytecode?: boolean
	/**
	 * Disable logging during the build process. When set to true, no logs will be printed to the console.
	 *
	 * @default false
	 */
	silent?: boolean
	/**
	 * You can specify a prefix to be added to specific import paths in your bundled code
	 *
	 * Used for assets, external modules, and chunk files when splitting is enabled
	 *
	 * @see https://bunup.dev/docs#public-path for more information
	 *
	 * @example
	 * publicPath: 'https://cdn.example.com/'
	 */
	publicPath?: string

	/**
	 * Controls how environment variables are handled during bundling.
	 *
	 * Can be one of:
	 * - `"inline"`: Replaces all `process.env.FOO` references in your code with the actual values
	 *   of those environment variables at the time the build runs.
	 * - `"disable"`: Disables environment variable injection entirely, leaving `process.env.*` as-is.
	 * - A string ending in `*`: Only inlines environment variables matching the given prefix.
	 *   For example, `"MY_PUBLIC_*"` will inline variables like `MY_PUBLIC_API_URL`.
	 * - An object of key-value pairs: Replaces both `process.env.KEY` and `import.meta.env.KEY`
	 *   with the provided values, regardless of the runtime environment.
	 *
	 * Note: Values are injected at build time. Secrets or private keys should be excluded
	 * from inlining when targeting browser environments.
	 *
	 * @see https://bun.sh/docs/bundler#env to learn more about inline, disable, prefix, and object modes
	 *
	 * @example
	 * // Inline all environment variables available at build time
	 * env: "inline"
	 *
	 * // Disable all environment variable injection
	 * env: "disable"
	 *
	 * // Only inline environment variables with a specific prefix
	 * env: "PUBLIC_*"
	 *
	 * // Provide specific environment variables manually
	 * env: { API_URL: "https://api.example.com", DEBUG: "false" }
	 */
	env?: Env
	/**
	 * Ignore dead code elimination/tree-shaking annotations such as @__PURE__ and package.json
	 * "sideEffects" fields. This should only be used as a temporary workaround for incorrect
	 * annotations in libraries.
	 */
	ignoreDCEAnnotations?: boolean
	/**
	 * Force emitting @__PURE__ annotations even if minify.whitespace is true.
	 */
	emitDCEAnnotations?: boolean
	/**
	 * Plugins to extend the build process functionality
	 *
	 * The Plugin type uses a discriminated union pattern with the 'type' field
	 * to support different plugin systems. Both "bun" and "bunup" plugins are supported.
	 *
	 * Each plugin type has its own specific plugin implementation:
	 * - "bun": Uses Bun's native plugin system (BunPlugin)
	 * - "bunup": Uses bunup's own plugin system with lifecycle hooks
	 *
	 * This architecture allows for extensibility as more plugin systems are added.
	 *
	 * @see https://bunup.dev/docs/advanced/plugin-development for more information on plugins
	 *
	 * @example
	 * plugins: [
	 *   {
	 *     type: "bun",
	 *     plugin: myBunPlugin()
	 *   },
	 *   {
	 *     type: "bunup",
	 *     hooks: {
	 *       onBuildStart: (options) => {
	 *         console.log('Build started with options:', options)
	 *       },
	 *       onBuildDone: ({ options, output }) => {
	 *         console.log('Build completed with output:', output)
	 *       }
	 *     }
	 *   }
	 * ]
	 */
	plugins?: Plugin[]
}

const DEFAULT_OPTIONS: WithRequired<BuildOptions, 'clean'> = {
	entry: ['src/index.ts'],
	format: ['esm'],
	outDir: 'dist',
	target: 'node',
	clean: true,
}

export function createBuildOptions(
	partialOptions: Partial<BuildOptions>,
): BuildOptions {
	const options = {
		...DEFAULT_OPTIONS,
		...partialOptions,
	}

	return {
		...options,
		plugins: [...(options.plugins ?? []), useClient(), report()],
	}
}

export function getResolvedMinify(options: BuildOptions): {
	whitespace: boolean
	identifiers: boolean
	syntax: boolean
} {
	const { minify, minifyWhitespace, minifyIdentifiers, minifySyntax } = options
	const defaultValue = minify === true

	return {
		whitespace: minifyWhitespace ?? defaultValue,
		identifiers: minifyIdentifiers ?? defaultValue,
		syntax: minifySyntax ?? defaultValue,
	}
}

export function getResolvedBytecode(
	bytecode: boolean | undefined,
	format: Format,
): boolean | undefined {
	return format === 'cjs' ? bytecode : undefined
}

export function getResolvedSourcemap(
	sourcemap: boolean | string | undefined,
): BuildConfig['sourcemap'] {
	if (sourcemap === true) {
		return 'inline'
	}

	return typeof sourcemap === 'string'
		? (sourcemap as BuildConfig['sourcemap'])
		: undefined
}

export function getResolvedDefine(
	define: Define | undefined,
	env: Env | undefined,
): Record<string, string> | undefined {
	return {
		...(typeof env === 'object' &&
			Object.keys(env).reduce<Record<string, string>>((acc, key) => {
				const value = JSON.stringify(env[key])
				acc[`process.env.${key}`] = value
				acc[`import.meta.env.${key}`] = value
				return acc
			}, {})),
		...define,
	}
}

// If splitting is undefined, it will be true if the format is esm
export function getResolvedSplitting(
	splitting: boolean | undefined,
	format: Format,
): boolean {
	return splitting === undefined ? format === 'esm' : splitting
}

export function getResolvedDtsSplitting(
	buildSplitting: boolean | undefined,
	dtsSplitting: boolean | undefined,
): boolean {
	// TODO: Enable splitting by default once Bun fixes the issue with splitting
	// Track upstream issue: https://github.com/oven-sh/bun/issues/5344
	return dtsSplitting ?? buildSplitting ?? false
}

const DEFAULT_ENTRY_NAMING = '[dir]/[name].[ext]'

export function getDefaultChunkNaming(name: string | undefined) {
	return `shared/${name ?? 'chunk'}-[hash].[ext]`
}

export function getResolvedNaming(
	fmt: Format,
	packageType: string | undefined,
	name: string | undefined,
): Naming {
	const replaceExt = (pattern: string): string =>
		pattern.replace('.[ext]', getDefaultOutputExtension(fmt, packageType))

	return {
		entry: replaceExt(DEFAULT_ENTRY_NAMING),
		chunk: replaceExt(getDefaultChunkNaming(name)),
	}
}

export function getResolvedEnv(
	env: Env | undefined,
): Exclude<Env, Record<string, string>> | undefined {
	return typeof env === 'string' ? env : undefined
}
