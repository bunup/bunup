import type { IsolatedDeclarationError } from './isolated-decl-logger'

export type Naming =
	| string
	| {
			chunk: string
	  }

export type Resolve = boolean | (string | RegExp)[]

/**
 * Options for generating declaration file
 */
export type GenerateDtsOptions = {
	naming?: Naming
	/**
	 * Path to the preferred tsconfig.json file
	 * By default, the closest tsconfig.json file will be used
	 */
	preferredTsConfigPath?: string
	/**
	 * Controls which external modules should be resolved
	 * - `true` to resolve all external modules
	 * - Array of strings or RegExp to match specific modules
	 * - `false` or `undefined` to disable external resolution
	 */
	resolve?: Resolve
	/**
	 * The directory where the plugin will look for the `tsconfig.json` file and `node_modules`
	 * By default, the current working directory will be used
	 */
	cwd?: string
	/**
	 * Whether to split declaration files when multiple entrypoints import the same files,
	 * modules, or share types. When enabled, shared types will be extracted to separate
	 * .d.ts files, and other declaration files will import these shared files.
	 *
	 * This helps reduce bundle size by preventing duplication of type definitions
	 * across multiple entrypoints.
	 */
	splitting?: boolean
	/**
	 * Whether to minify the generated declaration files to reduce the size of the declaration file.
	 */
	minify?: boolean
}

export type GenerateDtsResultFile = {
	/**
	 * The kind of declaration file.
	 * - 'entry-point': The declaration file for an entry point
	 * - 'chunk': A declaration file created when code splitting is enabled
	 */
	kind: 'entry-point' | 'chunk'
	/**
	 * The entry point that was used to generate the declaration file.
	 *
	 * This will only be available if the kind is 'entry-point' and not for chunk declaration files.
	 */
	entrypoint: string | undefined
	/**
	 * If the kind is 'chunk', this is the name of the chunk file.
	 */
	chunkFileName: string | undefined
	/**
	 * The output path of the declaration file relative to the output directory.
	 * This is the directory where you want to save the declaration file.
	 * When saving the declaration file, you should use this path to save it
	 * in the output directory you decide.
	 *
	 * This is particularly useful when splitting is enabled, as some declaration
	 * files import chunk files. Saving to this path ensures the import paths
	 * are correct.
	 *
	 * This is the recommended approach when saving declaration files to the
	 * output directory.
	 *
	 * @example
	 * await Bun.write(`dist/${result.outputPath}`, result.dts)
	 */
	outputPath: string
	/**
	 * The parsed parts of the output path, containing the file name and extension
	 * This is useful when you need to manipulate the file name or extension separately
	 */
	pathInfo: {
		/** The output path relative to the output directory without the extension */
		outputPathWithoutExtension: string
		/** The file extension including the dot (e.g. '.d.ts') */
		ext: string
	}
	/**
	 * The generated declaration file
	 */
	dts: string
}

/**
 * Result of the generateDts function
 */
export type GenerateDtsResult = {
	/**
	 * The generated declaration files with their relevant information
	 */
	files: GenerateDtsResultFile[]
	/**
	 * The errors that occurred during the generation
	 */
	errors: IsolatedDeclarationError[]
}
