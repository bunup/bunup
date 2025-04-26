import type { BuildOptions } from '../options'
import type { BuildOutput, BunupBunPlugin, BunupPlugin, Plugin } from './types'

export function filterBunupBunPlugins(
	plugins: Plugin[] | undefined,
): BunupBunPlugin[] {
	if (!plugins) return []
	return plugins.filter((p): p is BunupBunPlugin => p.type === 'bun')
}

export function filterBunupPlugins(
	plugins: Plugin[] | undefined,
): BunupPlugin[] {
	if (!plugins) return []
	return plugins.filter((p): p is BunupPlugin => p.type === 'bunup')
}

export async function runPluginBuildStartHooks(
	bunupPlugins: BunupPlugin[] | undefined,
	options: BuildOptions,
): Promise<void> {
	if (!bunupPlugins) return

	for (const plugin of bunupPlugins) {
		if (plugin.hooks.onBuildStart) {
			await plugin.hooks.onBuildStart(options)
		}
	}
}

export async function runPluginBuildDoneHooks(
	bunupPlugins: BunupPlugin[] | undefined,
	options: BuildOptions,
	output: BuildOutput,
): Promise<void> {
	if (!bunupPlugins) return

	for (const plugin of bunupPlugins) {
		if (plugin.hooks.onBuildDone) {
			await plugin.hooks.onBuildDone({ options, output })
		}
	}
}
