import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { BuildOptions } from '../../src/options'
import type { BuildContext, BunupPlugin } from '../../src/plugins/types'
import {
	cleanProjectDir,
	createProject,
	runBuild,
	validateBuildFiles,
} from '../utils'

describe('Bunup Plugins', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	it('should call onBuildStart hook when build starts', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const onBuildStartMock = mock(() => {})

		const testPlugin: BunupPlugin = {
			type: 'bunup',
			name: 'test-start-plugin',
			hooks: {
				onBuildStart: onBuildStartMock,
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			plugins: [testPlugin],
		})

		expect(result.success).toBe(true)
		expect(onBuildStartMock).toHaveBeenCalledTimes(1)
		expect(onBuildStartMock).toHaveBeenCalledWith(
			expect.objectContaining({
				entry: 'src/index.ts',
				format: ['esm'],
				plugins: [testPlugin],
			}),
		)
	})

	it('should call onBuildDone hook when build completes', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const onBuildDoneMock = mock(() => {})

		const testPlugin: BunupPlugin = {
			type: 'bunup',
			name: 'test-done-plugin',
			hooks: {
				onBuildDone: onBuildDoneMock,
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
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
			type: 'bunup',
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
			format: ['esm'],
			plugins: [testPlugin],
		})

		expect(result.success).toBe(true)
		expect(callOrder).toEqual(['onBuildStart', 'onBuildDone'])
	})

	it('should execute hooks from multiple plugins in the correct order', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const callOrder: string[] = []

		const firstPlugin: BunupPlugin = {
			type: 'bunup',
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
			type: 'bunup',
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
			format: ['esm'],
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
			type: 'bunup',
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
			format: ['esm'],
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
			type: 'bunup',
			name: 'bunup-specific-plugin',
			hooks: {
				onBuildStart: bunupHookCalled,
				onBuildDone: bunupHookCalled,
			},
		}

		const bunPluginSetupMock = mock(() => {})
		const bunPlugin = {
			type: 'bun' as const,
			name: 'bun-specific-plugin',
			plugin: {
				name: 'bun-plugin',
				setup: bunPluginSetupMock,
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
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
			type: 'bunup',
			name: 'options-modifier-plugin',
			hooks: {
				onBuildStart: mock((options: BuildOptions) => {
					options.banner = '/* Modified by plugin */'
				}),
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			plugins: [testPlugin],
		})

		expect(result.success).toBe(true)
		expect(result.files[0].content).toContain('/* Modified by plugin */')
	})

	it('should handle errors in plugin hooks', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const errorPlugin: BunupPlugin = {
			type: 'bunup',
			name: 'error-plugin',
			hooks: {
				onBuildStart: mock(() => {
					throw new Error('Test error from plugin')
				}),
			},
		}

		const { error } = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			plugins: [errorPlugin],
		})

		expect(error).toBeDefined()
		expect(error?.message).toContain('Test error from plugin')
	})

	it('should provide plugins access to build output in onBuildDone', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		let outputFiles: string[] = []

		const outputAccessPlugin: BunupPlugin = {
			type: 'bunup',
			name: 'output-access-plugin',
			hooks: {
				onBuildDone: mock((ctx: BuildContext) => {
					outputFiles = ctx.output.files.map((file) => file.fullPath)
				}),
			},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			plugins: [outputAccessPlugin],
		})

		expect(result.success).toBe(true)
		expect(outputFiles.length).toBeGreaterThan(0)
		expect(outputFiles[0]).toContain('index.mjs')
	})

	it('should handle plugins with empty hooks object', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		const emptyPlugin: BunupPlugin = {
			type: 'bunup',
			name: 'empty-plugin',
			hooks: {},
		}

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			plugins: [emptyPlugin],
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, { expectedFiles: ['index.mjs'] }),
		).toBe(true)
	})
})
