import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { BuildOptions } from '../../src/options'
import type { BuildContext, BunupPlugin } from '../../src/plugins/types'
import {
	cleanProjectDir,
	createProject,
	runBuild,
	validateBuildFiles,
} from '../utils'

describe('Bunup Plugin', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	it('should call onBuildStart hook when build starts', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const onBuildStartMock = mock(() => {})

		const testPlugin: BunupPlugin = {
			name: 'test-start-plugin',
			hooks: {
				onBuildStart: onBuildStartMock,
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [testPlugin],
		})

		expect(result.success).toBe(true)
		expect(onBuildStartMock).toHaveBeenCalledTimes(1)
		expect(onBuildStartMock).toHaveBeenCalledWith(
			expect.objectContaining({
				entry: 'src/index.ts',
				format: 'esm',
			}),
		)
	})

	it('should call onBuildDone hook when build completes', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const onBuildDoneMock = mock(() => {})

		const testPlugin: BunupPlugin = {
			name: 'test-done-plugin',
			hooks: {
				onBuildDone: onBuildDoneMock,
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [testPlugin],
		})

		expect(result.success).toBe(true)
		expect(onBuildDoneMock).toHaveBeenCalledTimes(1)
		expect(onBuildDoneMock).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.any(Object),
				output: expect.objectContaining({
					files: expect.arrayContaining([
						expect.objectContaining({
							fullPath: expect.stringContaining('index.mjs'),
						}),
					]),
				}),
			}),
		)
	})

	it('should call both onBuildStart and onBuildDone hooks in the correct order', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const callOrder: string[] = []

		const testPlugin: BunupPlugin = {
			name: 'test-both-hooks-plugin',
			hooks: {
				onBuildStart: mock(() => {
					callOrder.push('onBuildStart')
				}),
				onBuildDone: mock(() => {
					callOrder.push('onBuildDone')
				}),
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [testPlugin],
		})

		expect(result.success).toBe(true)
		expect(callOrder).toEqual(['onBuildStart', 'onBuildDone'])
	})

	it('should execute hooks from multiple plugins in the correct order', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const callOrder: string[] = []

		const firstPlugin: BunupPlugin = {
			name: 'first-plugin',
			hooks: {
				onBuildStart: mock(() => {
					callOrder.push('first-start')
				}),
				onBuildDone: mock(() => {
					callOrder.push('first-done')
				}),
			},
		}

		const secondPlugin: BunupPlugin = {
			name: 'second-plugin',
			hooks: {
				onBuildStart: mock(() => {
					callOrder.push('second-start')
				}),
				onBuildDone: mock(() => {
					callOrder.push('second-done')
				}),
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [firstPlugin, secondPlugin],
		})

		expect(result.success).toBe(true)
		expect(callOrder).toEqual([
			'first-start',
			'second-start',
			'first-done',
			'second-done',
		])
	})

	it('should handle async plugin hooks correctly', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const callOrder: string[] = []

		const testPlugin: BunupPlugin = {
			name: 'async-plugin',
			hooks: {
				onBuildStart: mock(async () => {
					callOrder.push('start')
					await new Promise((resolve) => setTimeout(resolve, 50))
					callOrder.push('start-after-delay')
				}),
				onBuildDone: mock(async () => {
					callOrder.push('done')
					await new Promise((resolve) => setTimeout(resolve, 50))
					callOrder.push('done-after-delay')
				}),
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [testPlugin],
		})

		expect(result.success).toBe(true)
		expect(callOrder).toEqual([
			'start',
			'start-after-delay',
			'done',
			'done-after-delay',
		])
	})

	it('should handle both bunup and bun plugins', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const bunupHookCalled = mock(() => {})

		const bunupPlugin: BunupPlugin = {
			name: 'bunup-specific-plugin',
			hooks: {
				onBuildStart: bunupHookCalled,
				onBuildDone: bunupHookCalled,
			},
		}

		const bunPluginSetupMock = mock(() => {})
		const bunPlugin = {
			name: 'bun-plugin',
			setup: bunPluginSetupMock,
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [bunupPlugin, bunPlugin],
		})

		expect(result.success).toBe(true)
		expect(bunupHookCalled).toHaveBeenCalledTimes(2)
	})

	it('should allow plugin to modify build options during onBuildStart', async () => {
		createProject({
			'src/index.ts': 'export const x = 1;',
			'src/additional.ts': 'export const y = 2;',
		})

		const testPlugin: BunupPlugin = {
			name: 'options-modifier-plugin',
			hooks: {
				onBuildStart: mock((options: BuildOptions) => {
					options.banner = '/* Modified by plugin */'
				}),
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [testPlugin],
		})

		expect(result.success).toBe(true)
		expect(result.files[0].content).toContain('/* Modified by plugin */')
	})

	it('should handle errors in plugin hooks', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const errorPlugin: BunupPlugin = {
			name: 'error-plugin',
			hooks: {
				onBuildStart: mock(() => {
					throw new Error('Test error from plugin')
				}),
			},
		}

		const { error } = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [errorPlugin],
		})

		expect(error).toBeDefined()
		expect(error?.message).toContain('Test error from plugin')
	})

	it('should provide plugins access to build output in onBuildDone', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		let outputFiles: string[] = []

		const outputAccessPlugin: BunupPlugin = {
			name: 'output-access-plugin',
			hooks: {
				onBuildDone: mock((ctx: BuildContext) => {
					outputFiles = ctx.output.files.map((file) => file.fullPath)
				}),
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [outputAccessPlugin],
		})

		expect(result.success).toBe(true)
		expect(outputFiles.length).toBeGreaterThan(0)
		expect(outputFiles[0]).toContain('index.mjs')
	})

	it('should handle plugins with empty hooks object', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const emptyPlugin: BunupPlugin = {
			name: 'empty-plugin',
			hooks: {},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [emptyPlugin],
		})

		expect(result.success).toBe(true)
		expect(validateBuildFiles(result, { expectedFiles: ['index.mjs'] })).toBe(
			true,
		)
	})

	it('should correctly set entrypoint for entry-point files in output', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		let buildContext: BuildContext | undefined

		const entrypointCheckPlugin: BunupPlugin = {
			name: 'entrypoint-check-plugin',
			hooks: {
				onBuildDone: mock((ctx: BuildContext) => {
					buildContext = ctx
				}),
			},
		}

		await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [entrypointCheckPlugin],
		})

		expect(buildContext).toBeDefined()

		const entryPointFile = buildContext.output.files.find(
			(file) =>
				file.kind === 'entry-point' && file.fullPath.endsWith('index.mjs'),
		)

		expect(entryPointFile).toBeDefined()
		expect(entryPointFile.entrypoint).toBe('src/index.ts')
		expect(entryPointFile.format).toBe('esm')
	})

	it('should correctly handle multiple entrypoints in output files', async () => {
		createProject({
			'src/index.ts': 'export const x = 1;',
			'src/other.ts': 'export const y = 2;',
		})

		let buildContext: BuildContext | undefined

		const multiEntrypointPlugin: BunupPlugin = {
			name: 'multi-entrypoint-plugin',
			hooks: {
				onBuildDone: mock((ctx: BuildContext) => {
					buildContext = ctx
				}),
			},
		}

		await runBuild({
			entry: ['src/index.ts', 'src/other.ts'],
			format: 'esm',
			plugins: [multiEntrypointPlugin],
		})

		expect(buildContext).toBeDefined()

		const entryPointFiles = buildContext.output.files.filter(
			(file) => file.kind === 'entry-point',
		)

		expect(entryPointFiles.length).toBe(2)

		const indexFile = entryPointFiles.find((file) =>
			file.fullPath.endsWith('index.mjs'),
		)
		const otherFile = entryPointFiles.find((file) =>
			file.fullPath.endsWith('other.mjs'),
		)

		expect(indexFile).toBeDefined()
		expect(otherFile).toBeDefined()
		expect(indexFile.entrypoint).toBe('src/index.ts')
		expect(otherFile.entrypoint).toBe('src/other.ts')
	})

	it('should generate chunk files with undefined entrypoints when code splitting is enabled', async () => {
		createProject({
			'src/shared.ts':
				'export const shared: { value: number } = { value: 42 };',
			'src/index.ts': 'export { shared } from "./shared";',
			'src/other.ts': 'export { shared } from "./shared";',
		})

		let buildContext: BuildContext | undefined

		const chunkCheckPlugin: BunupPlugin = {
			name: 'chunk-check-plugin',
			hooks: {
				onBuildDone: mock((ctx: BuildContext) => {
					buildContext = ctx
				}),
			},
		}

		await runBuild({
			entry: ['src/index.ts', 'src/other.ts'],
			format: 'esm',
			splitting: true,
			plugins: [chunkCheckPlugin],
		})

		expect(buildContext).toBeDefined()

		const entryPointFiles = buildContext.output.files.filter(
			(file) => file.kind === 'entry-point',
		)
		expect(entryPointFiles.length).toBe(2)

		const indexFile = entryPointFiles.find((file) =>
			file.fullPath.includes('index.mjs'),
		)
		const otherFile = entryPointFiles.find((file) =>
			file.fullPath.includes('other.mjs'),
		)

		expect(indexFile).toBeDefined()
		expect(otherFile).toBeDefined()
		expect(indexFile.entrypoint).toBe('src/index.ts')
		expect(otherFile.entrypoint).toBe('src/other.ts')

		const chunkFiles = buildContext.output.files.filter(
			(file) => file.kind === 'chunk',
		)
		expect(chunkFiles.length).toBeGreaterThan(0)
		expect(chunkFiles.every((file) => file.entrypoint === undefined)).toBe(true)
	})

	it('should generate dts chunk files with undefined entrypoints when dts splitting is enabled', async () => {
		createProject({
			'src/shared.ts': 'export interface Shared { value: number }',
			'src/index.ts': 'export { Shared } from "./shared";',
			'src/other.ts': 'export { Shared } from "./shared";',
		})

		let buildContext: BuildContext | undefined

		const dtsChunkPlugin: BunupPlugin = {
			name: 'dts-chunk-plugin',
			hooks: {
				onBuildDone: mock((ctx: BuildContext) => {
					buildContext = ctx
				}),
			},
		}

		await runBuild({
			entry: ['src/index.ts', 'src/other.ts'],
			format: 'esm',
			splitting: true,
			dts: {
				splitting: true,
			},
			plugins: [dtsChunkPlugin],
		})

		expect(buildContext).toBeDefined()

		const dtsFiles = buildContext.output.files.filter((file) => file.dts)
		expect(dtsFiles.length).toBeGreaterThan(0)

		const dtsEntryPoints = dtsFiles.filter(
			(file) => file.kind === 'entry-point',
		)
		expect(dtsEntryPoints.length).toBe(2)

		const indexDtsFile = dtsEntryPoints.find((file) =>
			file.fullPath.includes('index.d.mts'),
		)
		const otherDtsFile = dtsEntryPoints.find((file) =>
			file.fullPath.includes('other.d.mts'),
		)

		expect(indexDtsFile).toBeDefined()
		expect(otherDtsFile).toBeDefined()
		expect(indexDtsFile.entrypoint).toBe('src/index.ts')
		expect(otherDtsFile.entrypoint).toBe('src/other.ts')

		const dtsChunks = dtsFiles.filter((file) => file.kind === 'chunk')
		expect(dtsChunks.length).toBeGreaterThan(0)
		expect(dtsChunks.every((file) => file.entrypoint === undefined)).toBe(true)
	})

	it('should correctly map entrypoints in complex projects with multiple shared modules', async () => {
		createProject({
			'src/types.ts': `
				export interface BaseConfig {
					name: string;
					version: string;
				}

				export interface ExtendedConfig extends BaseConfig {
					features: string[];
				}
			`,
			'src/utils.ts': `
				import { BaseConfig } from './types';

				export function formatConfig(config: BaseConfig): string {
					return \`\${config.name}@\${config.version}\`;
				}

				export const shared = {
					value: 100,
					multiply: (x: number) => x * shared.value
				};
			`,
			'src/constants.ts': `
				export const APP_VERSION = '1.0.0';
				export const API_ENDPOINT = '/api/v1';
			`,

			'src/main.ts': `
				import { formatConfig } from './utils';
				import { ExtendedConfig } from './types';
				import { APP_VERSION } from './constants';

				export function createMainConfig(): ExtendedConfig | undefined {
					return {
						name: 'main',
						version: APP_VERSION,
						features: ['core']
					};
				}

				export function printMainConfig(config: ExtendedConfig): string | undefined {
					return formatConfig(config) + ' with ' + config.features.join(', ');
				}
			`,
			'src/admin.ts': `
				import { formatConfig, shared } from './utils';
				import { ExtendedConfig } from './types';
				import { APP_VERSION, API_ENDPOINT } from './constants';

				export function createAdminConfig(): ExtendedConfig {
					return {
						name: 'admin',
						version: APP_VERSION,
						features: ['admin-panel', 'users-management']
					};
				}

				export function getAdminValue(): number | undefined {
					return shared.multiply(2);
				}

				export const ADMIN_API: string = API_ENDPOINT + '/admin';
			`,
			'src/client.ts': `
				import { BaseConfig } from './types';
				import { API_ENDPOINT } from './constants';

				export function createClientConfig(): BaseConfig {
					return {
						name: 'client',
						version: '1.0.0'
					};
				}

				export const CLIENT_API: string = API_ENDPOINT + '/client';
			`,
		})

		let buildContext: BuildContext | undefined

		const complexProjectPlugin: BunupPlugin = {
			name: 'complex-project-plugin',
			hooks: {
				onBuildDone: mock((ctx: BuildContext) => {
					buildContext = ctx
				}),
			},
		}

		await runBuild({
			entry: ['src/main.ts', 'src/admin.ts', 'src/client.ts'],
			format: 'esm',
			splitting: true,
			dts: {
				splitting: true,
			},
			plugins: [complexProjectPlugin],
		})

		expect(buildContext).toBeDefined()

		const entryPointFiles = buildContext.output.files.filter(
			(file) => file.kind === 'entry-point' && !file.dts,
		)
		const chunkFiles = buildContext.output.files.filter(
			(file) => file.kind === 'chunk' && !file.dts,
		)
		const dtsEntryPointFiles = buildContext.output.files.filter(
			(file) => file.kind === 'entry-point' && file.dts,
		)
		const dtsChunkFiles = buildContext.output.files.filter(
			(file) => file.kind === 'chunk' && file.dts,
		)

		expect(entryPointFiles.length).toBe(3)
		expect(chunkFiles.length).toBeGreaterThan(0)
		expect(dtsEntryPointFiles.length).toBe(3)
		expect(dtsChunkFiles.length).toBeGreaterThan(0)

		const mainFile = entryPointFiles.find((file) =>
			file.fullPath.includes('main.mjs'),
		)
		const adminFile = entryPointFiles.find((file) =>
			file.fullPath.includes('admin.mjs'),
		)
		const clientFile = entryPointFiles.find((file) =>
			file.fullPath.includes('client.mjs'),
		)

		expect(mainFile).toBeDefined()
		expect(adminFile).toBeDefined()
		expect(clientFile).toBeDefined()

		expect(mainFile.entrypoint).toBe('src/main.ts')
		expect(adminFile.entrypoint).toBe('src/admin.ts')
		expect(clientFile.entrypoint).toBe('src/client.ts')

		expect(chunkFiles.every((file) => file.entrypoint === undefined)).toBe(true)
		expect(
			chunkFiles.every((file) =>
				file.pathRelativeToOutdir.startsWith('shared/'),
			),
		).toBe(true)
		expect(dtsChunkFiles.every((file) => file.entrypoint === undefined)).toBe(
			true,
		)
		expect(
			dtsChunkFiles.every((file) =>
				file.pathRelativeToOutdir.startsWith('shared/'),
			),
		).toBe(true)

		const mainDtsFile = dtsEntryPointFiles.find((file) =>
			file.fullPath.includes('main.d.mts'),
		)
		const adminDtsFile = dtsEntryPointFiles.find((file) =>
			file.fullPath.includes('admin.d.mts'),
		)
		const clientDtsFile = dtsEntryPointFiles.find((file) =>
			file.fullPath.includes('client.d.mts'),
		)

		expect(mainDtsFile).toBeDefined()
		expect(adminDtsFile).toBeDefined()
		expect(clientDtsFile).toBeDefined()

		expect(mainDtsFile.entrypoint).toBe('src/main.ts')
		expect(adminDtsFile.entrypoint).toBe('src/admin.ts')
		expect(clientDtsFile.entrypoint).toBe('src/client.ts')

		const sharedTypesChunk = dtsChunkFiles.find(
			(file) =>
				file.fullPath.includes('chunk') &&
				file.fullPath.endsWith('.d.ts') &&
				file.pathRelativeToOutdir.startsWith('shared/'),
		)
		expect(sharedTypesChunk).toBeDefined()
		expect(sharedTypesChunk.entrypoint).toBeUndefined()

		const allFiles = buildContext.output.files

		expect(
			allFiles.every((file) =>
				file.dts
					? file.kind === 'chunk'
						? file.pathRelativeToOutdir.startsWith('shared/') &&
							file.fullPath.includes('.d.ts')
						: file.fullPath.includes('.d.mts')
					: file.kind === 'chunk'
						? file.pathRelativeToOutdir.startsWith('shared/') &&
							file.fullPath.includes('chunk-')
						: file.fullPath.includes('.mjs'),
			),
		).toBe(true)

		const expectedMinimumFiles = 6
		expect(allFiles.length).toBeGreaterThanOrEqual(expectedMinimumFiles)
	})
})
