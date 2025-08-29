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
	return Array.isArray(config) && 'root' in config[0]
		? (config as DefineWorkspaceItem[])
				.filter((c) => (filter ? filter.includes(c.name) : true))
				.map((c) => ({
					rootDir: path.resolve(cwd, c.root),
					options: addField(
						c.config,
						'name',
						c.name,
					) as unknown as Arrayable<BuildOptions>,
				}))
		: [
				{
					rootDir: cwd,
					options: config as Arrayable<BuildOptions>,
				},
			]
}

function addField<T extends Record<string, unknown>, F extends string>(
	objectOrArray: T | T[],
	field: F,
	value: unknown,
): (T & { [key in F]: unknown }) | (T[] & { [key in F]: unknown }[]) {
	return Array.isArray(objectOrArray)
		? objectOrArray.map((o) => ({ ...o, [field]: value }))
		: { ...objectOrArray, [field]: value }
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
