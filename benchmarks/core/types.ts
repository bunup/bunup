export type Bundler = {
	name: string
	buildFn: (options: any) => Promise<undefined | any>
	options: (dts: boolean) => any
}

export type BenchmarkResult = {
	name: string
	format: string
	dts: boolean
	averageTime: number
}
