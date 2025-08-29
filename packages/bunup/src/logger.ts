import pc from 'picocolors'

interface LogOptions {
	muted?: boolean
	verticalSpace?: boolean
	identifier?: string
	once?: string
	tick?: boolean
	icon?: string
}

export type LogLevel = 'info' | 'warn' | 'error'

interface FormatMessageOptions extends LogOptions {
	message: string
	type?: LogLevel
}

export let silent = false

export function setSilent(value: boolean | undefined): void {
	silent = value ?? false
}

export class Logger {
	private static instance: Logger
	private readonly loggedOnceMessages = new Set<string>()

	private constructor() {}

	public static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger()
		}
		return Logger.instance
	}

	public dispose(): void {
		this.loggedOnceMessages.clear()
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
		} = options

		const icon = options.icon ?? this.getIcon(type, tick)
		const styledMessage = muted
			? pc.dim(message)
			: type === 'error'
				? pc.red(message)
				: type === 'warn'
					? pc.yellow(message)
					: message
		const identifierPart = this.formatIdentifier(identifier)

		return `${icon} ${styledMessage}${identifierPart}`
	}

	private output(
		message: string,
		options: LogOptions = {},
		logFn: (...args: any[]) => void = console.log,
	): void {
		if (silent || !this.shouldLog(options)) {
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
		if (!silent) {
			console.log('')
		}
	}

	public log(...args: any[]): void {
		if (!silent) {
			console.log(...args)
		}
	}
}

export interface TableColumn {
	header: string
	align: 'left' | 'right'
	color?: (str: string) => string
}

export function logTable(
	columns: TableColumn[],
	data: Record<string, string>[],
	footer?: Record<string, string>,
): void {
	if (silent) return

	const widths: Record<string, number> = {}
	for (const col of columns) {
		const headerLength = col.header.length
		const dataLengths = data.map((row) => row[col.header]?.length || 0)
		const footerLength = footer ? footer[col.header]?.length || 0 : 0
		widths[col.header] = Math.max(headerLength, ...dataLengths, footerLength)
	}

	const pad = (str: string, width: number, align: 'left' | 'right') => {
		return align === 'left' ? str.padEnd(width) : str.padStart(width)
	}

	const headerRow = columns
		.map((col) => pad(col.header, widths[col.header], col.align))
		.join(pc.dim(' | '))
	console.log(pc.dim(headerRow))

	const separator = columns
		.map((col) => '-'.repeat(widths[col.header]))
		.join(' | ')
	console.log(pc.dim(separator))

	for (const row of data) {
		const rowStr = columns
			.map((col) => {
				const value = row[col.header] || ''
				const padded = pad(value, widths[col.header], col.align)
				return col.color ? col.color(padded) : padded
			})
			.join(pc.dim(' | '))
		console.log(rowStr)
	}

	console.log(pc.dim(separator))

	if (footer) {
		const footerRow = columns
			.map((col) => {
				const value = footer[col.header] || ''
				const padded = pad(value, widths[col.header], col.align)
				return padded
			})
			.join(pc.dim(' | '))
		console.log(footerRow)
	}
}

export function logTime(ms: number): string {
	return ms >= 1000
		? pc.green(`${(ms / 1000).toFixed(2)}s`)
		: pc.green(`${Math.round(ms)}ms`)
}

export const link = (url: string, label?: string): string => {
	if (!label) {
		label = url
	}

	return `\u001b]8;;${url}\u0007${pc.underline(pc.cyan(label))}\u001b]8;;\u0007`
}

export const logger: Logger = Logger.getInstance()
