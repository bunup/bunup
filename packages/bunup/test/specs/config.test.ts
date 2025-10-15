import { beforeEach, describe, expect, it } from 'bun:test'
import {
	cleanProjectDir,
	createProject,
	isWindows,
	runDtsBuild,
} from '../utils'

describe.skipIf(isWindows())('Config', () => {
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
			'src/index.ts': "export * from '@/math';",
			'src/project/math.ts':
				'export const add = (a: number, b: number): number => a + b;',
		})

		const result = await runDtsBuild({
			entry: 'src/index.ts',
			format: 'esm',
			preferredTsconfig: 'tsconfig.build.json',
		})

		expect(result.success).toBe(true)
		expect(result.files[0].content).toContain(
			'declare const add: (a: number, b: number) => number',
		)
	})
})
