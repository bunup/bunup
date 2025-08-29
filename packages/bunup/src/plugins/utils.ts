import type { BunPlugin } from 'bun'
import pc from 'picocolors'
import { BunupPluginError } from '../errors'
import type { BuildOptions } from '../options'
import type { BuildMeta, BuildOutput, BunupPlugin } from './types'

export function filterBunPlugins(
	plugins: (BunPlugin | BunupPlugin)[] | undefined,
): BunPlugin[] {
	if (!plugins) return []
	return plugins.filter((p): p is BunPlugin => 'setup' in p)
}

export function filterBunupPlugins(
	plugins: (BunPlugin | BunupPlugin)[] | undefined,
): BunupPlugin[] {
	if (!plugins) return []
	return plugins.filter((p): p is BunupPlugin => 'hooks' in p)
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
	meta: BuildMeta,
): Promise<void> {
	if (!bunupPlugins) return

	for (const plugin of bunupPlugins) {
		if (plugin.hooks.onBuildDone) {
			await plugin.hooks.onBuildDone({ options, output, meta })
		}
	}
}

export async function getPackageForPlugin<T>(
	name: string,
	pluginName: string,
): Promise<T> {
	let pkg: T

	try {
		pkg = await import(name)
	} catch {
		throw new BunupPluginError(
			`[${pc.cyan(name)}] is required for the ${pluginName} plugin. Please install it with: ${pc.blue(`bun add ${name} --dev`)}`,
		)
	}

	return pkg
}
