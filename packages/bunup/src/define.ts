import type {
	DefineConfigItem,
	DefineWorkspaceItem,
	WithOptional,
	WithRequired,
} from './types'

export function defineConfig(
	options: DefineConfigItem | WithRequired<DefineConfigItem, 'name'>[],
): DefineConfigItem | WithRequired<DefineConfigItem, 'name'>[] {
	return options
}

export function defineWorkspace(
	options: WithOptional<DefineWorkspaceItem, 'config'>[],
	sharedOptions?: Partial<DefineConfigItem>,
): DefineWorkspaceItem[] {
	return options.map((item) => {
		const config =
			item.config && Array.isArray(item.config)
				? item.config.map((config) => ({
						...sharedOptions,
						...config,
					}))
				: item.config
					? { ...sharedOptions, ...item.config }
					: sharedOptions
		return { ...item, config }
	}) as DefineWorkspaceItem[]
}
