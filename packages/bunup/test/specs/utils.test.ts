import { afterEach, describe, expect, it } from 'bun:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
	getResolvedDefine,
	getResolvedMinify,
	getResolvedSplitting,
} from '../../src/options'
import {
	cleanOutDir,
	cleanPath,
	ensureArray,
	formatFileSize,
	getDefaultDtsOutputExtention,
	getDefaultJsOutputExtension,
	getPackageDeps,
	getShortFilePath,
	isGlobPattern,
} from '../../src/utils'

describe('Utils', () => {
	describe('ensureArray', () => {
		it('wraps a single value in an array', () => {
			expect(ensureArray('test')).toEqual(['test'])
		})
		it('returns the array as is', () => {
			expect(ensureArray(['test1', 'test2'])).toEqual(['test1', 'test2'])
		})
	})

	describe('getDefaultJsOutputExtension', () => {
		it('returns .mjs for esm format', () => {
			expect(getDefaultJsOutputExtension('esm', undefined)).toBe('.mjs')
		})
		it('returns .cjs for cjs format with module type', () => {
			expect(getDefaultJsOutputExtension('cjs', 'module')).toBe('.cjs')
		})
		it('returns .js for cjs format with commonjs type', () => {
			expect(getDefaultJsOutputExtension('cjs', 'commonjs')).toBe('.js')
		})
		it('returns .global.js for iife format', () => {
			expect(getDefaultJsOutputExtension('iife', undefined)).toBe('.global.js')
		})
	})

	describe('getDefaultDtsOutputExtention', () => {
		it('returns .d.mts for esm format without module type', () => {
			expect(
				getDefaultDtsOutputExtention('esm', undefined, 'entry-point'),
			).toBe('.d.mts')
		})
		it('returns .d.ts for esm format with module type', () => {
			expect(getDefaultDtsOutputExtention('esm', 'module', 'entry-point')).toBe(
				'.d.ts',
			)
		})
		it('returns .d.cts for cjs format with module type', () => {
			expect(getDefaultDtsOutputExtention('cjs', 'module', 'entry-point')).toBe(
				'.d.cts',
			)
		})
		it('returns .d.ts for cjs format with commonjs type', () => {
			expect(
				getDefaultDtsOutputExtention('cjs', 'commonjs', 'entry-point'),
			).toBe('.d.ts')
		})
		it('returns .d.ts for iife format', () => {
			expect(
				getDefaultDtsOutputExtention('iife', undefined, 'entry-point'),
			).toBe('.global.d.ts')
		})
		it('returns .d.ts for chunk files', () => {
			expect(getDefaultDtsOutputExtention('esm', undefined, 'chunk')).toBe(
				'.d.ts',
			)
		})
	})

	describe('getPackageDeps', () => {
		it('returns dependencies and peerDependencies', () => {
			const packageJson = {
				dependencies: { dep1: '1.0.0' },
				peerDependencies: { peerDep1: '^2.0.0' },
			}
			expect(getPackageDeps(packageJson)).toEqual(['dep1', 'peerDep1'])
		})
		it('returns empty array for no dependencies', () => {
			expect(getPackageDeps(null)).toEqual([])
		})
	})

	describe('getResolvedSplitting', () => {
		it('returns true for esm format by default', () => {
			expect(getResolvedSplitting(undefined, 'esm')).toBe(true)
		})
		it('returns false for cjs format by default', () => {
			expect(getResolvedSplitting(undefined, 'cjs')).toBe(false)
		})
		it('respects explicit splitting value', () => {
			expect(getResolvedSplitting(true, 'cjs')).toBe(true)
		})
	})

	describe('formatFileSize', () => {
		it('formats file size in bytes', () => {
			expect(formatFileSize(500)).toBe('500 B')
		})
		it('formats file size in kilobytes', () => {
			expect(formatFileSize(1500)).toBe('1.46 KB')
		})
		it('formats file size in megabytes', () => {
			expect(formatFileSize(1048576)).toBe('1.00 MB')
		})
	})

	describe('getShortFilePath', () => {
		it('returns last 3 parts of the path', () => {
			expect(getShortFilePath('a/b/c/d/e.ts')).toBe('c/d/e.ts')
		})
		it('handles paths with less than 3 parts', () => {
			expect(getShortFilePath('a/b.ts')).toBe('a/b.ts')
		})
	})

	describe('getResolvedMinify', () => {
		it('returns all true when minify is true', () => {
			const result = getResolvedMinify({
				minify: true,
				entry: [],
				outDir: '',
				format: 'cjs',
			})
			expect(result).toEqual({
				whitespace: true,
				identifiers: true,
				syntax: true,
			})
		})

		it('uses specific minify options when provided', () => {
			const result = getResolvedMinify({
				minify: true,
				minifyWhitespace: false,
				minifyIdentifiers: true,
				minifySyntax: false,
				entry: [],
				outDir: '',
				format: 'cjs',
			})
			expect(result).toEqual({
				whitespace: false,
				identifiers: true,
				syntax: false,
			})
		})

		it('defaults to false when minify is undefined', () => {
			const result = getResolvedMinify({
				entry: [],
				outDir: '',
				format: 'cjs',
			})
			expect(result).toEqual({
				whitespace: false,
				identifiers: false,
				syntax: false,
			})
		})
	})

	describe('getResolvedDefine', () => {
		it('returns undefined when both define and env are undefined', () => {
			const result = getResolvedDefine(undefined, undefined)
			expect(result).toEqual({})
		})

		it('returns define values when only define is provided', () => {
			const define = { 'process.env.NODE_ENV': '"production"' }
			const result = getResolvedDefine(define, undefined)
			expect(result).toEqual({ 'process.env.NODE_ENV': '"production"' })
		})

		it('creates entries for process.env and import.meta.env when env object is provided', () => {
			const env = { API_KEY: 'abc123', DEBUG: 'true' }
			const result = getResolvedDefine(undefined, env)
			expect(result).toEqual({
				'process.env.API_KEY': '"abc123"',
				'import.meta.env.API_KEY': '"abc123"',
				'process.env.DEBUG': '"true"',
				'import.meta.env.DEBUG': '"true"',
			})
		})

		it('merges define and env values when both are provided', () => {
			const define = { VERSION: '"1.0.0"' }
			const env = { NODE_ENV: 'production' }
			const result = getResolvedDefine(define, env)
			expect(result).toEqual({
				VERSION: '"1.0.0"',
				'process.env.NODE_ENV': '"production"',
				'import.meta.env.NODE_ENV': '"production"',
			})
		})

		it('define values take precedence over env values', () => {
			const define = { 'process.env.NODE_ENV': '"development"' }
			const env = { NODE_ENV: 'production' }
			const result = getResolvedDefine(define, env)
			expect(result).toEqual({
				'process.env.NODE_ENV': '"development"',
				'import.meta.env.NODE_ENV': '"production"',
			})
		})
	})

	describe('cleanPath', () => {
		it('converts backslashes to forward slashes', () => {
			expect(cleanPath('path\\to\\file.js')).toBe('path/to/file.js')
		})

		it('strips Windows drive letters', () => {
			expect(cleanPath('C:/path/to/file.js')).toBe('path/to/file.js')
		})

		it('removes leading slashes', () => {
			expect(cleanPath('/path/to/file.js')).toBe('path/to/file.js')
		})

		it('handles already normalized paths', () => {
			expect(cleanPath('path/to/file.js')).toBe('path/to/file.js')
		})

		it('handles complex paths with multiple transformations', () => {
			expect(cleanPath('D:\\\\multiple\\//slashes//\\file.js')).toBe(
				'multiple/slashes/file.js',
			)
		})

		it('converts backslashes to forward slashes', () => {
			expect(cleanPath('path\\to\\file.js')).toBe('path/to/file.js')
		})

		it('keeps forward slashes unchanged', () => {
			expect(cleanPath('path/to/file.js')).toBe('path/to/file.js')
		})

		it('handles mixed slashes', () => {
			expect(cleanPath('path\\to/mixed\\slashes.js')).toBe(
				'path/to/mixed/slashes.js',
			)
		})

		it('handles path with no slashes', () => {
			expect(cleanPath('filename.js')).toBe('filename.js')
		})

		it('handles multiple consecutive backslashes', () => {
			expect(cleanPath('path\\\\to\\\\file.js')).toBe('path/to/file.js')
		})
	})

	describe('isGlobPattern', () => {
		it('returns true for asterisk wildcard', () => {
			expect(isGlobPattern('*.js')).toBe(true)
		})

		it('returns true for question mark wildcard', () => {
			expect(isGlobPattern('file?.js')).toBe(true)
		})

		it('returns true for character class brackets', () => {
			expect(isGlobPattern('file[0-9].js')).toBe(true)
		})

		it('returns true for closing bracket', () => {
			expect(isGlobPattern('file].js')).toBe(true)
		})

		it('returns true for opening brace', () => {
			expect(isGlobPattern('file{1,2}.js')).toBe(true)
		})

		it('returns true for closing brace', () => {
			expect(isGlobPattern('file}.js')).toBe(true)
		})

		it('returns true for multiple glob characters', () => {
			expect(isGlobPattern('**/*.{js,ts}')).toBe(true)
		})

		it('returns true for complex glob pattern', () => {
			expect(isGlobPattern('src/**/*[0-9]?.{js,ts,jsx,tsx}')).toBe(true)
		})

		it('returns false for regular file path', () => {
			expect(isGlobPattern('src/index.js')).toBe(false)
		})

		it('returns false for directory path', () => {
			expect(isGlobPattern('src/components')).toBe(false)
		})

		it('returns false for empty string', () => {
			expect(isGlobPattern('')).toBe(false)
		})

		it('returns false for simple filename', () => {
			expect(isGlobPattern('package.json')).toBe(false)
		})

		it('returns false for path with dots and slashes only', () => {
			expect(isGlobPattern('./src/../dist/index.js')).toBe(false)
		})
	})

	describe('cleanOutDir', () => {
		const testRootDir = path.join(process.cwd(), 'test-temp-root')

		afterEach(async () => {
			try {
				await fs.rm(testRootDir, { recursive: true, force: true })
			} catch {}
		})

		it('successfully cleans a valid output directory', async () => {
			await fs.mkdir(testRootDir, { recursive: true })
			const outDir = 'dist'
			const outDirPath = path.join(testRootDir, outDir)

			await fs.mkdir(outDirPath, { recursive: true })
			await fs.writeFile(path.join(outDirPath, 'test.js'), 'content')

			await cleanOutDir(testRootDir, outDir)

			const files = await fs.readdir(outDirPath)
			expect(files.length).toBe(0)
		})

		it('throws error for root directory "/"', async () => {
			expect(cleanOutDir(testRootDir, '/')).rejects.toThrow(
				'Invalid output directory: "/" is not allowed',
			)
		})

		it('throws error for current directory "."', async () => {
			expect(cleanOutDir(testRootDir, '.')).rejects.toThrow(
				'Invalid output directory: "." is not allowed',
			)
		})

		it('throws error for parent directory ".."', async () => {
			expect(cleanOutDir(testRootDir, '..')).rejects.toThrow(
				'Invalid output directory: ".." is not allowed',
			)
		})

		it('throws error for home directory "~"', async () => {
			expect(cleanOutDir(testRootDir, '~')).rejects.toThrow(
				'Invalid output directory: "~" is not allowed',
			)
		})

		it('throws error for absolute path starting with "/"', async () => {
			expect(cleanOutDir(testRootDir, '/tmp/output')).rejects.toThrow(
				'Invalid output directory: "/tmp/output" is not allowed',
			)
		})

		it('throws error for path starting with "~"', async () => {
			expect(cleanOutDir(testRootDir, '~/output')).rejects.toThrow(
				'Invalid output directory: "~/output" is not allowed',
			)
		})

		it('throws error for path that escapes root directory using ".."', async () => {
			expect(cleanOutDir(testRootDir, '../outside')).rejects.toThrow(
				'Output directory "../outside" escapes root directory',
			)
		})

		it('throws error for path that escapes root directory using "dist/../../outside"', async () => {
			expect(cleanOutDir(testRootDir, 'dist/../../outside')).rejects.toThrow(
				'Output directory "dist/../../outside" escapes root directory',
			)
		})

		it('allows nested valid directories', async () => {
			await fs.mkdir(testRootDir, { recursive: true })
			const outDir = 'dist/nested/output'

			await cleanOutDir(testRootDir, outDir)

			const outDirPath = path.join(testRootDir, outDir)
			const stats = await fs.stat(outDirPath)
			expect(stats.isDirectory()).toBe(true)
		})

		it('allows directory with same name as root in path', async () => {
			await fs.mkdir(testRootDir, { recursive: true })
			const outDir = 'dist/test-temp-root/output'

			await cleanOutDir(testRootDir, outDir)

			const outDirPath = path.join(testRootDir, outDir)
			const stats = await fs.stat(outDirPath)
			expect(stats.isDirectory()).toBe(true)
		})

		it('handles paths with trailing slashes', async () => {
			await fs.mkdir(testRootDir, { recursive: true })
			const outDir = 'dist/output/'

			await cleanOutDir(testRootDir, outDir)

			const outDirPath = path.join(testRootDir, 'dist', 'output')
			const stats = await fs.stat(outDirPath)
			expect(stats.isDirectory()).toBe(true)
		})
	})
})
