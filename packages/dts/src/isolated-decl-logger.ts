import type { OxcError, Severity } from 'oxc-transform'
import pc from 'picocolors'

import { getShortFilePath, isDev } from './utils'

export type IsolatedDeclarationError = {
	error: OxcError
	file: string
	content: string
}

interface SeverityFormatting {
	color: (text: string) => string
	prefix: string
}

const SEVERITY_CONFIG = {
	dev: {
		Error: { color: pc.yellow, prefix: 'WARN' },
		Warning: { color: pc.yellow, prefix: 'WARN' },
		Advice: { color: pc.blue, prefix: 'ADVICE' },
		default: { color: pc.blue, prefix: 'WARN' },
	},
	prod: {
		Error: { color: pc.red, prefix: 'Error' },
		Warning: { color: pc.yellow, prefix: 'Warning' },
		Advice: { color: pc.blue, prefix: 'Advice' },
		default: { color: pc.red, prefix: 'Error' },
	},
} as const

const ISOLATED_DECLARATION_ERRORS: Record<string, string> = {
	TS9007: `Function requires an explicit return type, e.g., \`function foo(): ${pc.green('string')} { ... }\`.`,
	TS9008: `Method requires an explicit return type, e.g., \`myMethod(): ${pc.green('number')} { ... }\`.`,
	TS9009:
		'Ensure at least one accessor (getter/setter) has an explicit return type.',
	TS9010: `Variable requires an explicit type annotation, e.g., \`let name: ${pc.green('string')} = "Bob";\`.`,
	TS9011: `Function parameter requires an explicit type, e.g., \`(param: ${pc.green('number')}) => {}\`.`,
	TS9012: `Class property requires an explicit type, e.g., \`class MyClass { id: ${pc.green('number')}; }\`.`,
	TS9013:
		'Expression type cannot be inferred. Add a type annotation where this expression is assigned or used.',
	TS9014:
		'Computed property names must be simple (e.g., string/number literals or basic identifiers).',
	TS9015: 'Either add an explicit type to the object or avoid spread.',
	TS9016:
		'Either add an explicit type to the object or use full `key: value` syntax.',
	TS9017: `For array type inference, use \`as const\` (e.g., \`[1, 2, 3] ${pc.green('as const')}\`).`,
	TS9018: 'Either add an explicit type to the array or avoid spread.',
	TS9019: `Avoid direct export of destructured bindings. Instead, declare and then export, e.g., \`const { x } = obj; ${pc.green('export { x };')}\`.`,
	TS9020:
		'Enum member initializers must be simple, constant values (like numbers or strings), not expressions or external references.',
	TS9021:
		'The `extends` clause must refer to a direct class name, not an expression.',
	TS9022: `Class expressions cannot infer types. Assign the class expression to an explicitly typed variable, e.g., \`const MyClass: ${pc.green('typeof OtherClass')} = class { ... };\`.`,
	TS9023: `Properties assigned to functions must be explicitly declared on the function type/interface, e.g., \`interface MyFunc { (): void; ${pc.green('myProp: string;')} }\`.`,
	TS9025: `Parameter can implicitly be \`undefined\`. Explicitly add \`| undefined\` to its type, e.g., \`param?: string\` becomes \`param: ${pc.green('string | undefined')}\`.`,
	TS9037: `Default export requires an explicit type, e.g., \`const MyValue: ${pc.green('number')} = 42; export default MyValue;\`.`,
	TS9038:
		'Computed property names in class/object literals must be simple (string/number literals or plain identifiers), not complex expressions.',
	TS9039:
		'A type references a private class member (`{name}`). Private members cannot be part of publicly exposed types.',
}

export function logIsolatedDeclarationErrors(
	errors: IsolatedDeclarationError[],
): void {
	if (!errors.length) return

	const hasErrors = errors.some(({ error }) => error.severity === 'Error')

	console.log()

	errors.forEach(logSingle)

	if (hasErrors) {
		if (!isDev()) process.exit(1)
	}
}

function logSingle({ error, file, content }: IsolatedDeclarationError): void {
	const label = error.labels?.[0]
	const errorCode = extractErrorCode(error.message)
	const errorMessage = ISOLATED_DECLARATION_ERRORS[errorCode]

	if (!errorMessage) return

	const position = label ? calculatePosition(content, label.start) : ''
	const shortPath = getShortFilePath(file)
	const { color, prefix } = getSeverityFormatting(error.severity)

	const formattedMessage = `${color(prefix)} ${shortPath}${position}: ${errorCode} ${errorMessage}`

	const codeFrame = label
		? generateOxcCodeFrame(content, label.start, label.end)
		: error.codeframe || ''

	const helpMessage = error.helpMessage
		? `\n${pc.cyan('Help:')} ${error.helpMessage}`
		: ''

	console.log(`${formattedMessage}${helpMessage}\n\n${pc.gray(codeFrame)}\n`)
}

function extractErrorCode(message: string): string {
	return message.split(':')[0]
}

function getSeverityFormatting(severity: Severity): SeverityFormatting {
	const config = SEVERITY_CONFIG[isDev() ? 'dev' : 'prod']
	return config[severity as keyof typeof config] || config.default
}

function calculatePosition(sourceText: string, labelStart: number): string {
	if (labelStart === undefined) return ''

	const lines = sourceText.slice(0, labelStart).split('\n')
	const lineNumber = lines.length
	const columnStart = lines[lines.length - 1].length + 1

	return ` (${lineNumber}:${columnStart})`
}

export function generateOxcCodeFrame(
	sourceText: string,
	start: number,
	end: number,
): string {
	const lines = sourceText.split('\n')
	const errorLine = sourceText.slice(0, start).split('\n').length
	const lineContent = lines[errorLine - 1]

	const lastNewlineIndex = sourceText.slice(0, start).lastIndexOf('\n')
	const startCol = start - lastNewlineIndex - 1
	const endCol = end
		? Math.min(end - lastNewlineIndex - 1, lineContent.length)
		: startCol + 1

	const underlineLength = Math.max(1, endCol - startCol)
	const arrowLine =
		' '.repeat(startCol) + pc.dim(pc.blue('⎯'.repeat(underlineLength)))

	return `${lineContent}\n${arrowLine}`
}
