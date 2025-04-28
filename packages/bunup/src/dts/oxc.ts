import { type OxcError, isolatedDeclaration } from 'oxc-transform'
import pc from 'picocolors'
import { BunupIsolatedDeclError, parseErrorMessage } from '../errors'
import { logger } from '../logger'
import { logIsolatedDeclarationError } from './log-error'

const allErrors: {
	error: OxcError
	sourceText: string
	tsFile: string
}[] = []

export async function generateDtsContent(
	tsFile: string,
): Promise<string | null> {
	try {
		const sourceText = await Bun.file(tsFile).text()

		const { code: declaration, errors } = isolatedDeclaration(
			tsFile,
			sourceText,
		)

		for (const error of errors) {
			allErrors.push({
				error,
				sourceText,
				tsFile,
			})
		}

		return declaration
	} catch (error) {
		logger.warn(
			`Failed to generate declaration for ${tsFile}: ${parseErrorMessage(error)}`,
		)
		return null
	}
}

export function runPostDtsValidation(isWatching: boolean): void {
	let hasErrors = false

	for (const { error, sourceText, tsFile } of allErrors) {
		logIsolatedDeclarationError(error, sourceText, tsFile, isWatching)

		hasErrors = true
	}

	if (hasErrors && !isWatching) {
		console.log(
			`${pc.bgMagentaBright('Pro tip:')} Enable "isolatedDeclarations" in your ${pc.underline('tsconfig.json')} to get these errors early in your editor`,
		)
		console.log('\n')
		throw new BunupIsolatedDeclError()
	}
}
