/**
 * Options for generating declaration file
 */
export type GenerateDtsOptions = {
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
