import pc from 'picocolors'
import { version } from '../../package.json'
import { BUNUP_DOCS_URL } from '../constants'
import { BunupCLIError } from '../errors'
import { logger } from '../logger'
import type { BuildOptions } from '../options'

export type CliOptions = BuildOptions & {
	config: string
	filter?: string[]
	new?: boolean
	init?: boolean
}

type OptionHandler = (
	value: string | boolean,
	options: Partial<CliOptions>,
) => void

interface OptionDefinition {
	flags: string[]
	handler: OptionHandler
	description: string
	type: 'string' | 'boolean' | 'array' | 'string|boolean'
	default?: string
	category:
		| 'build'
		| 'output'
		| 'development'
		| 'minification'
		| 'workspace'
		| 'utility'
}

const createHandlers = () => ({
	boolean:
		(key: keyof CliOptions): OptionHandler =>
		(value, options) => {
			options[key] = (value === true || value === 'true') as any
		},

	string:
		(key: keyof CliOptions): OptionHandler =>
		(value, options) => {
			if (typeof value !== 'string') {
				throw new BunupCLIError(`Option --${key} requires a string value`)
			}
			options[key] = value as any
		},

	array:
		(key: keyof CliOptions): OptionHandler =>
		(value, options) => {
			if (typeof value !== 'string') {
				throw new BunupCLIError(`Option --${key} requires a string value`)
			}
			options[key] = value.split(',') as any
		},

	stringOrBoolean:
		(key: keyof CliOptions): OptionHandler =>
		(value, options) => {
			if (typeof value === 'boolean') {
				options[key] = value as any
			} else if (typeof value === 'string') {
				const lowerValue = value.toLowerCase()
				if (lowerValue === 'true' || lowerValue === 'false') {
					options[key] = (lowerValue === 'true') as any
				} else {
					options[key] = value as any
				}
			} else {
				throw new BunupCLIError(
					`Option --${key} requires a boolean or string value`,
				)
			}
		},

	entry: (value: string | boolean, options: Partial<CliOptions>) => {
		if (typeof value !== 'string') {
			throw new BunupCLIError('Entry requires a string value')
		}
		const entries = Array.isArray(options.entry) ? [...options.entry] : []
		if (entries.includes(value)) {
			logger.warn(`Duplicate entry '${value}' provided. Skipping.`)
		} else {
			entries.push(value)
		}
		options.entry = entries
	},

	resolveDts: (value: string | boolean, options: Partial<CliOptions>) => {
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

	showHelp: () => {
		displayHelp()
		process.exit(0)
	},

	showVersion: () => {
		console.log(version)
		process.exit(0)
	},
})

const handlers = createHandlers()

const OPTION_DEFINITIONS: Record<string, OptionDefinition> = {
	name: {
		flags: ['n', 'name'],
		handler: handlers.string('name'),
		description:
			'Name of the build configuration for logging and identification',
		type: 'string',
		category: 'utility',
	},
	format: {
		flags: ['f', 'format'],
		handler: handlers.array('format'),
		description: 'Output formats for the bundle (esm, cjs, iife)',
		type: 'array',
		default: 'cjs',
		category: 'build',
	},
	outDir: {
		flags: ['o', 'out-dir'],
		handler: handlers.string('outDir'),
		description: 'Output directory for the bundled files',
		type: 'string',
		default: 'dist',
		category: 'output',
	},
	minify: {
		flags: ['m', 'minify'],
		handler: handlers.boolean('minify'),
		description: 'Enable all minification options',
		type: 'boolean',
		category: 'minification',
	},
	watch: {
		flags: ['w', 'watch'],
		handler: handlers.boolean('watch'),
		description: 'Watch for file changes and rebuild automatically',
		type: 'boolean',
		category: 'development',
	},
	dts: {
		flags: ['d', 'dts'],
		handler: handlers.boolean('dts'),
		description: 'Generate TypeScript declaration files (.d.ts)',
		type: 'boolean',
		category: 'development',
	},
	banner: {
		flags: ['bn', 'banner'],
		handler: handlers.string('banner'),
		description: 'A banner to be added to the final bundle',
		type: 'string',
		category: 'output',
	},
	footer: {
		flags: ['ft', 'footer'],
		handler: handlers.string('footer'),
		description: 'A footer to be added to the final bundle',
		type: 'string',
		category: 'output',
	},
	external: {
		flags: ['e', 'external'],
		handler: handlers.array('external'),
		description: 'External packages that should not be bundled',
		type: 'array',
		category: 'build',
	},
	sourcemap: {
		flags: ['sm', 'sourcemap'],
		handler: handlers.stringOrBoolean('sourcemap'),
		description:
			'Type of sourcemap to generate (none, linked, external, inline)',
		type: 'string|boolean',
		default: 'none',
		category: 'output',
	},
	target: {
		flags: ['t', 'target'],
		handler: handlers.string('target'),
		description: 'The target environment for the bundle',
		type: 'string',
		default: 'node',
		category: 'build',
	},
	minifyWhitespace: {
		flags: ['mw', 'minify-whitespace'],
		handler: handlers.boolean('minifyWhitespace'),
		description: 'Minify whitespace in the output',
		type: 'boolean',
		category: 'minification',
	},
	minifyIdentifiers: {
		flags: ['mi', 'minify-identifiers'],
		handler: handlers.boolean('minifyIdentifiers'),
		description: 'Minify identifiers in the output',
		type: 'boolean',
		category: 'minification',
	},
	minifySyntax: {
		flags: ['ms', 'minify-syntax'],
		handler: handlers.boolean('minifySyntax'),
		description: 'Minify syntax in the output',
		type: 'boolean',
		category: 'minification',
	},
	clean: {
		flags: ['c', 'clean'],
		handler: handlers.boolean('clean'),
		description: 'Clean the output directory before building',
		type: 'boolean',
		default: 'true',
		category: 'output',
	},
	splitting: {
		flags: ['s', 'splitting'],
		handler: handlers.boolean('splitting'),
		description: 'Enable code splitting',
		type: 'boolean',
		category: 'build',
	},
	noExternal: {
		flags: ['ne', 'no-external'],
		handler: handlers.array('noExternal'),
		description: 'Packages that should be bundled even if they are in external',
		type: 'array',
		category: 'build',
	},
	preferredTsconfigPath: {
		flags: ['preferred-tsconfig-path'],
		handler: handlers.string('preferredTsconfigPath'),
		description:
			'Path to a preferred tsconfig.json file for declaration generation',
		type: 'string',
		category: 'development',
	},
	silent: {
		flags: ['silent'],
		handler: handlers.boolean('silent'),
		description: 'Disable logging during the build process',
		type: 'boolean',
		default: 'false',
		category: 'utility',
	},
	config: {
		flags: ['config'],
		handler: handlers.string('config'),
		description: 'Path to a specific configuration file to use',
		type: 'string',
		category: 'utility',
	},
	publicPath: {
		flags: ['pp', 'public-path'],
		handler: handlers.string('publicPath'),
		description: 'Prefix to be added to specific import paths in bundled code',
		type: 'string',
		category: 'output',
	},
	env: {
		flags: ['env'],
		handler: handlers.string('env'),
		description:
			'Controls how environment variables are handled during bundling',
		type: 'string',
		category: 'build',
	},
	filter: {
		flags: ['filter'],
		handler: handlers.array('filter'),
		description: 'Filter specific packages to build in a workspace',
		type: 'array',
		category: 'workspace',
	},
	new: {
		flags: ['new'],
		handler: handlers.boolean('new'),
		description: 'Create a new project with bunup',
		type: 'boolean',
		category: 'utility',
	},
	init: {
		flags: ['init'],
		handler: handlers.boolean('init'),
		description: 'Initialize bunup in an existing project',
		type: 'boolean',
		category: 'utility',
	},
	entry: {
		flags: ['entry'],
		handler: handlers.entry,
		description: 'Entry point files for the build',
		type: 'string',
		category: 'build',
	},
	resolveDts: {
		flags: ['rd', 'resolve-dts'],
		handler: handlers.resolveDts,
		description: 'Configure DTS resolution options',
		type: 'string|boolean',
		category: 'development',
	},
	onSuccess: {
		flags: ['onSuccess'],
		handler: handlers.string('onSuccess'),
		description: 'Command to run after the build process completes',
		type: 'string',
		category: 'utility',
	},
	help: {
		flags: ['h', 'help'],
		handler: handlers.showHelp,
		description: 'Show this help message',
		type: 'boolean',
		category: 'utility',
	},
	version: {
		flags: ['v', 'version'],
		handler: handlers.showVersion,
		description: 'Show version number',
		type: 'boolean',
		category: 'utility',
	},
}

const createFlagLookupMap = (): Record<string, OptionHandler> => {
	const lookup: Record<string, OptionHandler> = {}

	for (const definition of Object.values(OPTION_DEFINITIONS)) {
		for (const flag of definition.flags) {
			lookup[flag] = definition.handler
		}
	}

	return lookup
}

const flagToHandler = createFlagLookupMap()

const displayHelp = (): void => {
	const categoryLabels = {
		build: 'Build Options',
		output: 'Output Options',
		development: 'Development Options',
		minification: 'Minification Options',
		workspace: 'Workspace Options',
		utility: 'Utility Options',
	}

	console.log()
	console.log(pc.cyan(pc.bold('bunup')))
	console.log()
	console.log('⚡️ A blazing-fast build tool for your libraries built with Bun')
	console.log()
	console.log(pc.cyan('Usage:'))
	console.log('  bunup [entry...] [options]')
	console.log('  bunup --init')
	console.log('  bunup --new')
	console.log()

	for (const [categoryKey, categoryName] of Object.entries(categoryLabels)) {
		const categoryOptions = Object.values(OPTION_DEFINITIONS).filter(
			(option) => option.category === categoryKey,
		)

		if (categoryOptions.length === 0) return

		console.log(pc.cyan(`${categoryName}:`))

		for (const option of categoryOptions) {
			const flags = option.flags
				.map((flag) => (flag.length === 1 ? `-${flag}` : `--${flag}`))
				.join(', ')

			const flagsDisplay = pc.green(flags)
			const typeDisplay = pc.dim(`<${option.type}>`)
			const defaultDisplay = option.default
				? pc.yellow(`(default: ${option.default})`)
				: ''

			console.log(`  ${flagsDisplay} ${typeDisplay}`)
			console.log(`    ${pc.dim(option.description)} ${defaultDisplay}`)
			console.log()
		}
	}

	console.log(pc.cyan('Examples:'))
	console.log('  bunup src/**/*.ts')
	console.log('  bunup src/index.ts src/cli.ts --format esm,cjs')
	console.log('  bunup src/index.ts --watch --dts')
	console.log()
	console.log(pc.dim('For more information:'))
	console.log(`  ${pc.cyan(pc.underline(BUNUP_DOCS_URL))}`)
	console.log()
}

const parseArgument = (arg: string, nextArg?: string) => {
	if (arg.startsWith('--')) {
		if (arg.includes('=')) {
			const [key, value] = arg.slice(2).split('=', 2)
			return { key, value, skipNext: false }
		} else {
			const key = arg.slice(2)
			const value = nextArg && !nextArg.startsWith('-') ? nextArg : true
			return { key, value, skipNext: typeof value === 'string' }
		}
	} else if (arg.startsWith('-')) {
		const key = arg.slice(1)
		const value = nextArg && !nextArg.startsWith('-') ? nextArg : true
		return { key, value, skipNext: typeof value === 'string' }
	}

	return null
}

export const parseCliOptions = (argv: string[]): Partial<CliOptions> => {
	const options: Partial<CliOptions> = {}

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		const nextArg = argv[i + 1]

		if (arg.startsWith('-')) {
			const parsed = parseArgument(arg, nextArg)

			if (!parsed) {
				throw new BunupCLIError(`Invalid argument: ${arg}`)
			}

			const { key, value, skipNext } = parsed
			const handler = flagToHandler[key]

			if (!handler) {
				throw new BunupCLIError(`Unknown option: ${arg}`)
			}

			handler(value, options)

			if (skipNext) {
				i++
			}
		} else {
			OPTION_DEFINITIONS.entry.handler(arg, options)
		}
	}

	return options
}
