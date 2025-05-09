import pc from 'picocolors'
import { logger } from './logger'

class BunupError extends Error {
	constructor(message?: string) {
		super(message)
		this.name = 'BunupError'
	}
}

export class BunupBuildError extends BunupError {
	constructor(message: string) {
		super(message)
		this.name = 'BunupBuildError'
	}
}

export class BunupDTSBuildError extends BunupError {
	constructor(message: string) {
		super(message)
		this.name = 'BunupDTSBuildError'
	}
}

export class BunupCLIError extends BunupError {
	constructor(message: string) {
		super(message)
		this.name = 'BunupCLIError'
	}
}

export class BunupWatchError extends BunupError {
	constructor(message: string) {
		super(message)
		this.name = 'BunupWatchError'
	}
}

export const parseErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message
	}
	return String(error)
}

interface KnownErrorSolution {
	pattern: RegExp
	errorType: string
	logSolution: (errorMessage: string) => void
}

const KNOWN_ERRORS: KnownErrorSolution[] = [
	{
		pattern: /Could not resolve: "bun"/i,
		errorType: 'BUILD ERROR',
		logSolution: () => {
			logger.error(
				pc.white("You're trying to build a project that uses Bun. ") +
					pc.white('Please set the target option to ') +
					pc.cyan('`bun`') +
					pc.white('.\n') +
					pc.white('Example: ') +
					pc.green('`bunup --target bun`') +
					pc.white(' or in config: ') +
					pc.green("{ target: 'bun' }"),
			)
		},
	},
]

export const handleError = (error: unknown, context?: string): void => {
	const errorMessage = parseErrorMessage(error)
	const contextPrefix = context ? `[${context}] ` : ''

	let errorType = ''
	if (error instanceof BunupBuildError) {
		errorType = 'BUILD ERROR'
	} else if (error instanceof BunupDTSBuildError) {
		errorType = 'DTS ERROR'
	} else if (error instanceof BunupCLIError) {
		errorType = 'CLI ERROR'
	} else if (error instanceof BunupWatchError) {
		errorType = 'WATCH ERROR'
	} else if (error instanceof BunupError) {
		errorType = 'BUNUP ERROR'
	}

	const knownError = KNOWN_ERRORS.find(
		(error) =>
			error.pattern.test(errorMessage) &&
			(error.errorType === errorType || !error.errorType),
	)

	if (!knownError && errorType) {
		console.error(`${pc.red(errorType)} ${contextPrefix}${errorMessage}`)
	}

	if (knownError) {
		console.log('\n')
		knownError.logSolution(errorMessage)
		console.log('\n')
	} else {
		console.error(
			pc.dim(
				pc.white(
					'If you think this is a bug, please open an issue at: ',
				) +
					pc.cyan(
						'https://github.com/arshad-yaseen/bunup/issues/new',
					),
			),
		)
	}
}

export const handleErrorAndExit = (error: unknown, context?: string): void => {
	handleError(error, context)
	process.exit(1)
}
