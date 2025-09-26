#!/usr/bin/env bun

import { loadConfig } from 'coffi'
import pc from 'picocolors'

import { version } from '../../package.json'
import { build } from '../build'
import { handleErrorAndExit } from '../errors'
import {
	type LoadedConfig,
	type ProcessableConfig,
	processLoadedConfigs,
} from '../loaders'
import { logger, logTime, setSilent } from '../logger'
import type { BuildOptions } from '../options'
import { ensureArray, getShortFilePath } from '../utils'
import { watch } from '../watch'
import { type CliOnlyOptions, parseCliOptions } from './options'

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

	logger.info(`Using bunup v${version} and bun v${Bun.version}`, {
		muted: true,
	})

	if (filepath) {
		logger.info(`Using ${getShortFilePath(filepath, 2)}`, {
			muted: true,
		})
	}

	logger.info('Build started')

	const startTime = performance.now()

	await Promise.all(
		configsToProcess.flatMap(({ options, rootDir }) => {
			const optionsArray = ensureArray(options)
			return optionsArray.map(async (o) => {
				const userOptions: Partial<BuildOptions> = {
					...o,
					...removeCliOnlyOptions(cliOptions),
				}

				if (userOptions.watch) {
					await watch(userOptions, rootDir)
				} else {
					await build(userOptions, rootDir)
				}
			})
		}),
	)

	const buildTimeMs = performance.now() - startTime

	logger.success(`Build completed in ${pc.green(logTime(buildTimeMs))}`)

	if (cliOptions.watch) {
		logger.info(pc.dim('Watching for file changes...'))
	}

	if (!cliOptions.watch) {
		process.exit(process.exitCode ?? 0)
	}
}

const CLI_ONLY_OPTIONS: (keyof CliOnlyOptions)[] = ['config', 'filter']

function removeCliOnlyOptions(options: CliOnlyOptions & Partial<BuildOptions>) {
	const cleanedOptions = { ...options }
	for (const option of CLI_ONLY_OPTIONS) {
		delete cleanedOptions[option]
	}
	return cleanedOptions
}

main().catch((error) => handleErrorAndExit(error))
