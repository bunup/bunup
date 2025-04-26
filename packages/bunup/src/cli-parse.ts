import pc from 'picocolors'
import { version } from '../package.json'
import { BUNUP_CLI_OPTIONS_URL } from './constants'
import { BunupCLIError } from './errors'
import { getEntryNameOnly } from './helpers/entry'
import { logger } from './logger'
import type { CliOptions } from './options'

type OptionHandler = (
	value: string | boolean,
	options: Partial<CliOptions>,
	subPath?: string,
) => void

function booleanHandler(optionName: keyof CliOptions): OptionHandler {
	return (value, options) => {
		options[optionName] = (value === true || value === 'true') as any
	}
}

function stringHandler(optionName: keyof CliOptions): OptionHandler {
	return (value, options) => {
		if (typeof value === 'string') {
			options[optionName] = value as any
		} else {
			throw new BunupCLIError(
				`Option --${optionName} requires a string value`,
			)
		}
	}
}

function arrayHandler(optionName: keyof CliOptions): OptionHandler {
	return (value, options) => {
		if (typeof value === 'string') {
			options[optionName] = value.split(',') as any
		} else {
			throw new BunupCLIError(
				`Option --${optionName} requires a string value`,
			)
		}
	}
}

function booleanOrStringHandler(optionName: keyof CliOptions): OptionHandler {
	return (value, options) => {
		if (typeof value === 'boolean') {
			options[optionName] = value as any
		} else if (typeof value === 'string') {
			if (
				value.toLowerCase() === 'true' ||
				value.toLowerCase() === 'false'
			) {
				options[optionName] = (value.toLowerCase() === 'true') as any
			} else {
				options[optionName] = value as any
			}
		} else {
			throw new BunupCLIError(
				`Option --${optionName} requires a boolean or string value`,
			)
		}
	}
}

function showHelp(): void {
	console.log(
		'\nBunup - ⚡️ A blazing-fast build tool for your libraries built with Bun.\n',
	)
	console.log('For more information on available options, visit:')
	console.log(`${pc.cyan(pc.underline(BUNUP_CLI_OPTIONS_URL))}\n`)
	process.exit(0)
}

function showVersion(): void {
	console.log(version)
	process.exit(0)
}

const optionConfigs = {
	name: { flags: ['n', 'name'], handler: stringHandler('name') },
	format: {
		flags: ['f', 'format'],
		handler: arrayHandler('format'),
	},
	outDir: { flags: ['o', 'out-dir'], handler: stringHandler('outDir') },
	minify: { flags: ['m', 'minify'], handler: booleanHandler('minify') },
	watch: { flags: ['w', 'watch'], handler: booleanHandler('watch') },
	dts: { flags: ['d', 'dts'], handler: booleanHandler('dts') },
	banner: { flags: ['bn', 'banner'], handler: stringHandler('banner') },
	footer: { flags: ['ft', 'footer'], handler: stringHandler('footer') },
	external: { flags: ['e', 'external'], handler: arrayHandler('external') },
	sourcemap: {
		flags: ['sm', 'sourcemap'],
		handler: booleanOrStringHandler('sourcemap'),
	},
	target: { flags: ['t', 'target'], handler: stringHandler('target') },
	minifyWhitespace: {
		flags: ['mw', 'minify-whitespace'],
		handler: booleanHandler('minifyWhitespace'),
	},
	minifyIdentifiers: {
		flags: ['mi', 'minify-identifiers'],
		handler: booleanHandler('minifyIdentifiers'),
	},
	minifySyntax: {
		flags: ['ms', 'minify-syntax'],
		handler: booleanHandler('minifySyntax'),
	},
	clean: { flags: ['c', 'clean'], handler: booleanHandler('clean') },
	splitting: {
		flags: ['s', 'splitting'],
		handler: booleanHandler('splitting'),
	},
	noExternal: {
		flags: ['ne', 'no-external'],
		handler: arrayHandler('noExternal'),
	},
	preferredTsconfigPath: {
		flags: ['tsconfig', 'preferred-tsconfig-path'],
		handler: stringHandler('preferredTsconfigPath'),
	},
	bytecode: {
		flags: ['bc', 'bytecode'],
		handler: booleanHandler('bytecode'),
	},
	dtsOnly: { flags: ['do', 'dts-only'], handler: booleanHandler('dtsOnly') },
	silent: { flags: ['silent'], handler: booleanHandler('silent') },
	config: { flags: ['config'], handler: stringHandler('config') },
	publicPath: {
		flags: ['pp', 'public-path'],
		handler: stringHandler('publicPath'),
	},
	env: { flags: ['env'], handler: stringHandler('env') },
	shims: { flags: ['shims'], handler: booleanHandler('shims') },
	onSuccess: {
		flags: ['onSuccess'],
		handler: stringHandler('onSuccess'),
	},
	filter: { flags: ['filter'], handler: arrayHandler('filter') },
	entry: {
		flags: ['entry'],
		handler: (
			value: string | boolean,
			options: Partial<CliOptions>,
			subPath?: string,
		) => {
			if (typeof value !== 'string') {
				throw new BunupCLIError(
					`Entry${subPath ? ` --entry.${subPath}` : ''} requires a string value`,
				)
			}

			const entries = options.entry || {}

			if (subPath) {
				if (entries[subPath as keyof typeof entries]) {
					logger.warn(
						`Duplicate entry name '${subPath}' provided via --entry.${subPath}. Overwriting previous entry.`,
					)
				}
				;(entries as Record<string, string>)[subPath] = value
			} else {
				const name = getEntryNameOnly(value)
				if ((entries as Record<string, string>)[name]) {
					logger.warn(
						`Duplicate entry name '${name}' derived from '${value}'. Overwriting previous entry.`,
					)
				}
				;(entries as Record<string, string>)[name] = value
			}

			options.entry = entries
		},
	},
	resolveDts: {
		flags: ['rd', 'resolve-dts'],
		handler: (value: string | boolean, options: Partial<CliOptions>) => {
			if (!options.dts) options.dts = {}
			if (typeof options.dts === 'boolean') options.dts = {}

			if (typeof value === 'string') {
				if (value === 'true' || value === 'false') {
					;(options.dts as any).resolve = value === 'true'
				} else {
					;(options.dts as any).resolve = value.split(',')
				}
			} else {
				;(options.dts as any).resolve = true
			}
		},
	},
	help: { flags: ['h', 'help'], handler: () => showHelp() },
	version: { flags: ['v', 'version'], handler: () => showVersion() },
}

const flagToHandler: Record<string, OptionHandler> = {}

for (const config of Object.values(optionConfigs)) {
	for (const flag of config.flags) {
		flagToHandler[flag] = config.handler
	}
}

export function parseCliOptions(argv: string[]): Partial<CliOptions> {
	const options: Partial<CliOptions> = {}

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]

		if (arg.startsWith('--')) {
			let key: string
			let value: string | boolean

			if (arg.includes('=')) {
				const [keyPart, valuePart] = arg.slice(2).split('=', 2)
				key = keyPart
				value = valuePart
			} else {
				key = arg.slice(2)
				const nextArg = argv[i + 1]
				value = nextArg && !nextArg.startsWith('-') ? nextArg : true
				if (typeof value === 'string') i++
			}

			if (key.includes('.')) {
				const [mainOption, subPath] = key.split('.', 2)
				const handler = flagToHandler[mainOption]

				if (handler) {
					handler(value, options, subPath)
				} else {
					throw new BunupCLIError(`Unknown option: --${key}`)
				}
			} else {
				const handler = flagToHandler[key]
				if (handler) {
					handler(value, options)
				} else {
					throw new BunupCLIError(`Unknown option: --${key}`)
				}
			}
		} else if (arg.startsWith('-')) {
			const key = arg.slice(1)
			const nextArg = argv[i + 1]
			const value = nextArg && !nextArg.startsWith('-') ? nextArg : true
			if (typeof value === 'string') i++

			const handler = flagToHandler[key]
			if (handler) {
				handler(value, options)
			} else {
				throw new BunupCLIError(`Unknown option: -${key}`)
			}
		} else {
			optionConfigs.entry.handler(arg, options, undefined)
		}
	}

	return options
}
