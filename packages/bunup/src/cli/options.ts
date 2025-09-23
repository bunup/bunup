import pc from 'picocolors'
import { cli, z } from 'zlye'
import { BunupCLIError } from '../errors'
import type { BuildOptions } from '../options'

export type CliOnlyOptions = {
	config: string | undefined
	filter?: string[]
}

const program = cli()
	.name('bunup')
	.version('0.11.26')
	.description(
		'A blazing-fast build tool for your TypeScript/React libraries — built on Bun',
	)
	.example([
		pc.gray(
			`${pc.blue('bunup src/index.ts')}                            # Basic build`,
		),
		pc.gray(
			`${pc.blue('bunup src/**/*.ts')}                             # Glob pattern for multiple files`,
		),
		pc.gray(
			`${pc.blue('bunup src/index.ts --watch')}                    # Watch mode`,
		),
		pc.gray(
			`${pc.blue('bunup src/index.ts --format cjs,esm')}           # Multiple formats`,
		),
		pc.gray(
			`${pc.blue('bunup src/index.ts --target bun')}               # Bun target`,
		),
		pc.gray(
			`${pc.blue('bunup src/index.ts src/cli.ts --outDir build')}  # Multiple entries`,
		),
		pc.gray(
			`${pc.blue('bunup src/index.ts --dts.splitting')}            # Declaration splitting`,
		),
		pc.gray(
			`${pc.blue('bunup src/index.ts --no-clean')}                 # Disable cleaning output directory before build`,
		),
	])

	.option(
		'entry',
		z
			.union(
				z.string().describe('Entry file or glob pattern'),
				z.array(z.string()).describe('Multiple entry files or globs'),
			)
			.alias('e')
			.optional(),
	)
	.option(
		'config',
		z
			.string()
			.describe('Path to configuration file')
			.alias('c')
			.example('./configs/custom.bunup.config.js')
			.optional(),
	)
	.option(
		'filter',
		z
			.array(z.string())
			.describe('Filter workspace packages by name')
			.optional(),
	)

	.option(
		'name',
		z
			.string()
			.describe(
				'Name of the build configuration (for logging and identification)',
			)
			.example('my-library')
			.optional(),
	)
	.option(
		'outDir',
		z
			.string()
			.describe('Output directory for bundled files')
			.alias('o')
			.default('dist'),
	)
	.option(
		'format',
		z
			.union(
				z
					.string()
					.choices(['esm', 'cjs', 'iife'])
					.describe('Single output format'),
				z
					.array(z.string().choices(['esm', 'cjs', 'iife']))
					.describe('Multiple output formats'),
			)
			.alias('f')
			.default('esm'),
	)

	.option(
		'minify',
		z
			.boolean()
			.describe(
				'Enable all minification options (whitespace, identifiers, syntax)',
			)
			.optional(),
	)
	.option(
		'minifyWhitespace',
		z
			.boolean()
			.describe('Minify whitespace in the output to reduce file size')
			.optional(),
	)
	.option(
		'minifyIdentifiers',
		z
			.boolean()
			.describe('Minify identifiers by renaming variables to shorter names')
			.optional(),
	)
	.option(
		'minifySyntax',
		z
			.boolean()
			.describe('Minify syntax by optimizing code structure')
			.optional(),
	)

	.option(
		'watch',
		z
			.boolean()
			.describe('Watch for file changes and rebuild automatically')
			.optional(),
	)
	.option(
		'clean',
		z
			.boolean()
			.describe('Clean the output directory before building')
			.default(true),
	)
	.option(
		'silent',
		z
			.boolean()
			.describe('Disable logging during the build process')
			.alias('q')
			.optional(),
	)

	.option(
		'splitting',
		z
			.boolean()
			.describe(
				'Enable code splitting; this is enabled by default for the ESM format',
			)
			.optional(),
	)
	.option(
		'conditions',
		z
			.array(z.string())
			.describe('Package.json export conditions for import resolution')
			.optional(),
	)
	.option(
		'target',
		z
			.string()
			.choices(['bun', 'node', 'browser'])
			.describe('Target environment for the bundle')
			.alias('t')
			.default('node'),
	)
	.option(
		'external',
		z
			.array(z.string())
			.describe('External packages that should not be bundled')
			.optional(),
	)
	.option(
		'noExternal',
		z
			.array(z.string())
			.describe('Packages that should be bundled even if listed in external')
			.optional(),
	)

	.option(
		'dts',
		z
			.union(
				z.boolean().describe('Generate TypeScript declaration files (.d.ts)'),
				z.object({
					entry: z
						.union(
							z
								.string()
								.describe('Single entrypoint for declaration file generation'),
							z
								.array(z.string())
								.describe(
									'Multiple entrypoints for declaration file generation',
								),
						)
						.optional(),
					resolve: z
						.union(
							z.boolean().describe('Resolve types from dependencies'),
							z
								.array(z.string())
								.describe(
									'Names or patterns of packages from which to resolve types',
								),
						)
						.optional(),
					splitting: z
						.boolean()
						.describe('Enable declaration file splitting')
						.optional(),
					minify: z
						.boolean()
						.describe('Minify generated declaration files')
						.optional(),
				}),
			)
			.default(true),
	)
	.option(
		'preferredTsconfigPath',
		z
			.string()
			.describe('Path to preferred tsconfig.json for declaration generation')
			.example('./tsconfig.build.json')
			.optional(),
	)

	.option(
		'sourcemap',
		z
			.union(
				z
					.boolean()
					.describe('Generate a sourcemap (uses the inline type by default)'),
				z
					.string()
					.choices(['none', 'linked', 'inline', 'external'])
					.describe('Generate a sourcemap with a specific type'),
			)
			.optional(),
	)

	.option(
		'define',
		z
			.object(z.string())
			.describe('Define global constants replaced at build time')
			.example('--define.PACKAGE_VERSION=\'"1.0.0"\'')
			.optional(),
	)
	.option(
		'env',
		z
			.union(
				z
					.string()
					.choices(['inline', 'disable'])
					.describe('inline: inject all, disable: inject none'),
				z
					.string()
					.regex(/\*$/, 'Environment prefix must end with *')
					.describe('Inject env vars with this prefix')
					.example('MYAPP_*')
					.transform((val) => val as `${string}*`),
				z
					.object(z.string())
					.describe('Explicit env var mapping')
					.example(
						'--env.NODE_ENV="production" --env.API_URL="https://api.example.com"',
					),
			)
			.optional(),
	)
	.option(
		'banner',
		z
			.string()
			.describe('Banner text added to the top of bundle files')
			.optional(),
	)
	.option(
		'footer',
		z
			.string()
			.describe('Footer text added to the bottom of bundle files')
			.optional(),
	)
	.option(
		'drop',
		z
			.array(z.string())
			.describe('Remove function calls from bundle')
			.example('--drop console,debugger')
			.optional(),
	)

	.option(
		'loader',
		z
			.object(
				z
					.string()
					.choices([
						'js',
						'jsx',
						'ts',
						'tsx',
						'json',
						'toml',
						'file',
						'napi',
						'wasm',
						'text',
						'css',
						'html',
					]),
			)
			.describe('File extension to loader mapping')
			.optional(),
	)
	.option(
		'publicPath',
		z
			.string()
			.describe('Public path prefix for assets and chunk files')
			.example('https://cdn.example.com/')
			.optional(),
	)

	.option(
		'ignoreDCEAnnotations',
		z
			.boolean()
			.describe(
				'Ignore dead code elimination annotations (@__PURE__, sideEffects)',
			),
	)
	.option(
		'emitDCEAnnotations',
		z
			.boolean()
			.describe('Force emit @__PURE__ annotations even with minification'),
	)

	.option(
		'onSuccess',
		z.string().describe('Command to run after successful build').optional(),
	)

	.option(
		'css',
		z
			.object({
				typedModules: z
					.boolean()
					.describe('Generate TypeScript definitions for CSS modules'),
			})
			.default({
				typedModules: true,
			}),
	)
	.rest('entries', z.string().describe('Entry point files to bundle'))

export const parseCliOptions = (
	argv: string[],
): CliOnlyOptions & BuildOptions => {
	const result = program.parse(argv)

	if (!result) {
		throw new BunupCLIError('Failed to parse CLI options')
	}

	const { options, rest } = result

	const parsedOptions: CliOnlyOptions & BuildOptions = {
		...options,
		entry: rest.length > 0 ? rest : 'src/index.ts',
	}

	return parsedOptions
}
