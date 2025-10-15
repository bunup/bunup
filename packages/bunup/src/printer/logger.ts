import pc from 'picocolors'

interface LogOptions {
	muted?: boolean
	verticalSpace?: boolean
	identifier?: string
	once?: string
	tick?: boolean
	icon?: string
	noIcon?: boolean
}

export type LogLevel = 'info' | 'warn' | 'error'

interface FormatMessageOptions extends LogOptions {
	message: string
	type?: LogLevel
}

export class Logger {
	private static instance: Logger
	private readonly loggedOnceMessages = new Set<string>()
	private silent = false

	private constructor() {}

	public static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger()
		}
		return Logger.instance
	}

	public setSilent(value: boolean | undefined): void {
		this.silent = value ?? false
	}

	public isSilent(): boolean {
		return this.silent
	}

	private shouldLog(options?: LogOptions): boolean {
		if (!options?.once) {
			return true
		}

		if (this.loggedOnceMessages.has(options.once)) {
			return false
		}

		this.loggedOnceMessages.add(options.once)
		return true
	}

	private getIcon(type: LogLevel, tick?: boolean): string {
		if (tick) {
			return pc.green('✓')
		}

		const iconMap: Record<LogLevel, string> = {
			info: pc.blue('i'),
			warn: pc.yellow('!'),
			error: pc.red('✕'),
		}
		return iconMap[type]
	}

	private formatIdentifier(identifier?: string): string {
		return identifier ? `   ${pc.bgBlueBright(` ${identifier} `)}` : ''
	}

	public formatMessage(options: FormatMessageOptions): string {
		const {
			message,
			identifier,
			muted = false,
			tick = false,
			type = 'info',
			noIcon = false,
		} = options

		const icon = noIcon ? '' : (options.icon ?? this.getIcon(type, tick))
		const styledMessage = muted
			? pc.dim(message)
			: type === 'error'
				? pc.red(message)
				: type === 'warn'
					? pc.yellow(message)
					: message

		const identifierPart = this.formatIdentifier(identifier)
		const iconPart = icon ? `${icon} ` : ''
		return `${iconPart}${styledMessage}${identifierPart}`
	}

	private output(
		message: string,
		options: LogOptions = {},
		logFn: (...args: any[]) => void = console.log,
	): void {
		if (this.silent || !this.shouldLog(options)) {
			return
		}

		if (options.verticalSpace) {
			logFn('')
		}

		logFn(message)

		if (options.verticalSpace) {
			logFn('')
		}
	}

	public info(message: string, options: LogOptions = {}): void {
		const formattedMessage = this.formatMessage({
			...options,
			message,
			type: 'info',
		})
		this.output(formattedMessage, options)
	}

	public warn(message: string, options: LogOptions = {}): void {
		const formattedMessage = this.formatMessage({
			...options,
			message,
			type: 'warn',
		})
		this.output(formattedMessage, options)
	}

	public error(message: string, options: LogOptions = {}): void {
		const formattedMessage = this.formatMessage({
			...options,
			message,
			type: 'error',
		})
		this.output(formattedMessage, options)
	}

	public success(message: string, options: LogOptions = {}): void {
		const formattedMessage = this.formatMessage({
			...options,
			message,
			tick: true,
		})
		this.output(formattedMessage, options)
	}

	public space(): void {
		if (!this.silent) {
			console.log('')
		}
	}

	public log(...args: any[]): void {
		if (!this.silent) {
			console.log(...args)
		}
	}

	public list(items: string[], options?: { dim?: boolean }): string {
		return items
			.map((item) => {
				const bullet = pc.cyan('-')
				const text = options?.dim ? pc.dim(item) : item
				return `  ${bullet} ${text}`
			})
			.join('\n')
	}

	public highlight(code: string): string {
		const keywords =
			/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|try|catch|throw|typeof|interface|type|enum)\b/g
		const strings = /(["'`])(?:(?=(\\?))\2.)*?\1/g
		const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm
		const numbers = /\b(\d+\.?\d*)\b/g
		const functions = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g

		let result = code

		result = result.replace(comments, (match) => pc.dim(match))
		result = result.replace(strings, (match) => pc.green(match))
		result = result.replace(keywords, (match) => pc.magenta(match))
		result = result.replace(numbers, (match) => pc.yellow(match))
		result = result.replace(functions, (match) => pc.cyan(match))

		return result
	}
}

export function logTime(ms: number): string {
	return ms >= 1000
		? pc.green(`${(ms / 1000).toFixed(2)}s`)
		: pc.green(`${Math.round(ms)}ms`)
}

export function link(url: string, label?: string): string {
	if (!label) {
		label = url
	}
	return `\u001b]8;;${url}\u0007${pc.underline(pc.cyan(label))}\u001b]8;;\u0007`
}

export const logger: Logger = Logger.getInstance()
