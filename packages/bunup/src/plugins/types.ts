import type { PackageJson } from '../loaders'
import type { BuildOptions, Format } from '../options'
import type { MaybePromise } from '../types'

/**
 * Represents the meta data of the build
 */
export type BuildMeta = {
	/** The package.json file */
	packageJson: PackageJson
	/** The root directory of the build */
	rootDir: string
}

export type BuildOutputFile = {
	/**
	 * The entry point for which this file was generated
	 *
	 * Undefined for non-entry point files (e.g., assets, sourcemaps, chunks)
	 */
	entrypoint: string | undefined
	/** The kind of the file */
	kind: 'entry-point' | 'chunk' | 'asset' | 'sourcemap' | 'bytecode'
	/** Absolute path to the generated file */
	fullPath: string
	/** Path to the generated file relative to the root directory */
	pathRelativeToRootDir: string
	/** Path to the generated file relative to the output directory */
	pathRelativeToOutdir: string
	/** Whether the file is a dts file */
	dts: boolean
	/** The format of the output file */
	format: Format
}

/**
 * Represents the output of a build operation
 */
export type BuildOutput = {
	/** Array of generated files with their paths and contents */
	files: BuildOutputFile[]
}

/**
 * Context provided to build hooks
 */
export type BuildContext = {
	/** The build options that were used */
	options: BuildOptions
	/** The output of the build */
	output: BuildOutput
	/** The meta data of the build */
	meta: BuildMeta
}

/**
 * Hooks that can be implemented by Bunup plugins
 */
type BunupPluginHooks = {
	/**
	 * Called when a build is successfully completed
	 * @param ctx Build context containing options and output
	 */
	onBuildDone?: (ctx: BuildContext) => MaybePromise<void>

	/**
	 * Called before a build starts
	 * @param options Build options that will be used
	 */
	onBuildStart?: (options: BuildOptions) => MaybePromise<void>
}

/**
 * Represents a Bunup-specific plugin
 */
export type BunupPlugin = {
	/** Identifies this as a Bunup-specific plugin */
	type: 'bunup'
	/** Optional name for the plugin */
	name?: string
	/** The hooks implemented by this plugin */
	hooks: BunupPluginHooks
}
