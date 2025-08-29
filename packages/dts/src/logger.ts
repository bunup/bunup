import pc from 'picocolors'
import { TyperollError } from './errors'

class Logger {
	private static instance: Logger
	private constructor() {}

	public static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger()
		}
		return Logger.instance
	}

	public info(message: string): void {
		console.log()
		console.info(pc.gray(message))
		console.log()
	}

	public warn(message: string): void {
		console.warn(pc.yellow(`WARNING: ${message}`))
	}

	public debug(message: string): void {
		console.debug(pc.dim(`DEBUG: ${message}`))
	}

	public error(message: string): void {
		console.error(pc.red(`ERROR: ${message}`))
	}
}

export const logger: Logger = Logger.getInstance()

export function handleBunBuildLogs(
	logs: Array<BuildMessage | ResolveMessage>,
): void {
	for (const log of logs) {
		if (log.level === 'error') {
			logger.error(`${log.message} in ${log.position?.file}`)
			throw new TyperollError(
				`Failed to generate declaration file: ${log.message}`,
			)
		}

		if (log.level === 'warning') {
			logger.warn(log.message)
		}

		if (log.level === 'info') {
			logger.info(log.message)
		}
	}
}
