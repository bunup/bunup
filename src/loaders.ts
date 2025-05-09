import path from 'node:path'
import { loadConfig } from 'coffi'
import type { LoadedConfig } from './cli'
import type { BuildOptions } from './options'
import type { Arrayable, DefineWorkspaceItem } from './types'
import { addField } from './utils'

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

export async function loadPackageJson(cwd: string): Promise<{
	packageJson: Record<string, unknown> | null
	path: string | null
}> {
	const { config, filepath } = await loadConfig<Record<string, unknown>>({
		name: 'package',
		cwd,
		extensions: ['.json'],
	})

	return {
		packageJson: config,
		path: filepath,
	}
}

export type TsConfigData = {
	tsconfig: Record<string, unknown> | null
	path: string | null
}
