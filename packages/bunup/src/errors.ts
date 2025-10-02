import pc from 'picocolors'
import { link, logger } from './printer/logger'

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

export class BunupPluginError extends BunupError {
	constructor(message: string) {
		super(message)
		this.name = 'BunupPluginError'
	}
}

export const parseErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message
	}
	return String(error)
}

export const noDefaultEntryPointsError = (
	defaultEntrypoints: string[],
): string => {
	return (
		`${pc.red(pc.bold('\nNo entry points found'))}\n\n` +
		`Looked for these default entry points:\n\n` +
		logger.list(defaultEntrypoints, { dim: true }) +
		`\n\nYou can specify entry points via CLI like ${pc.green('bunup lib/main.ts')}, ` +
		`use multiple entries like ${pc.green('bunup components/button.tsx utils/format.ts')}, or add the entry option in your bunup config.`
	)
}

export const invalidEntryPointsError = (userEntrypoints: string[]): string => {
	const entryPointsFormatted = logger.list(userEntrypoints, { dim: true })
	const isMultiple = userEntrypoints.length > 1

	return `${pc.red(pc.bold(`\nEntry ${isMultiple ? 'points do not exist' : 'point does not exist'}`))}

${entryPointsFormatted}

Please check that ${isMultiple ? 'these paths exist and point' : 'this path exists and points'} to ${isMultiple ? 'valid files' : 'a valid file'}.`
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
			logger.log(
				"You're trying to build a project that uses Bun. " +
					'Please set the target option to ' +
					pc.cyan('`bun`') +
					'.\n' +
					'Example: ' +
					pc.green('`bunup --target bun`') +
					' or in config: ' +
					pc.green("{ target: 'bun' }"),
			)
		},
	},
	{
		pattern: /has already been exported. Exported identifiers must be unique./i,
		errorType: 'DTS ERROR',
		logSolution: () => {
			logger.log(
				'An error occurred while bundling dts files. This issue occurs when dts splitting is enabled due to a bug in the Bun bundler. Please ping the GitHub issue to help get it fixed faster: ' +
					link('https://github.com/oven-sh/bun/issues/5344') +
					'. To fix this issue for now, you can disable dts splitting by removing ' +
					pc.dim('dts: { splitting: true }') +
					' from your config.' +
					' You can re-enable it once the issue is fixed.',
			)
		},
	},
]

export const handleError = (error: unknown, context?: string): void => {
	const errorMessage = parseErrorMessage(error)
	const contextPrefix = context ? `[${context}] ` : ''

	let errorType = 'UNKNOWN ERROR'
	if (error instanceof BunupBuildError) {
		errorType = 'BUILD ERROR'
	} else if (error instanceof BunupDTSBuildError) {
		errorType = 'DTS ERROR'
	} else if (error instanceof BunupCLIError) {
		errorType = 'CLI ERROR'
	} else if (error instanceof BunupWatchError) {
		errorType = 'WATCH ERROR'
	} else if (error instanceof BunupPluginError) {
		errorType = 'PLUGIN ERROR'
	} else if (error instanceof BunupError) {
		errorType = 'BUNUP ERROR'
	}

	const knownError = KNOWN_ERRORS.find(
		(error) =>
			error.pattern.test(errorMessage) &&
			(error.errorType === errorType || !error.errorType),
	)

	if (!knownError) {
		console.error(
			`\n${pc.bgRed(` ${errorType} `)}\n${contextPrefix}${errorMessage}`
				.split('\n')
				.map((line) => `  ${line}`)
				.join('\n'),
		)
	}

	if (knownError) {
		console.log('\n')
		knownError.logSolution(errorMessage)
		console.log('\n')
	} else {
		const issueUrl = new URL('https://github.com/bunup/bunup/issues/new')
		issueUrl.searchParams.set('title', `[${errorType}] Error encountered`)
		issueUrl.searchParams.set(
			'body',
			`## Error Details\n\n**Error Type:** ${errorType}\n**Error Message:** ${errorMessage}\n\n## Additional Context\n\n<!-- Please provide any additional context about what you were trying to do when the error occurred -->`,
		)

		console.error(
			pc.white('\n  If you think this is a bug, please ') +
				link(issueUrl.toString(), 'open an issue') +
				' with details about this error\n',
		)
	}
}

export const handleErrorAndExit = (error: unknown, context?: string): void => {
	handleError(error, context)
	process.exit(1)
}
