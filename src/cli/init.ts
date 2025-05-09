import fs from 'node:fs/promises'
import path from 'node:path'
import {
	cancel,
	confirm,
	intro,
	isCancel,
	log,
	multiselect,
	outro,
	tasks,
	text,
} from '@clack/prompts'
import { loadConfig } from 'coffi'
import {
	type Agent,
	type DetectResult,
	type ResolvedCommand,
	detect as detectPackageManager,
	resolveCommand,
} from 'package-manager-detector'
import pc from 'picocolors'
import { exec } from 'tinyexec'

interface WorkspaceEntry {
	name: string
	root: string
	entries: string[]
}

interface PluginOption {
	value: string
	label: string
	hint?: string
	configGenerator?: () => string
	defaultEnabled?: boolean
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath)
		return true
	} catch {
		return false
	}
}

async function checkExistingConfig(): Promise<{
	exists: boolean
	filepath?: string
}> {
	const { config, filepath } = await loadConfig({
		name: 'bunup.config',
		extensions: ['.ts', '.js', '.mjs', '.cjs'],
		maxDepth: 1,
		packageJsonProperty: 'bunup',
	})

	return {
		exists: !!config,
		filepath: filepath || undefined,
	}
}

export async function init(): Promise<void> {
	intro(pc.bgCyan(pc.black(' Bunup ')))
	await configureTsconfig()

	const { exists: configExists, filepath: configPath } =
		await checkExistingConfig()
	if (configExists) {
		const shouldContinue = await confirm({
			message: `A bunup configuration already exists at ${pc.cyan(configPath || 'bunup.config.ts')}. Continue and overwrite it?`,
			initialValue: false,
		})

		if (isCancel(shouldContinue) || !shouldContinue) {
			cancel('Initialization cancelled')
			process.exit(1)
		}
	}

	const packageManager = await detectPackageManager()

	if (!packageManager) {
		log.error('No package manager detected')
		process.exit(1)
	}

	const { config: packageJson, filepath: packageJsonPath } =
		await loadConfig<any>({
			name: 'package',
			cwd: process.cwd(),
			extensions: ['.json'],
		})

	if (!packageJson || !packageJsonPath) {
		log.error('Cannot find package.json.')
		process.exit(1)
	}

	const entryPoint = await text({
		message: 'Entry point for your library:',
		placeholder: 'src/index.ts',
		defaultValue: 'src/index.ts',
	})

	if (isCancel(entryPoint)) {
		cancel('Initialization cancelled')
		process.exit(1)
	}

	const entryPointPath = path.join(process.cwd(), String(entryPoint))
	if (!(await pathExists(entryPointPath))) {
		const createEntry = await confirm({
			message: `Entry file ${pc.cyan(String(entryPoint))} does not exist. Create it?`,
			initialValue: true,
		})

		if (isCancel(createEntry)) {
			cancel('Initialization cancelled')
			process.exit(1)
		}

		if (createEntry) {
			await fs.mkdir(path.dirname(entryPointPath), { recursive: true })
			await fs.writeFile(
				entryPointPath,
				`// Your entry point\n\nexport function hello() {\n  return 'Hello from ${path.basename(String(entryPoint))}';\n}\n`,
			)
			log.success(`Created ${entryPoint}`)
		}
	}

	const formats = await multiselect({
		message: 'Output formats:',
		options: [
			{ value: 'esm', label: 'ESM', hint: 'ECMAScript modules' },
			{ value: 'cjs', label: 'CJS', hint: 'CommonJS modules' },
			{
				value: 'iife',
				label: 'IIFE',
				hint: 'Immediately Invoked Function Expression',
			},
		],
		initialValues: ['esm', 'cjs'],
		required: true,
	})

	if (isCancel(formats)) {
		cancel('Initialization cancelled')
		process.exit(1)
	}

	const outDir = await text({
		message: 'Output directory:',
		placeholder: 'dist',
		initialValue: 'dist',
		validate: (value) =>
			value ? undefined : 'Output directory is required',
	})

	if (isCancel(outDir)) {
		cancel('Initialization cancelled')
		process.exit(1)
	}

	const generateDts = await confirm({
		message: 'Generate TypeScript declarations (.d.ts files)?',
		initialValue: true,
	})

	if (isCancel(generateDts)) {
		cancel('Initialization cancelled')
		process.exit(1)
	}

	let hasWorkspaces = false
	const workspaceEntries: WorkspaceEntry[] = []

	if (packageJson.workspaces) {
		const workspacesConfirm = await confirm({
			message: 'Detected workspaces. Set up Bunup for multiple packages?',
			initialValue: true,
		})

		if (isCancel(workspacesConfirm)) {
			cancel('Initialization cancelled')
			process.exit(1)
		}

		hasWorkspaces = workspacesConfirm
		if (hasWorkspaces) {
			const collectWorkspace =
				async (): Promise<WorkspaceEntry | null> => {
					const name = await text({
						message: 'Workspace name:',
						placeholder: 'core',
						validate: (value) =>
							value ? undefined : 'Workspace name is required',
					})

					if (isCancel(name)) return null

					const root = await text({
						message: 'Workspace root directory:',
						placeholder: 'packages/core',
						validate: (value) =>
							value ? undefined : 'Workspace root is required',
					})

					if (isCancel(root)) return null

					const entriesInput = await text({
						message: 'Workspace entry points (comma-separated):',
						placeholder: 'src/index.ts',
						validate: (value) =>
							value
								? undefined
								: 'At least one entry point is required',
					})

					if (isCancel(entriesInput)) return null

					return {
						name: String(name),
						root: String(root),
						entries: String(entriesInput)
							.split(',')
							.map((e) => e.trim()),
					}
				}

			let addMore = true
			while (addMore) {
				const workspace = await collectWorkspace()
				if (!workspace) break

				workspaceEntries.push(workspace)

				for (const entry of workspace.entries) {
					const entryPath = path.join(
						process.cwd(),
						workspace.root,
						entry,
					)
					if (!(await pathExists(entryPath))) {
						const createEntry = await confirm({
							message: `Entry file ${pc.cyan(`${workspace.root}/${entry}`)} does not exist. Create it?`,
							initialValue: true,
						})

						if (isCancel(createEntry)) break

						if (createEntry) {
							await fs.mkdir(path.dirname(entryPath), {
								recursive: true,
							})
							await fs.writeFile(
								entryPath,
								`// Your entry point\n\nexport function hello() {\n  return 'Hello from ${workspace.name}';\n}\n`,
							)
							log.success(`Created ${workspace.root}/${entry}`)
						}
					}
				}

				const addMoreConfirm = await confirm({
					message: 'Add another workspace?',
					initialValue: false,
				})

				if (isCancel(addMoreConfirm)) break
				addMore = addMoreConfirm
			}
		}
	}

	const availablePlugins: PluginOption[] = [
		{
			value: 'report',
			label: 'Report',
			hint: 'Logs bundle size report after build',
			configGenerator: () => 'report()',
			defaultEnabled: true,
		},
	]

	const selectedPlugins = await multiselect({
		message: 'Select plugins to use (optional):',
		options: availablePlugins,
		required: false,
		initialValues: availablePlugins
			.filter((p) => p.defaultEnabled)
			.map((p) => p.value),
	})

	if (isCancel(selectedPlugins)) {
		cancel('Initialization cancelled')
		process.exit(1)
	}

	if (hasWorkspaces && workspaceEntries.length > 0) {
		await createWorkspaceConfig(
			workspaceEntries,
			formats as string[],
			String(outDir),
			generateDts,
			selectedPlugins as string[],
			availablePlugins,
			configPath || undefined,
		)
	} else {
		await createSimpleConfig(
			String(entryPoint),
			formats as string[],
			String(outDir),
			generateDts,
			selectedPlugins as string[],
			availablePlugins,
			configPath || undefined,
		)
	}

	await configureTsconfig()

	log.success('Configuration generated')

	await updatePackageJson(packageJson, packageJsonPath)
	log.success('package.json updated')

	const setupTasks = [
		{
			title: 'Installing bunup',
			task: async () => {
				await installBunup(packageJson, packageManager)
				return 'Bunup installed'
			},
		},
	]

	try {
		await tasks(setupTasks)
	} catch (error) {
		log.error(
			`Error: ${error instanceof Error ? error.message : String(error)}`,
		)
		process.exit(1)
	}

	const devCommand = resolveCommand(packageManager.agent, 'run', ['dev'])
	const buildCommand = resolveCommand(packageManager.agent, 'run', ['build'])

	outro(`
    ${pc.bold('🚀 Happy building with Bunup!')}
    
    Run these commands to get started:
	${pc.cyan(getCommand(buildCommand))} - ${pc.gray('Build your project')}
	${pc.cyan(getCommand(devCommand))}   - ${pc.gray('Build in watch mode')}
    
    ${pc.dim('Edit')} ${pc.underline('bunup.config.ts')} ${pc.dim('to customize your build.')}
	`)
}

async function createSimpleConfig(
	entry: string,
	formats: string[],
	outDir: string,
	dts: boolean,
	plugins: string[],
	availablePlugins: PluginOption[],
	configPath: string = path.join(process.cwd(), 'bunup.config.ts'),
) {
	const pluginsConfig = generatePluginsConfig(plugins, availablePlugins)
	const configContent = `import { defineConfig } from 'bunup';
${plugins.length > 0 ? `import { ${plugins.join(', ')} } from 'bunup/plugins';\n` : ''}
export default defineConfig({
	entry: '${entry}',
	format: [${formats.map((f) => `'${f}'`).join(', ')}],
	outDir: '${outDir}',${dts ? '\n	dts: true,' : ''}${pluginsConfig ? `\n	plugins: [${pluginsConfig}],` : ''}
});
`
	await fs.writeFile(configPath, configContent)
}

async function createWorkspaceConfig(
	workspaces: WorkspaceEntry[],
	formats: string[],
	outDir: string,
	dts: boolean,
	plugins: string[],
	availablePlugins: PluginOption[],
	configPath: string = path.join(process.cwd(), 'bunup.config.ts'),
) {
	const pluginsConfig = generatePluginsConfig(plugins, availablePlugins)
	const workspaceConfigs = workspaces
		.map((ws) => {
			const entries =
				ws.entries.length === 1
					? `'${ws.entries[0]}'`
					: `[${ws.entries.map((e) => `'${e}'`).join(', ')}]`
			return `	{
		name: '${ws.name}',
		root: '${ws.root}',
		config: {
			entry: ${entries},
			format: [${formats.map((f) => `'${f}'`).join(', ')}],
			outDir: '${outDir}',${dts ? '\n			dts: true,' : ''}${pluginsConfig ? `\n			plugins: [${pluginsConfig}],` : ''}
		},
	}`
		})
		.join(',\n')

	const configContent = `import { defineWorkspace } from 'bunup';
${plugins.length > 0 ? `import { ${plugins.join(', ')} } from 'bunup/plugins';\n` : ''}
export default defineWorkspace([
${workspaceConfigs}
]);
`
	await fs.writeFile(configPath, configContent)
}

function generatePluginsConfig(
	plugins: string[],
	availablePlugins: PluginOption[],
): string {
	return availablePlugins
		.filter((plugin) => plugins.includes(plugin.value))
		.map((plugin) =>
			plugin.configGenerator
				? plugin.configGenerator()
				: `${plugin.value}()`,
		)
		.join(', ')
}

async function updatePackageJson(packageJson: any, packageJsonPath: string) {
	const scripts = packageJson.scripts || {}
	let updateScripts = false

	for (const [script, command] of [
		['build', 'bunup'],
		['dev', 'bunup --watch'],
	]) {
		if (
			!scripts[script] ||
			(await confirm({
				message: `Script '${script}' exists. Replace with '${command}'?`,
				initialValue: true,
			}))
		) {
			scripts[script] = command
			updateScripts = true
		}
	}

	if (updateScripts) {
		packageJson.scripts = scripts
		await fs.writeFile(
			packageJsonPath,
			JSON.stringify(packageJson, null, 2),
		)
	}
}

async function installBunup(packageJson: any, packageManager: DetectResult) {
	const hasDep =
		packageJson.dependencies?.bunup || packageJson.devDependencies?.bunup
	if (hasDep) {
		log.info('Bunup is already installed\n')
		return
	}

	const devFlag: Partial<Record<Agent, string>> = {
		bun: '-d',
		npm: '-D',
		pnpm: '-D',
		yarn: '-D',
	}

	const installCommand = resolveCommand(packageManager.agent, 'add', [
		devFlag[packageManager.agent] || '-D',
		'bunup',
	])

	if (!installCommand) throw new Error('Failed to resolve install command')

	await exec(getCommand(installCommand), [], {
		nodeOptions: { shell: true, stdio: 'pipe' },
	})
}

function getCommand(command: ResolvedCommand | null) {
	if (!command) return ''
	return `${command.command} ${command.args.join(' ')}`
}

async function configureTsconfig(): Promise<void> {
	let tsconfig: any = {}
	let tsconfigExists = false
	let tsconfigPath = path.join(process.cwd(), 'tsconfig.json')

	try {
		const { config, filepath } = await loadConfig<any>({
			name: 'tsconfig',
			cwd: process.cwd(),
			extensions: ['.json'],
		})
		if (config && filepath) {
			tsconfig = config
			tsconfigExists = true
			tsconfigPath = filepath
		}
	} catch {}

	const isolatedAlreadyEnabled =
		tsconfig.compilerOptions?.isolatedDeclarations === true

	if (!isolatedAlreadyEnabled) {
		log.info(
			`${pc.cyan('About isolatedDeclarations:')} ${pc.gray(`A ${pc.bold('modern TypeScript feature')} for library authors`)}`,
		)
		log.info(
			pc.gray(
				`Benefits: ${pc.bold('faster builds')}, ${pc.bold('more reliable API types')}, and ${pc.bold('better editor support')} to catch issues during development`,
			),
		)

		const enableIsolated = await confirm({
			message:
				'Enable isolatedDeclarations in tsconfig.json? (recommended but optional)',
			initialValue: true,
		})

		if (isCancel(enableIsolated)) {
			return
		}

		if (enableIsolated) {
			tsconfig.compilerOptions = tsconfig.compilerOptions || {}
			tsconfig.compilerOptions.isolatedDeclarations = true
			tsconfig.compilerOptions.declaration = true

			if ('allowJs' in tsconfig.compilerOptions) {
				tsconfig.compilerOptions.allowJs = null
			}

			tsconfig.exclude = tsconfig.exclude || []
			if (!tsconfig.exclude.includes('bunup.config.ts')) {
				tsconfig.exclude.push('bunup.config.ts')
			}

			await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2))

			log.success('Updated tsconfig.json with isolatedDeclarations')
		}
	} else if (tsconfigExists) {
		tsconfig.exclude = tsconfig.exclude || []
		if (!tsconfig.exclude.includes('bunup.config.ts')) {
			tsconfig.exclude.push('bunup.config.ts')
			await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2))
		}
	}
}
