import { promisify } from 'node:util'
import { brotliCompress } from 'node:zlib'
import pc from 'picocolors'
import { logger } from '../../logger'
import {
	ensureArray,
	formatFileSize,
	isJavascriptFile,
	isTypeScriptFile,
} from '../../utils'
import type { BunupPlugin } from '../types'

const brotliAsync = promisify(brotliCompress)

export interface ReportOptions {
	/**
	 * Enable gzip compression size calculation.
	 *
	 * Note: For huge output files, this may slow down the build process. In this case, consider disabling this option.
	 *
	 * @default true
	 */
	gzip?: boolean
	/**
	 * Enable brotli compression size calculation.
	 *
	 * Note: For huge output files, this may slow down the build process. In this case, consider disabling this option.
	 *
	 * @default false
	 */
	brotli?: boolean
	/**
	 * Maximum bundle size in bytes. Will warn if exceeded.
	 *
	 * @default undefined
	 */
	maxBundleSize?: number
}

/**
 * A plugin that logs a report of the bundle size.
 */
export function report(options: ReportOptions = {}): BunupPlugin {
	const { gzip = true, brotli = false, maxBundleSize } = options

	return {
		name: 'report',
		hooks: {
			onBuildDone: async ({ options, output }) => {
				if (options.watch || logger.isSilent()) return

				const showCompression = gzip || brotli
				const files = await Promise.all(
					output.files.map(async (file) => {
						const name = `${pc.dim(`${options.outDir}/`)}${
							file.dts && file.kind === 'entry-point'
								? pc.green(pc.bold(file.pathRelativeToOutdir))
								: file.pathRelativeToOutdir
						}`
						const plainName = `${options.outDir}/${file.pathRelativeToOutdir}`
						const size = Bun.file(file.fullPath).size

						let gzipSize: number | undefined
						let brotliSize: number | undefined

						if (showCompression) {
							const buffer = await Bun.file(file.fullPath).arrayBuffer()
							const uint8 = new Uint8Array(buffer)
							const [gzipResult, brotliResult] = await Promise.all([
								gzip
									? Promise.resolve(Bun.gzipSync(uint8))
									: Promise.resolve(null),
								brotli ? brotliAsync(uint8) : Promise.resolve(null),
							])

							gzipSize = gzipResult?.length
							brotliSize = brotliResult?.length
						}

						return {
							name,
							plainName,
							size,
							gzipSize,
							brotliSize,
							format: file.format,
							fullPath: file.fullPath,
						}
					}),
				)

				const totalFiles = files.length
				const totalSize = files.reduce((sum, file) => sum + file.size, 0)
				const maxNameLength = Math.max(
					...files.map((file) => file.plainName.length),
				)
				const formats = ensureArray(options.format)
				const showFormatLabel = formats.length > 1
				const formatPaddingRight = Math.max(...formats.map((f) => f.length))
				const maxSizeLength = Math.max(
					...files.map((file) => formatFileSize(file.size).length),
				)

				logger.space()

				if (options.name) {
					logger.log(pc.bgBlueBright(` ${options.name} `))
					logger.space()
				}

				for (const file of files) {
					const padding = ' '.repeat(maxNameLength - file.plainName.length + 2)
					const sizeString = formatFileSize(file.size)
					const sizePadding = ' '.repeat(maxSizeLength - sizeString.length)

					const gzipInfo = file.gzipSize
						? `gzip: ${formatFileSize(file.gzipSize)}`
						: ''
					const brotliInfo = file.brotliSize
						? `brotli: ${formatFileSize(file.brotliSize)}`
						: ''
					const compressionSeparator = gzipInfo && brotliInfo ? ' | ' : ''
					const compressionInfo =
						gzipInfo || brotliInfo
							? ` | ${gzipInfo}${compressionSeparator}${brotliInfo}`
							: ''

					const formatLabel = file.format.toUpperCase()
					const formatColor =
						file.format === 'esm'
							? pc.blueBright
							: file.format === 'cjs'
								? pc.blue
								: pc.magentaBright

					const formatInfo = showFormatLabel
						? isTypeScriptFile(file.fullPath) || isJavascriptFile(file.fullPath)
							? `${formatColor(formatLabel)}${' '.repeat(formatPaddingRight - formatLabel.length)} `
							: ' '.repeat(formatPaddingRight + 1)
						: ''

					logger.success(
						`${formatInfo}${file.name}${padding}${pc.dim(`${sizeString}${sizePadding}${compressionInfo}`)}`,
					)
				}

				const summaryPadding = ' '.repeat(
					maxNameLength + 4 + (showFormatLabel ? formatPaddingRight + 1 : 0),
				)

				logger.log(
					`${summaryPadding}${totalFiles} files${pc.dim(', total size:')} ${formatFileSize(totalSize)}`,
				)

				if (maxBundleSize && totalSize > maxBundleSize) {
					logger.space()
					logger.warn(
						`${options.name ? `${options.name}: ` : ''}Bundle size ${formatFileSize(totalSize)} exceeds the provided limit ${formatFileSize(maxBundleSize)}`,
					)
				}
			},
		},
	}
}
