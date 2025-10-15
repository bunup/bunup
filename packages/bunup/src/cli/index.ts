#!/usr/bin/env bun

import { type LoadConfigResult, loadConfig } from 'coffi'
import pc from 'picocolors'

import { version } from '../../package.json'
import { build } from '../build'
import { handleErrorAndExit } from '../errors'
import {
	type LoadedConfig,
	type ProcessableConfig,
	processLoadedConfigs,
} from '../loaders'
import type { BuildOptions } from '../options'
import type { BuildOutput } from '../plugins/types'
import { logger, logTime } from '../printer/logger'
import { printBuildReport } from '../printer/print-build-report'
import { ensureArray } from '../utils/common'
import { getShortFilePath } from '../utils/path'
import { watch } from '../watch'
import { type CliOnlyOptions, parseCliOptions } from './options'

async function main(args: string[] = Bun.argv.slice(2)): Promise<void> {
	const cliOptions = parseCliOptions(args)

	const cwd = process.cwd()

	let loadedConfig: LoadConfigResult<LoadedConfig> | undefined

	if (cliOptions.config !== false) {
		loadedConfig = await loadConfig<LoadedConfig>({
			name: 'bunup.config',
			extensions: ['.ts', '.js', '.mjs', '.cjs'],
			maxDepth: 1,
			preferredPath:
				typeof cliOptions.config === 'string' ? cliOptions.config : undefined,
			packageJsonProperty: 'bunup',
		})
	}

	const { config, filepath } = loadedConfig ?? {}

	const configsToProcess: ProcessableConfig[] = !config
		? [{ rootDir: cwd, options: cliOptions }]
		: await processLoadedConfigs(config, cwd, cliOptions.filter)

	const shouldSilent =
		cliOptions.watch ||
		cliOptions.silent ||
		configsToProcess.some((c) => ensureArray(c.options).some((o) => o.silent))

	if (shouldSilent) {
		logger.setSilent(true)
	}

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

	const buildOutputs: BuildOutput[] = []

	await Promise.all(
		configsToProcess.flatMap(({ options, rootDir }) => {
			const optionsArray = ensureArray(options)
			return optionsArray.map(async (o) => {
				const userOptions: Partial<BuildOptions> = {
					...o,
					...removeCliOnlyOptions(cliOptions),
				}

				if (userOptions.watch) {
					await watch(userOptions, rootDir, filepath)
				} else {
					buildOutputs.push(await build(userOptions, rootDir))
				}
			})
		}),
	)

	const buildTimeMs = performance.now() - startTime

	if (!cliOptions.watch && !shouldSilent) {
		await Promise.all(buildOutputs.map((o) => printBuildReport(o)))
	}

	if (cliOptions.watch) {
		console.log(
			`\n  ${pc.bgMagentaBright(' WATCH ')} Watching for file changes...\n`,
		)
	}

	logger.space()
	logger.success(`Build completed in ${pc.green(logTime(buildTimeMs))}`)
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
