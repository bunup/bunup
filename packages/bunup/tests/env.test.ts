import { beforeEach, describe, expect, it } from 'bun:test'
import { cleanProjectDir, createProject, runBuild } from './utils'

describe('Environment Variables', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	it('inlines specific environment variables from object', async () => {
		createProject({
			'src/index.ts': `
                export const testVar = process.env.TEST_VAR;
                export const anotherVar = process.env.ANOTHER_VAR;
                export const undefinedVar = process.env.UNDEFINED_VAR;
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			env: {
				TEST_VAR: 'overridden-value',
				UNDEFINED_VAR: 'defined-in-config',
			},
		})

		expect(result.success).toBe(true)
		const file = result.files[0]
		expect(file.content).toContain('"overridden-value"')
		expect(file.content).toContain('"defined-in-config"')
		expect(file.content).toContain('process.env.ANOTHER_VAR')
		expect(file.content).not.toContain('"another-original"')
	})

	it('handles import.meta.env references', async () => {
		createProject({
			'src/index.ts': `
                export const testVar = import.meta.env.TEST_VAR;
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			env: {
				TEST_VAR: 'test-value',
			},
		})

		expect(result.success).toBe(true)
		const file = result.files[0]
		expect(file.content).toContain('"test-value"')
	})

	it('inlines environment variables with different types', async () => {
		createProject({
			'src/index.ts': `
                export const stringVar = process.env.STRING_VAR;
                export const numberVar = process.env.NUMBER_VAR;
                export const booleanVar = process.env.BOOLEAN_VAR;
                export const jsonVar = process.env.JSON_VAR;
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			env: {
				STRING_VAR: 'string-value',
				NUMBER_VAR: '123',
				BOOLEAN_VAR: 'true',
				JSON_VAR: '{"key":"value"}',
			},
		})

		expect(result.success).toBe(true)
		const file = result.files[0]
		expect(file.content).toContain('"string-value"')
		expect(file.content).toContain('"123"')
		expect(file.content).toContain('"true"')
		expect(file.content).toContain('{"key":"value"}')
	})

	it('works across multiple output formats', async () => {
		createProject({
			'src/index.ts': `
                export const formatTest = process.env.FORMAT_TEST;
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm', 'cjs', 'iife'],
			env: {
				FORMAT_TEST: 'format-value',
			},
		})

		expect(result.success).toBe(true)
		expect(result.files.length).toBe(3)

		for (const file of result.files) {
			expect(file.content).toContain('"format-value"')
		}
	})

	it('works with multiple entry points', async () => {
		createProject({
			'src/index.ts': 'export const indexVar = process.env.MULTI_ENTRY;',
			'src/other.ts': 'export const otherVar = process.env.MULTI_ENTRY;',
		})

		const result = await runBuild({
			entry: ['src/index.ts', 'src/other.ts'],
			format: ['esm'],
			env: {
				MULTI_ENTRY: 'multi-value',
			},
		})

		expect(result.success).toBe(true)
		expect(result.files.length).toBe(2)

		for (const file of result.files) {
			expect(file.content).toContain('"multi-value"')
		}
	})

	it('interacts correctly with defined environment variables', async () => {
		createProject({
			'src/index.ts': `
                export const definedEnv = process.env.DEFINED_ENV;
                export const envAndDefine = process.env.ENV_AND_DEFINE;
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			env: {
				DEFINED_ENV: 'env-value',
				ENV_AND_DEFINE: 'env-override',
			},
			define: {
				'process.env.ENV_AND_DEFINE': '"define-value"',
			},
		})

		expect(result.success).toBe(true)
		const file = result.files[0]
		expect(file.content).toContain('"env-value"')
		// Define should take precedence over env
		expect(file.content).toContain('"define-value"')
		expect(file.content).not.toContain('"env-override"')
	})
})
