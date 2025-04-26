#!/usr/bin/env bun
import { exec } from 'tinyexec'
import { version } from '../package.json'
import { parseCliOptions } from './cli-parse'
import { handleErrorAndExit } from './errors'
import { logger, setSilent } from './logger'
import type { BuildOptions, CliOptions } from './options'

import { loadConfig } from 'coffi'
import { type ProcessableConfig, processLoadedConfigs } from './loaders'
import type { Arrayable, DefineConfigItem, DefineWorkspaceItem } from './types'
import { ensureArray, formatTime, getShortFilePath } from './utils'
import { watch } from './watch'

export type LoadedConfig = Arrayable<DefineConfigItem | DefineWorkspaceItem>

async function main(args: string[] = Bun.argv.slice(2)): Promise<void> {
	const cliOptions = parseCliOptions(args)

	setSilent(cliOptions.silent)

	const cwd = process.cwd()

	const { config, filepath } = await loadConfig<LoadedConfig>({
		name: 'bunup.config',
		extensions: ['.ts', '.js', '.mjs', '.cjs'],
		maxDepth: 1,
		preferredPath: cliOptions.config,
		packageJsonProperty: 'bunup',
	})

	const configsToProcess: ProcessableConfig[] = !config
		? [{ rootDir: cwd, options: cliOptions }]
		: await processLoadedConfigs(config, cwd, cliOptions.filter)

	logger.cli(`Using bunup v${version} and bun v${Bun.version}`, {
		muted: true,
	})

	if (filepath) {
		logger.cli(`Using ${getShortFilePath(filepath, 2)}`, {
			muted: true,
		})
	}

	const startTime = performance.now()

	logger.cli('Build started')

	const { build } = await import('./build')

	await Promise.all(
		configsToProcess.flatMap(({ options, rootDir }) => {
			const optionsArray = ensureArray(options)
			return optionsArray.map(async (o) => {
				const partialOptions: Partial<BuildOptions> = {
					...o,
					...removeCliOnlyOptions(cliOptions),
				}

				if (partialOptions.watch) {
					await watch(partialOptions, rootDir)
				} else {
					await build(partialOptions, rootDir)
				}
			})
		}),
	)

	const buildTimeMs = performance.now() - startTime
	const timeDisplay = formatTime(buildTimeMs)

	logger.cli(`⚡️ Build completed in ${timeDisplay}`)

	if (cliOptions.watch) {
		logger.cli('👀 Watching for file changes')
	}

	if (cliOptions.onSuccess) {
		logger.cli(`Running command: ${cliOptions.onSuccess}`, {
			muted: true,
		})

		await exec(cliOptions.onSuccess, [], {
			nodeOptions: { shell: true, stdio: 'inherit' },
		})
	}

	if (!cliOptions.watch) {
		process.exit(process.exitCode ?? 0)
	}
}

function removeCliOnlyOptions(options: Partial<CliOptions>) {
	return {
		...options,
		onSuccess: undefined,
		config: undefined,
	}
}

main().catch((error) => handleErrorAndExit(error))
