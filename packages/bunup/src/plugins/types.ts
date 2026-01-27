import type { PackageJson } from "../loaders";
import type { BuildOptions, Format } from "../options";
import type { MaybePromise } from "../types";

/**
 * Represents the meta data of the build
 */
export type BuildMeta = {
	/** The package.json file */
	packageJson: PackageJson;
	/** The root directory of the build */
	rootDir: string;
};

export type BuildOutputFile = {
	/**
	 * The entry point for which this file was generated
	 *
	 * Undefined for non-entry point files (e.g., assets, sourcemaps, chunks)
	 */
	entrypoint: string | undefined;
	/** The kind of the file */
	kind: "entry-point" | "chunk" | "asset" | "sourcemap" | "bytecode" | "executable";
	/** Absolute path to the generated file */
	fullPath: string;
	/** Path to the generated file relative to the root directory */
	pathRelativeToRootDir: string;
	/** Path to the generated file relative to the output directory */
	pathRelativeToOutdir: string;
	/** Whether the file is a dts file */
	dts: boolean;
	/** The format of the output file */
	format: Format;
	/** The size of the file in bytes */
	size: number;
};

/**
 * Build configuration and metadata used during build execution.
 */
export type BuildContext = {
	/** Build configuration options that were used */
	options: BuildOptions;
	/** Build execution metadata */
	meta: BuildMeta;
};

/**
 * Build output containing generated files and build context.
 */
export type BuildResult = {
	/** Generated output files */
	files: BuildOutputFile[];
	/** Build configuration and metadata that were used */
	build: BuildContext;
};

/**
 * Context provided when build starts.
 */
export type OnBuildStartCtx = {
	/** Build configuration options that will be used */
	options: BuildOptions;
};

/**
 * Context provided when build completes.
 * Flattened structure for easy access in plugin hooks.
 */
export type OnBuildDoneCtx = {
	/** Generated output files */
	files: BuildOutputFile[];
	/** Build configuration options that were used */
	options: BuildOptions;
	/** Build execution metadata */
	meta: BuildMeta;
};

/**
 * Hooks that can be implemented by Bunup plugins.
 */
export type BunupPluginHooks = {
	/**
	 * Called when a build is successfully completed.
	 */
	onBuildDone?: (ctx: OnBuildDoneCtx) => MaybePromise<void>;

	/**
	 * Called before a build starts.
	 */
	onBuildStart?: (ctx: OnBuildStartCtx) => MaybePromise<void>;
};

/**
 * Represents a Bunup-specific plugin
 */
export type BunupPlugin = {
	/** Optional name for the plugin */
	name?: string;
	/** The hooks implemented by this plugin */
	hooks: BunupPluginHooks;
};
