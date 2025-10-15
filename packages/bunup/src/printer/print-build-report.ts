import { promisify } from 'node:util'
import { brotliCompress } from 'node:zlib'
import pc from 'picocolors'
import type { BuildOutput } from '../plugins/types'
import { ensureArray } from '../utils/common'
import { isJavascriptFile, isTypeScriptFile } from '../utils/file'
import { formatFileSize } from '../utils/format'

const brotliAsync = promisify(brotliCompress)

export async function printBuildReport(
	buildOutput: BuildOutput,
): Promise<void> {
	const options = buildOutput.options
	const { gzip = true, brotli = false, maxBundleSize } = options.report ?? {}

	const showCompression = gzip || brotli

	const files = await Promise.all(
		buildOutput.files.map(async (file) => {
			const pathRelative = file.pathRelativeToOutdir
			const size = file.size
			const isDts = file.dts && file.kind === 'entry-point'

			const isJs =
				isTypeScriptFile(file.fullPath) || isJavascriptFile(file.fullPath)
			let gzipSize: number | undefined
			let brotliSize: number | undefined

			if (showCompression) {
				const bunFile = Bun.file(file.fullPath)
				const uint8 = new Uint8Array(await bunFile.arrayBuffer())
				const [gzipResult, brotliResult] = await Promise.all([
					gzip ? Promise.resolve(Bun.gzipSync(uint8)) : Promise.resolve(null),
					brotli ? brotliAsync(uint8) : Promise.resolve(null),
				])
				gzipSize = gzipResult?.length
				brotliSize = brotliResult?.length
			}

			return {
				path: pathRelative,
				fullPath: `${options.outDir}/${pathRelative}`,
				size,
				gzipSize,
				brotliSize,
				format: file.format,
				isDts,
				isJs,
			}
		}),
	)

	const totalSize = files.reduce((sum, file) => sum + file.size, 0)
	const totalGzipSize = files.reduce(
		(sum, file) => sum + (file.gzipSize || 0),
		0,
	)

	const totalBrotliSize = files.reduce(
		(sum, file) => sum + (file.brotliSize || 0),
		0,
	)

	const formats = ensureArray(options.format)
	const showFormat = formats.length > 1 || formats[0] === 'cjs'
	const formatLabelWidth = showFormat
		? Math.max(...formats.map((f) => `[${f}] `.length))
		: 0

	const pathWidth = Math.max(
		...files.map((f) => f.fullPath.length),
		'Output'.length,
	)

	const sizeWidth = Math.max(formatFileSize(totalSize).length, 'Raw'.length)

	const gzipWidth = gzip
		? Math.max(formatFileSize(totalGzipSize).length, 'Gzip'.length)
		: 0
	const brotliWidth = brotli
		? Math.max(formatFileSize(totalBrotliSize).length, 'Brotli'.length)
		: 0

	const pad = (
		str: string,
		width: number,
		align: 'left' | 'right' = 'left',
	) => {
		const diff = width - str.length
		return align === 'left'
			? str + ' '.repeat(Math.max(0, diff))
			: ' '.repeat(Math.max(0, diff)) + str
	}

	console.log('')

	if (options.name) {
		console.log('')
		console.log(`  ${pc.bgBlueBright(` ${options.name} `)}`)
	}

	console.log('')

	const headers = [
		pad('  Output', pathWidth + formatLabelWidth + 2),
		pad('Raw', sizeWidth, 'right'),
	]

	if (gzip) headers.push(pad('Gzip', gzipWidth, 'right'))
	if (brotli) headers.push(pad('Brotli', brotliWidth, 'right'))

	console.log(pc.dim(headers.join('    ')))
	console.log('')

	for (const file of files) {
		let formatLabel = ''

		if (showFormat) {
			let plainFormatLabel = ''
			if (file.isJs) {
				plainFormatLabel = `[${file.format}] `
			}
			formatLabel = pc.dim(pad(plainFormatLabel, formatLabelWidth))
		}

		const outDirWithSlash = `${options.outDir}/`
		const fileName = file.isDts ? pc.green(pc.bold(file.path)) : file.path
		const styledPath = `${pc.dim(outDirWithSlash)}${fileName}`
		const plainPath = `${outDirWithSlash}${file.path}`
		const filePathColumn = `  ${formatLabel}${styledPath}${' '.repeat(Math.max(0, pathWidth - plainPath.length))}`
		const fileRow = [
			filePathColumn,
			pad(formatFileSize(file.size), sizeWidth, 'right'),
		]

		if (gzip) {
			const gzipStr = file.gzipSize
				? formatFileSize(file.gzipSize)
				: pc.dim('-')
			fileRow.push(pad(gzipStr, gzipWidth, 'right'))
		}

		if (brotli) {
			const brotliStr = file.brotliSize
				? formatFileSize(file.brotliSize)
				: pc.dim('-')
			fileRow.push(pad(brotliStr, brotliWidth, 'right'))
		}

		console.log(fileRow.join('    '))
	}

	console.log('')

	const summaryRow = [
		`  ${pc.bold(pad(`${files.length} files`, pathWidth + formatLabelWidth))}`,
		pc.bold(pad(formatFileSize(totalSize), sizeWidth, 'right')),
	]
	if (gzip && totalGzipSize > 0) {
		summaryRow.push(
			pc.bold(pad(formatFileSize(totalGzipSize), gzipWidth, 'right')),
		)
	} else if (gzip) {
		summaryRow.push(pad('', gzipWidth))
	}
	if (brotli && totalBrotliSize > 0) {
		summaryRow.push(
			pc.bold(pad(formatFileSize(totalBrotliSize), brotliWidth, 'right')),
		)
	} else if (brotli) {
		summaryRow.push(pad('', brotliWidth))
	}
	console.log(summaryRow.join('    '))
	if (maxBundleSize && totalSize > maxBundleSize) {
		console.log('')
		console.warn(
			pc.yellow(
				`  Bundle size ${pc.bold(formatFileSize(totalSize))} exceeds limit ${pc.bold(formatFileSize(maxBundleSize))}`,
			),
		)
	}
	console.log('')
}
