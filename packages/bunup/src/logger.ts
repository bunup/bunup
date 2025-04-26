import pc from 'picocolors'

type FormatType = 'ESM' | 'CJS' | 'IIFE' | 'DTS' | string

interface LogOptions {
	muted?: boolean
	verticalSpace?: boolean
	identifier?: string
	once?: string
}

let silent = false

export function setSilent(value: boolean | undefined): void {
	silent = value ?? false
}

class Logger {
	private static instance: Logger
	private loggedOnceMessages = new Set<string>()

	public readonly MAX_LABEL_LENGTH = 3

	private cliColor = pc.blue
	private mutedColor = pc.dim
	private infoColor = pc.cyan
	private warnColor = pc.yellow
	private errorColor = pc.red
	private defaultColor = pc.white

	private progressFgColorMap: Record<string, (text: string) => string> = {
		ESM: pc.yellow,
		CJS: pc.green,
		IIFE: pc.magenta,
		DTS: pc.blue,
	}

	private progressBgColorMap: Record<string, (text: string) => string> = {
		ESM: pc.bgYellow,
		CJS: pc.bgGreen,
		IIFE: pc.bgMagenta,
		DTS: pc.bgBlue,
	}

	public labels = {
		cli: 'CLI',
		info: 'INFO',
		warn: 'WARN',
		error: 'ERROR',
	}

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
		if (!options?.once) return true
		if (this.loggedOnceMessages.has(options.once)) return false
		this.loggedOnceMessages.add(options.once)
		return true
	}

	public formatMessage({
		fgColor,
		bgColor,
		label,
		message,
		identifier,
		muted,
	}: {
		fgColor: (text: string) => string
		bgColor: (text: string) => string
		label: string
		message: string
		identifier?: string
		muted?: boolean
	}): string {
		const padding = ' '.repeat(
			Math.max(0, this.MAX_LABEL_LENGTH - label.length),
		)
		const formattedMessage = muted ? this.mutedColor(message) : message
		const identifierPart = identifier
			? `   ${bgColor(pc.black(` ${identifier} `))}`
			: ''
		return `${fgColor(label)} ${padding}${formattedMessage}${identifierPart}`
	}

	public output(
		message: string,
		options: LogOptions = {},
		logFn: (...args: any[]) => void = console.log,
	): void {
		if (silent || !this.shouldLog(options)) return
		if (options.verticalSpace) logFn('')
		logFn(message)
		if (options.verticalSpace) logFn('')
	}

	public cli(message: string, options: LogOptions = {}): void {
		const formattedMessage = this.formatMessage({
			fgColor: this.cliColor,
			bgColor: pc.bgBlue,
			label: this.labels.cli,
			message,
			identifier: options.identifier,
			muted: options.muted,
		})
		this.output(formattedMessage, options)
	}

	public info(message: string, options: LogOptions = {}): void {
		const formattedMessage = this.formatMessage({
			fgColor: this.infoColor,
			bgColor: pc.bgCyan,
			label: this.labels.info,
			message,
			identifier: options.identifier,
			muted: options.muted,
		})
		this.output(formattedMessage, options)
	}

	public warn(message: string, options: LogOptions = {}): void {
		const formattedMessage = this.formatMessage({
			fgColor: this.warnColor,
			bgColor: pc.bgYellow,
			label: this.labels.warn,
			message,
			identifier: options.identifier,
			muted: options.muted,
		})
		this.output(formattedMessage, options, console.warn)
	}

	public error(message: string, options: LogOptions = {}): void {
		const formattedMessage = this.formatMessage({
			fgColor: this.errorColor,
			bgColor: pc.bgRed,
			label: this.labels.error,
			message,
			identifier: options.identifier,
			muted: options.muted,
		})
		this.output(formattedMessage, options, console.error)
	}

	private getProgressFgColor(label: string): (text: string) => string {
		for (const [key, colorFn] of Object.entries(this.progressFgColorMap)) {
			if (label.includes(key)) return colorFn
		}
		return this.defaultColor
	}

	private getProgressBgColor(label: string): (text: string) => string {
		for (const [key, colorFn] of Object.entries(this.progressBgColorMap)) {
			if (label.includes(key)) return colorFn
		}
		return pc.bgWhite
	}

	public progress(
		label: FormatType,
		message: string,
		options: LogOptions = {},
	): void {
		const fgColor = this.getProgressFgColor(label)
		const bgColor = this.getProgressBgColor(label)

		const formattedMessage = this.formatMessage({
			fgColor,
			bgColor,
			label,
			message,
			identifier: options.identifier,
			muted: options.muted,
		})

		this.output(formattedMessage, options)
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
	const widths: Record<string, number> = {}
	for (const col of columns) {
		const headerLength = col.header.length
		const dataLengths = data.map((row) => row[col.header]?.length || 0)
		const footerLength = footer ? footer[col.header]?.length || 0 : 0
		widths[col.header] = Math.max(
			headerLength,
			...dataLengths,
			footerLength,
		)
	}

	const pad = (str: string, width: number, align: 'left' | 'right') => {
		return align === 'left' ? str.padEnd(width) : str.padStart(width)
	}

	const headerRow = columns
		.map((col) => pad(col.header, widths[col.header], col.align))
		.join(pc.gray(' | '))
	console.log(pc.gray(headerRow))

	const separator = columns
		.map((col) => '-'.repeat(widths[col.header]))
		.join(' | ')
	console.log(pc.gray(separator))

	for (const row of data) {
		const rowStr = columns
			.map((col) => {
				const value = row[col.header] || ''
				const padded = pad(value, widths[col.header], col.align)
				return col.color ? col.color(padded) : padded
			})
			.join(pc.gray(' | '))
		console.log(rowStr)
	}

	console.log(pc.gray(separator))

	if (footer) {
		const footerRow = columns
			.map((col) => {
				const value = footer[col.header] || ''
				const padded = pad(value, widths[col.header], col.align)
				return padded
			})
			.join(pc.gray(' | '))
		console.log(footerRow)
	}
}

export const logger: Logger = Logger.getInstance()
