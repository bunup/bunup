import { beforeEach, describe, expect, it } from 'bun:test'
import { cleanProjectDir, createProject, findFile, runBuild } from './utils'

describe('Shims', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	it('should add __dirname and __filename shims in ESM format when used and enabled', async () => {
		createProject({
			'src/index.ts': `
                console.log("dirname:", __dirname);
                console.log("filename:", __filename);
                export const path = __dirname + '/' + __filename;
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			shims: true,
		})

		expect(result.success).toBe(true)
		const esmFile = findFile(result, 'index', '.mjs')
		expect(esmFile).toBeDefined()
		expect(esmFile?.content).toContain('__filename')
		expect(esmFile?.content).toContain('__dirname')
	})

	it('should not add shims when they are not used even if enabled', async () => {
		createProject({
			'src/index.ts': `
                    console.log("Hello world");
                    export const greeting = "Hello world";
                `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			shims: true,
		})

		expect(result.success).toBe(true)
		const esmFile = findFile(result, 'index', '.mjs')
		expect(esmFile).toBeDefined()
		expect(esmFile?.content).not.toContain('__filename')
		expect(esmFile?.content).not.toContain('__dirname')
	})

	it('should not add shims when they are used but disabled', async () => {
		createProject({
			'src/index.ts': `
                    console.log("Hello world");
                    export const greeting = "Hello world";
                `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			shims: { dirnameFilename: false },
		})

		expect(result.success).toBe(true)
		const esmFile = findFile(result, 'index', '.mjs')
		expect(esmFile).toBeDefined()
		expect(esmFile?.content).not.toContain('__filename')
		expect(esmFile?.content).not.toContain('__dirname')
	})

	it('should add import.meta.url shim in CJS format when used and enabled', async () => {
		createProject({
			'src/index.ts': `
                    console.log("url:", import.meta.url);
                    export const url = import.meta.url;
                `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['cjs'],
			shims: true,
		})

		expect(result.success).toBe(true)
		const cjsFile = findFile(result, 'index', '.js')
		expect(cjsFile).toBeDefined()
		expect(cjsFile?.content).toContain('pathToFileURL(__filename).href')
	})

	it('should not add import.meta.url shim in CJS when it is not used even if enabled', async () => {
		createProject({
			'src/index.ts': `
                    console.log("Hello world");
                    export const greeting = "Hello world";
                `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['cjs'],
			shims: true,
		})

		expect(result.success).toBe(true)
		const cjsFile = findFile(result, 'index', '.js')
		expect(cjsFile).toBeDefined()
		expect(cjsFile?.content).not.toContain('importMetaUrl')
		expect(cjsFile?.content).not.toContain('pathToFileURL(__filename).href')
	})

	it('should not add import.meta.url shim in CJS when used but disabled', async () => {
		createProject({
			'src/index.ts': `
                    console.log("url:", import.meta.url);
                    export const url = import.meta.url;
                `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['cjs'],
			shims: { importMetaUrl: false },
		})

		expect(result.success).toBe(true)
		const cjsFile = findFile(result, 'index', '.js')
		expect(cjsFile).toBeDefined()
		expect(cjsFile?.content).not.toContain('importMetaUrl')
		expect(cjsFile?.content).not.toContain('pathToFileURL(__filename).href')
	})

	it('should respect selective shim configuration for CJS format', async () => {
		createProject({
			'src/index.ts': `
                    console.log("url:", import.meta.url);
                    export const url = import.meta.url;
                `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['cjs'],
			shims: { importMetaUrl: true },
		})

		expect(result.success).toBe(true)
		const cjsFile = findFile(result, 'index', '.js')
		expect(cjsFile).toBeDefined()
		expect(cjsFile?.content).toContain('importMetaUrl')
		expect(cjsFile?.content).toContain('pathToFileURL(__filename).href')
	})

	it('should handle shebang correctly when adding shims', async () => {
		createProject({
			'src/cli.ts': `#!/usr/bin/env node
                    console.log("dirname:", __dirname);
                    console.log("filename:", __filename);
                    export const path = __dirname + '/' + __filename;
                `,
		})

		const result = await runBuild({
			entry: 'src/cli.ts',
			format: ['esm'],
			shims: true,
		})

		expect(result.success).toBe(true)
		const esmFile = findFile(result, 'cli', '.mjs')
		expect(esmFile).toBeDefined()
		const firstLine = esmFile?.content.split('\n')[0]
		expect(firstLine).toMatch(/^#!\/usr\/bin\/env node/)
		expect(esmFile?.content).toContain('fileURLToPath(import.meta.url)')
		expect(esmFile?.content).toContain('dirname(__filename')
	})

	it('should not add dirname and filename shims in IIFE format regardless of configuration', async () => {
		createProject({
			'src/index.ts': `
                    console.log("dirname:", __dirname);
                    console.log("filename:", __filename);
                    console.log("url:", import.meta.url);
                    export const path = __dirname + '/' + __filename;
                    export const url = import.meta.url;
                `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['iife'],
			shims: true,
		})

		expect(result.success).toBe(true)
		const iifeFile = findFile(result, 'index', '.global.js')
		expect(iifeFile).toBeDefined()
		expect(iifeFile?.content).not.toContain(
			'fileURLToPath(import.meta.url)',
		)
		expect(iifeFile?.content).not.toContain('dirname(__filename)')
		expect(iifeFile?.content).not.toContain('importMetaUrl')
		expect(iifeFile?.content).not.toContain(
			'pathToFileURL(__filename).href',
		)
	})

	it('should not add dirname and filename shims when target is not Node compatible', async () => {
		createProject({
			'src/index.ts': `
                    console.log("dirname:", __dirname);
                    console.log("filename:", __filename);
                    export const path = __dirname + '/' + __filename;
                `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			target: 'browser',
			shims: true,
		})

		expect(result.success).toBe(true)
		const esmFile = findFile(result, 'index', '.mjs')
		expect(esmFile).toBeDefined()
		expect(esmFile?.content).not.toContain('fileURLToPath(import.meta.url)')
		expect(esmFile?.content).not.toContain('dirname(__filename)')
	})

	it('should properly handle multiple entry points with shims', async () => {
		createProject({
			'src/index.ts': `
                    console.log("dirname:", __dirname);
                    export const dir = __dirname;
                `,
			'src/utils.ts': `
                    console.log("filename:", __filename);
                    export const file = __filename;
                `,
		})

		const result = await runBuild({
			entry: ['src/index.ts', 'src/utils.ts'],
			format: ['esm'],
			shims: true,
		})

		expect(result.success).toBe(true)

		const indexFile = findFile(result, 'index', '.mjs')
		expect(indexFile).toBeDefined()
		expect(indexFile?.content).toContain('dirname(__filename')

		const utilsFile = findFile(result, 'utils', '.mjs')
		expect(utilsFile).toBeDefined()
		expect(utilsFile?.content).toContain('fileURLToPath(import.meta.url)')
	})
})
