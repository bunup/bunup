import path from 'node:path'
import { loadConfig } from 'coffi'
import type { BuildOptions } from './options'
import type { Arrayable, DefineConfigItem, DefineWorkspaceItem } from './types'

export type LoadedConfig = Arrayable<DefineConfigItem | DefineWorkspaceItem>

export type ProcessableConfig = {
	rootDir: string
	options: Arrayable<BuildOptions> | Arrayable<Partial<BuildOptions>>
}

export async function processLoadedConfigs(
	config: LoadedConfig,
	cwd: string,
	filter?: string[],
): Promise<ProcessableConfig[]> {
	return Array.isArray(config) && config[0] && 'root' in config[0]
		? (config as DefineWorkspaceItem[])
				.filter((c) => (filter ? filter.includes(c.name) : true))
				.map((c) => ({
					rootDir: path.resolve(cwd, c.root),
					options: setOrSuffixField(
						c.config ?? {},
						'name',
						c.name,
					) as unknown as Arrayable<BuildOptions>,
				}))
		: [
				{
					rootDir: cwd,
					options: filterConfigArrayByName(
						config as Arrayable<BuildOptions>,
						filter,
					),
				},
			]
}

function filterConfigArrayByName(
	config: Arrayable<BuildOptions>,
	filter: string[] | undefined,
) {
	if (Array.isArray(config) && filter) {
		return config.filter((c) => (c.name ? filter.includes(c.name) : true))
	}

	return config
}

function setOrSuffixField<T extends Record<string, unknown>, F extends string>(
	objectOrArray: T | T[],
	field: F,
	prefix: unknown,
): (T & { [key in F]: unknown }) | (T[] & { [key in F]: unknown }[]) {
	const addPrefix = (obj: T) => {
		const existingValue = obj[field]
		const newValue = existingValue ? `${prefix}-${existingValue}` : prefix
		return { ...obj, [field]: newValue }
	}

	return Array.isArray(objectOrArray)
		? objectOrArray.map(addPrefix)
		: addPrefix(objectOrArray)
}

export type PackageJson = {
	/** The parsed content of the package.json file */
	data: Record<string, any> | null
	/** The path to the package.json file */
	path: string | null
}

export async function loadPackageJson(
	cwd: string = process.cwd(),
): Promise<PackageJson> {
	const { config, filepath } = await loadConfig<Record<string, any>>({
		name: 'package',
		cwd,
		extensions: ['.json'],
	})

	return {
		data: config,
		path: filepath,
	}
}
