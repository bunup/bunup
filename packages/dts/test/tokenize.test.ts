import { describe, expect, test } from 'bun:test'
import { createProject, runGenerateDts } from './utils'

describe('Tokenize', () => {
	test('should tokenize newlines and tabs properly', async () => {
		createProject({
			'src/index.ts': `
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
					 * - \`true\` to resolve all external modules
					 * - Array of strings or RegExp to match specific modules
					 * - \`false\` or \`undefined\` to disable external resolution
					 */
					resolve?: Resolve
					/**
					 * The directory where the plugin will look for the \`tsconfig.json\` file and \`node_modules\`
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
					minify?: boolean
}

			`,
		})

		const files = await runGenerateDts(['src/index.ts'])

		expect(files[0].dts).toMatchInlineSnapshot(`
		  "/**
		  * Options for generating declaration file
		  */
		  type GenerateDtsOptions = {
		  	naming?: Naming
		  	/**
		  	* Path to the preferred tsconfig.json file
		  	* By default, the closest tsconfig.json file will be used
		  	*/
		  	preferredTsConfigPath?: string
		  	/**
		  	* Controls which external modules should be resolved
		  	* - \`true\` to resolve all external modules
		  	* - Array of strings or RegExp to match specific modules
		  	* - \`false\` or \`undefined\` to disable external resolution
		  	*/
		  	resolve?: Resolve
		  	/**
		  	* The directory where the plugin will look for the \`tsconfig.json\` file and \`node_modules\`
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
		  	minify?: boolean
		  };
		  export { GenerateDtsOptions };
		  "
		`)
	})
})
