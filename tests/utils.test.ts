import { describe, expect, it } from 'bun:test'
import {
	getResolvedBytecode,
	getResolvedDefine,
	getResolvedMinify,
	getResolvedSplitting,
} from '../src/options'
import {
	addField,
	ensureArray,
	formatFileSize,
	formatTime,
	getDefaultOutputExtension,
	getPackageDeps,
	getShortFilePath,
	isModulePackage,
} from '../src/utils'

describe('Utils', () => {
	describe('addField', () => {
		it('adds field to a single object', () => {
			const obj = { a: 1 }
			const result = addField(obj, 'b', 2)
			expect(result).toEqual({ a: 1, b: 2 })
		})
		it('adds field to an array of objects', () => {
			const arr = [{ a: 1 }, { a: 2 }]
			const result = addField(arr, 'b', 3)
			expect(result).toEqual([
				{ a: 1, b: 3 },
				{ a: 2, b: 3 },
			])
		})
	})

	describe('ensureArray', () => {
		it('wraps a single value in an array', () => {
			expect(ensureArray('test')).toEqual(['test'])
		})
		it('returns the array as is', () => {
			expect(ensureArray(['test1', 'test2'])).toEqual(['test1', 'test2'])
		})
	})

	describe('getDefaultOutputExtension', () => {
		it('returns .mjs for esm format', () => {
			expect(getDefaultOutputExtension('esm', undefined)).toBe('.mjs')
		})
		it('returns .cjs for cjs format with module type', () => {
			expect(getDefaultOutputExtension('cjs', 'module')).toBe('.cjs')
		})
		it('returns .js for cjs format with commonjs type', () => {
			expect(getDefaultOutputExtension('cjs', 'commonjs')).toBe('.js')
		})
		it('returns .global.js for iife format', () => {
			expect(getDefaultOutputExtension('iife', undefined)).toBe(
				'.global.js',
			)
		})
	})

	describe('isModulePackage', () => {
		it('returns true for module type', () => {
			expect(isModulePackage('module')).toBe(true)
		})
		it('returns false for commonjs type', () => {
			expect(isModulePackage('commonjs')).toBe(false)
		})
		it('returns false for undefined type', () => {
			expect(isModulePackage(undefined)).toBe(false)
		})
	})

	describe('formatTime', () => {
		it('formats time in milliseconds', () => {
			expect(formatTime(500)).toBe('500ms')
		})
		it('formats time in seconds', () => {
			expect(formatTime(1500)).toBe('1.50s')
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

	describe('getResolvedBytecode', () => {
		it('returns bytecode for cjs format', () => {
			expect(getResolvedBytecode(true, 'cjs')).toBe(true)
		})
		it('returns undefined for non-cjs formats', () => {
			expect(getResolvedBytecode(true, 'esm')).toBeUndefined()
		})
	})

	describe('getResolvedMinify', () => {
		it('returns all true when minify is true', () => {
			const result = getResolvedMinify({
				minify: true,
				entry: [],
				outDir: '',
				format: ['cjs'],
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
				format: ['cjs'],
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
				format: ['cjs'],
			})
			expect(result).toEqual({
				whitespace: false,
				identifiers: false,
				syntax: false,
			})
		})
	})

	describe('getResolvedDefine', () => {
		it('returns custom define values', () => {
			const define = { 'process.env.NODE_ENV': '"production"' }
			const result = getResolvedDefine(define, undefined, {}, 'esm')
			expect(result).toEqual(define)
		})

		it('adds import.meta.url for cjs format with shims=true', () => {
			const result = getResolvedDefine(undefined, true, {}, 'cjs')
			expect(result).toEqual({
				'import.meta.url': 'importMetaUrl',
			})
		})

		it('adds import.meta.url for cjs format with importMetaUrl shim', () => {
			const result = getResolvedDefine(
				undefined,
				{ importMetaUrl: true },
				{},
				'cjs',
			)
			expect(result).toEqual({
				'import.meta.url': 'importMetaUrl',
			})
		})

		it('does not add import.meta.url for esm format', () => {
			const result = getResolvedDefine(undefined, true, {}, 'esm')
			expect(result).toEqual({})
		})

		it('merges custom define with shims', () => {
			const define = { VERSION: '"1.0.0"' }
			const result = getResolvedDefine(define, true, {}, 'cjs')
			expect(result).toEqual({
				VERSION: '"1.0.0"',
				'import.meta.url': 'importMetaUrl',
			})
		})
	})
})
