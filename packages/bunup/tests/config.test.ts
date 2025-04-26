import { beforeEach, describe, expect, it } from 'bun:test'
import { cleanProjectDir, createProject, runDtsBuild } from './utils'

describe('Config', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	it('should use preferred tsconfig when provided', async () => {
		createProject({
			'tsconfig.json': JSON.stringify({
				compilerOptions: {
					baseUrl: '.',
					paths: {
						'@/*': ['src/*'],
					},
				},
			}),
			'tsconfig.build.json': JSON.stringify({
				compilerOptions: {
					baseUrl: '.',
					paths: {
						'@/*': ['src/project/*'],
					},
				},
			}),
			'src/index.ts': "export * from '@/utils';",
			'src/project/utils.ts':
				"export const util = (): string => 'utility';",
		})

		const result = await runDtsBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			preferredTsconfigPath: 'tsconfig.build.json',
		})

		expect(result.success).toBe(true)
		expect(result.files.length).toBe(1)
		expect(result.files[0].content).toContain(
			'declare const util: () => string',
		)
	})
})
