import type { OxcError } from 'oxc-transform'
import pc from 'picocolors'
import { logger } from '../logger'
import { getShortFilePath } from '../utils'

export function logIsolatedDeclarationError(
	error: OxcError,
	sourceText: string,
	tsFile: string,
	isWatching: boolean,
): void {
	const label = error.labels[0]
	const position = label
		? calculateDtsErrorLineAndColumn(sourceText, label.start)
		: ''

	const shortPath = getShortFilePath(tsFile)
	const errorMessage = `${shortPath}${position}: ${formatDtsErrorMessage(error.message)}`

	const codeFrame = getCodeFrame(sourceText, label?.start, label?.end)

	logger[isWatching ? 'warn' : 'error'](
		`${errorMessage}\n\n${pc.gray(codeFrame)}`,
		{
			verticalSpace: true,
		},
	)
}

function formatDtsErrorMessage(errorMessage: string): string {
	return errorMessage
		.replace(' with --isolatedDeclarations', '')
		.replace(' with --isolatedDeclaration', '')
}

function calculateDtsErrorLineAndColumn(
	sourceText: string,
	labelStart: number,
): string {
	if (labelStart === undefined) return ''

	const lines = sourceText.slice(0, labelStart).split('\n')
	const lineNumber = lines.length
	const columnStart = lines[lines.length - 1].length + 1

	return ` (${lineNumber}:${columnStart})`
}

function getCodeFrame(sourceText: string, start: number, end: number): string {
	const lines = sourceText.split('\n')
	const errorLine = sourceText.slice(0, start).split('\n').length
	const lineContent = lines[errorLine - 1]

	const startCol = start - sourceText.slice(0, start).lastIndexOf('\n') - 1
	const endCol = end
		? Math.min(
				end - sourceText.slice(0, start).lastIndexOf('\n') - 1,
				lineContent.length,
			)
		: startCol + 1

	const arrowLine =
		' '.repeat(startCol) +
		pc.red(pc.dim('⎯'.repeat(Math.max(1, endCol - startCol))))

	return `${lineContent}\n${arrowLine}`
}
