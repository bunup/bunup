import pc from 'picocolors'
import { type TableColumn, logTable } from '../../logger'
import { formatFileSize } from '../../utils'
import type { BunupPlugin } from '../types'

type ReportPluginOptions = {
	/**
	 * The maximum bundle size in bytes.
	 * If the bundle size exceeds this limit, a error will be logged without failing the build.
	 */
	maxBundleSize?: number
	/**
	 * Whether to show gzip sizes in the report.
	 * When enabled, the report will include an additional column with the gzip size of each file.
	 * @default true
	 */
	gzip?: boolean
}

/**
 * A plugin that logs a report of the bundle size.
 * @param options - The options for the report plugin.
 */
export function report(options: ReportPluginOptions = {}): BunupPlugin {
	const { maxBundleSize, gzip = true } = options

	return {
		type: 'bunup',
		name: 'report',
		hooks: {
			onBuildDone: async ({ options, output }) => {
				if (options.watch) return

				const files = await Promise.all(
					output.files.map(async (file) => {
						const name = file.relativePathToOutputDir
						const size = Bun.file(file.fullPath).size
						let gzipSize: number | undefined
						let formattedGzipSize: string | undefined

						if (gzip) {
							const content = await Bun.file(file.fullPath).text()
							gzipSize = Bun.gzipSync(content).length
							formattedGzipSize = formatFileSize(gzipSize)
						}

						return {
							name,
							size,
							formattedSize: formatFileSize(size),
							gzipSize,
							formattedGzipSize,
						}
					}),
				)

				const totalSize = files.reduce(
					(sum, file) => sum + file.size,
					0,
				)
				const formattedTotalSize = formatFileSize(totalSize)

				let totalGzipSize: number | undefined
				let formattedTotalGzipSize: string | undefined

				if (gzip) {
					totalGzipSize = files.reduce(
						(sum, file) => sum + (file.gzipSize || 0),
						0,
					)
					formattedTotalGzipSize = formatFileSize(totalGzipSize)
				}

				const columns: TableColumn[] = [
					{ header: 'File', align: 'left', color: pc.blue },
					{ header: 'Size', align: 'right', color: pc.green },
				]

				if (gzip) {
					columns.push({
						header: 'Gzip',
						align: 'right',
						color: pc.magenta,
					})
				}

				const data = files.map((file) => {
					const row: Record<string, string> = {
						File: file.name,
						Size: file.formattedSize,
					}

					if (gzip && file.formattedGzipSize) {
						row.Gzip = file.formattedGzipSize
					}

					return row
				})

				const footer: Record<string, string> = {
					File: 'Total',
					Size: formattedTotalSize,
				}

				if (gzip && formattedTotalGzipSize) {
					footer.Gzip = formattedTotalGzipSize
				}

				console.log('')
				logTable(columns, data, footer)
				if (maxBundleSize && totalSize > maxBundleSize) {
					console.log('')
					console.log(
						pc.red(
							`Your bundle size of ${formattedTotalSize} exceeds the configured limit of ${formatFileSize(
								maxBundleSize,
							)}`,
						),
					)
				}
				console.log('')
			},
		},
	}
}
