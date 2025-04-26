import type _Bun from 'bun'

import type { BuildOptions } from './options'

export type MaybePromise<T> = Promise<T> | T

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type WithRequired<T, K extends keyof T> = Omit<T, K> &
	Required<Pick<T, K>>

export type Arrayable<T> = T | T[]

type Bun = typeof _Bun
export type BunBuildOptions = Parameters<Bun['build']>[0]
export type BunPlugin = Exclude<BunBuildOptions['plugins'], undefined>[number]

export type DefineConfigItem = Omit<
	WithOptional<BuildOptions, 'outDir' | 'format'>,
	'watch'
>

export type DefineWorkspaceItem = {
	name: string
	root: string
	config: DefineConfigItem | DefineConfigItem[]
}
