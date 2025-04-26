import type { Arrayable, DefineConfigItem, DefineWorkspaceItem } from './types'

export function defineConfig(
	options: Arrayable<DefineConfigItem>,
): Arrayable<DefineConfigItem> {
	return options
}

export function defineWorkspace(
	options: DefineWorkspaceItem[],
): DefineWorkspaceItem[] {
	return options
}
