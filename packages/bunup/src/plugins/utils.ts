import type { BunPlugin } from "bun";
import type { BunupPlugin, OnBuildDoneCtx, OnBuildStartCtx } from "./types";

export function filterBunPlugins(plugins: (BunPlugin | BunupPlugin)[] | undefined): BunPlugin[] {
	if (!plugins) return [];
	return plugins.filter((p): p is BunPlugin => "setup" in p);
}

export function filterBunupPlugins(
	plugins: (BunPlugin | BunupPlugin)[] | undefined,
): BunupPlugin[] {
	if (!plugins) return [];
	return plugins.filter((p): p is BunupPlugin => "hooks" in p);
}

export async function runPluginBuildStartHooks(
	bunupPlugins: BunupPlugin[] | undefined,
	ctx: OnBuildStartCtx,
): Promise<void> {
	if (!bunupPlugins) return;

	for (const plugin of bunupPlugins) {
		if (plugin.hooks.onBuildStart) {
			await plugin.hooks.onBuildStart(ctx);
		}
	}
}

export async function runPluginBuildDoneHooks(
	bunupPlugins: BunupPlugin[] | undefined,
	ctx: OnBuildDoneCtx,
): Promise<void> {
	if (!bunupPlugins) return;

	for (const plugin of bunupPlugins) {
		if (plugin.hooks.onBuildDone) {
			await plugin.hooks.onBuildDone(ctx);
		}
	}
}
