import type { GenerateDtsOptions } from '@bunup/dts'
import type { BuildConfig, BunPlugin } from 'bun'
import { ensureBunVersion } from './ensure-bun-version'
import { cssTypedModulesPlugin } from './plugins/css-typed-modules'
import { type ExportsOptions, exports } from './plugins/exports'
import { type InjectStylesOptions, injectStyles } from './plugins/inject-styles'
import { externalOptionPlugin } from './plugins/internal/external-option'
import { useClient } from './plugins/internal/use-client'
import { shims } from './plugins/shims'
import type { BunupPlugin } from './plugins/types'
import { type UnusedOptions, unused } from './plugins/unused'
import type { MaybePromise, WithRequired } from './types'
import { ensureObject } from './utils/common'

export type Loader =
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

export type External = (string | RegExp)[]

type Env = 'inline' | 'disable' | `${string}*` | Record<string, string>

type CSSOptions = {
	/**
	 * Generate TypeScript definitions for CSS modules.
	 *
	 * @see https://bunup.dev/docs/guide/css#css-modules-and-typescript
	 */
	typedModules?: boolean
	/**
	 * Inject CSS styles into the document head at runtime instead of bundling them to the build output.
	 *
	 * When `true`, enables CSS injection with default settings.
	 * When an object is provided, allows customization of the injection behavior.
	 *
	 * @see https://bunup.dev/docs/extra-options/inject-styles
	 */
	inject?: boolean | InjectStylesOptions
}

export type OnSuccess =
	| ((options: Partial<BuildOptions>) => MaybePromise<void> | (() => void))
	| string
	| {
			/**
			 * The shell command to execute after a successful build
			 */
			cmd: string
			/**
			 * Additional options for the command execution
			 */
			options?: {
				/**
				 * Working directory for the command
				 */
				cwd?: string
				/**
				 * Environment variables to pass to the command
				 * @default process.env
				 */
				env?: Record<string, string | undefined>
				/**
				 * Maximum time in milliseconds the command is allowed to run
				 */
				timeout?: number
				/**
				 * Signal to use when killing the process
				 * @default 'SIGTERM'
				 */
				killSignal?: NodeJS.Signals | number
			}
	  }

type ReportOptions = {
	/**
	 * Enable gzip compression size calculation.
	 *
	 * Note: For huge output files, this may slow down the build process. In this case, consider disabling this option.
	 *
	 * @default true
	 */
	gzip?: boolean
	/**
	 * Enable brotli compression size calculation.
	 *
	 * Note: For huge output files, this may slow down the build process. In this case, consider disabling this option.
	 *
	 * @default false
	 */
	brotli?: boolean
	/**
	 * Maximum bundle size in bytes. Will warn if exceeded.
	 *
	 * @default undefined
	 */
	maxBundleSize?: number
}

type JSXOptions = {
	/**
	 * JSX runtime mode
	 * @default "automatic"
	 */
	runtime?: 'automatic' | 'classic'
	/**
	 * Import source for JSX functions
	 * @default "react"
	 * @example "preact"
	 */
	importSource?: string
	/**
	 * JSX factory function name
	 * @default "React.createElement"
	 * @example "h"
	 */
	factory?: string
	/**
	 * JSX fragment function name
	 * @default "React.Fragment"
	 * @example "Fragment"
	 */
	fragment?: string
	/**
	 * Whether JSX functions have side effects
	 * @default false
	 */
	sideEffects?: boolean
	/**
	 * Use jsx-dev runtime for development
	 * @default false
	 */
	development?: boolean
}

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
	 * @see https://bunup.dev/docs/guide/options#entry-points
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
	 * Defaults to 'esm' if not specified
	 */
	format: Format | Format[]

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
	 * package.json `exports` conditions used when resolving imports
	 *
	 * Equivalent to `--conditions` in `bun build` or `bun run`.
	 *
	 * https://nodejs.org/api/packages.html#exports
	 */
	conditions?: string | string[]

	/**
	 * Whether to generate TypeScript declaration files (.d.ts)
	 * When set to true, generates declaration files for all entry points
	 * Can also be configured with GenerateDtsOptions for more control
	 */
	dts?:
		| boolean
		| (Pick<
				GenerateDtsOptions,
				'resolve' | 'splitting' | 'minify' | 'inferTypes' | 'tsgo'
		  > & {
				entry?: string | string[]
		  })

	/**
	 * Path to a custom tsconfig.json file used for path resolution during
	 * both bundling and TypeScript declaration generation.
	 *
	 * If not specified, the nearest tsconfig.json will be used.
	 *
	 * @example
	 * preferredTsconfig: './tsconfig.build.json'
	 */
	preferredTsconfig?: string

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
	 * @see https://bun.com/docs/bundler#sourcemap
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
	 * @see https://bun.com/docs/bundler#define
	 *
	 * @example
	 * define: {
	 *   'process.env.NODE_ENV': '"production"',
	 *   'PACKAGE_VERSION': '"1.0.0"'
	 * }
	 */
	define?: Define
	/**
	 * A callback or command to run after a successful build.
	 *
	 * If a function is provided, it can optionally return a cleanup function
	 * that will be called when the operation is cancelled.
	 *
	 * @example
	 * onSuccess: (options) => {
	 *   const server = startServer();
	 *   return () => server.close();
	 * }
	 *
	 * @example
	 * onSuccess: "echo Build completed!"
	 *
	 * @example
	 * onSuccess: {
	 *   cmd: "bun run dist/server.js",
	 *   options: { env: { ...process.env, FOO: "bar" } }
	 * }
	 */
	onSuccess?: OnSuccess
	/**
	 * A banner to be added to the final bundle, this can be a directive like "use client" for react or a comment block such as a license for the code.
	 *
	 * @see https://bun.com/docs/bundler#banner
	 *
	 * @example
	 * banner: '"use client";'
	 */
	banner?: string
	/**
	 * A footer to be added to the final bundle, this can be something like a comment block for a license or just a fun easter egg.
	 *
	 * @see https://bun.com/docs/bundler#footer
	 *
	 * @example
	 * footer: '// built with love in SF'
	 */
	footer?: string
	/**
	 * Remove function calls from a bundle. For example, `drop: ["console"]` will remove all calls to `console.log`. Arguments to calls will also be removed, regardless of if those arguments may have side effects. Dropping `debugger` will remove all `debugger` statements.
	 *
	 * @see https://bun.com/docs/bundler#drop
	 *
	 * @example
	 * drop: ["console", "debugger", "anyIdentifier.or.propertyAccess"]
	 */
	drop?: string[]
	/**
	 * A map of file extensions to [built-in loader names](https://bun.com/docs/bundler/loaders#built-in-loaders). This can be used to quickly customize how certain files are loaded.
	 *
	 * @see https://bun.com/docs/bundler#loader
	 *
	 * @example
	 * loader: {
	 *   ".png": "dataurl",
	 *   ".txt": "file",
	 * }
	 */
	loader?: { [k in string]: Loader }
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
	 * @see https://bunup.dev/docs/guide/options#public-path for more information
	 *
	 * @example
	 * publicPath: 'https://cdn.example.com/'
	 */
	publicPath?: string
	/**
	 * The root directory for the project.
	 *
	 * It is computed to be the first common ancestor of all entrypoint files.
	 *
	 * @see https://bun.com/docs/bundler#root
	 *
	 * @example
	 * root: './src'
	 */
	root?: string

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
	 * @see https://bun.com/docs/bundler#env to learn more about inline, disable, prefix, and object modes
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
	 * 	myBunPlugin(),
	 *   {
	 *     name: "my-bunup-plugin",
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
	plugins?: (BunupPlugin | BunPlugin)[]
	/**
	 * Configure JSX transform behavior. Allows fine-grained control over how JSX is compiled.
	 */
	jsx?: JSXOptions
	/**
	 * Options for CSS handling in the build process.
	 */
	css?: CSSOptions

	/**
	 * Whether to enable shims for Node.js globals and ESM/CJS interoperability.
	 *
	 * @default false
	 */
	shims?: boolean
	/**
	 * Configuration for the build report that shows file sizes and compression stats.
	 */
	report?: ReportOptions
	/**
	 * Automatically generate the exports field in package.json based on build outputs.
	 *
	 * When `true`, enables automatic exports generation with default settings.
	 * When an object is provided, allows customization of export generation behavior,
	 * including custom exports, exclusions, and package.json inclusion options.
	 *
	 * @see https://bunup.dev/docs/extra-options/exports
	 */
	exports?: boolean | ExportsOptions
	/**
	 * Detect and report dependencies that are unused or incorrectly categorized.
	 * This includes dependencies not used in your build output, as well as dependencies
	 * that don't need to be packed with your library.
	 *
	 * @see https://bunup.dev/docs/extra-options/unused
	 */
	unused?: boolean | UnusedOptions
}

// It's safe to provide multiple entry points as default since we use Bun.glob, so it only returns the available files. No errors will be thrown if the entries are not found or can't be resolved. For these entries, users don't need to provide the entry.
export const DEFAULT_ENTYPOINTS: string[] = [
	'index.ts',
	'index.tsx',
	'src/index.ts',
	'src/index.tsx',
	'cli.ts',
	'src/cli.ts',
	'src/cli/index.ts',
]

const DEFAULT_OPTIONS: WithRequired<BuildOptions, 'clean'> = {
	entry: DEFAULT_ENTYPOINTS,
	format: 'esm',
	outDir: 'dist',
	target: 'node',
	dts: true,
	clean: true,
}

export function resolveBuildOptions(
	userOptions: Partial<BuildOptions>,
): BuildOptions {
	const options = {
		...DEFAULT_OPTIONS,
		...userOptions,
	}

	if (options.jsx) {
		ensureBunVersion('1.2.23', 'jsx option')
	}

	return options
}

export function resolvePlugins(
	options: BuildOptions,
	packageJsonData: Record<string, unknown> | null,
): (BunPlugin | BunupPlugin)[] {
	const plugins: (BunPlugin | BunupPlugin)[] = []
	// user provided plugins
	if (options.plugins) {
		plugins.push(...options.plugins)
	}

	// plugins based on user provided options
	if (options.css?.typedModules !== false) {
		plugins.push(cssTypedModulesPlugin())
	}

	if (options.css?.inject) {
		plugins.push(injectStyles(ensureObject(options.css.inject)))
	}

	if (options.shims) {
		plugins.push(shims())
	}

	if (options.exports) {
		plugins.push(exports(ensureObject(options.exports)))
	}

	if (options.unused) {
		plugins.push(unused(ensureObject(options.unused)))
	}

	// always enabled plugins
	plugins.push(useClient())
	plugins.push(externalOptionPlugin(options, packageJsonData))

	return plugins
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

// Bun defaults target to browser; default to node if not specified, as node is standard for library builds.
export function getResolvedTarget(
	target: Target | undefined,
): BuildConfig['target'] {
	return target ?? 'node'
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

export function getDefaultChunkNaming(name: string | undefined) {
	return `shared/${name ?? 'chunk'}-[hash].[ext]`
}

// If splitting is undefined, it will be true if the format is esm
export function getResolvedSplitting(
	splitting: boolean | undefined,
	format: Format,
): boolean {
	return splitting === undefined ? format === 'esm' : splitting
}

export function getResolvedDtsSplitting(
	_buildSplitting: boolean | undefined,
	dtsSplitting: boolean | undefined,
): boolean {
	// TODO: Enable splitting by default when build splitting is enabled once Bun fixes the issue with splitting
	// Track upstream issue: https://github.com/oven-sh/bun/issues/5344
	return !!dtsSplitting
}

export function getResolvedEnv(
	env: Env | undefined,
): Exclude<Env, Record<string, string>> | undefined {
	return typeof env === 'string' ? env : undefined
}
