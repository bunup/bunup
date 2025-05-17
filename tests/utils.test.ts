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
    getBaseFileName,
    getDefaultOutputExtension,
    getJsonSpaceCount,
    getPackageDeps,
    getShortFilePath,
    isModulePackage,
    makePortablePath,
    removeExtension,
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

    describe('getBaseFileName', () => {
        it('returns filename without extension', () => {
            expect(getBaseFileName('path/to/file.js')).toBe('file')
        })
        it('returns filename with no extension as is', () => {
            expect(getBaseFileName('path/to/file')).toBe('file')
        })
        it('handles filenames with multiple dots', () => {
            expect(getBaseFileName('path/to/file.min.js')).toBe('file.min')
        })
    })

    describe('removeExtension', () => {
        it('removes file extension', () => {
            expect(removeExtension('path/to/file.js')).toBe('path/to/file')
        })
        it('handles paths with no extension', () => {
            expect(removeExtension('path/to/file')).toBe('path/to/file')
        })
        it('handles paths with multiple dots', () => {
            expect(removeExtension('path/to/file.min.js')).toBe(
                'path/to/file.min',
            )
        })
    })

    describe('getJsonSpaceCount', () => {
        it('returns the number of spaces in first indented line', () => {
            const json = `{
    "name": "test"
}`
            expect(getJsonSpaceCount(json)).toBe(4)
        })
        it('returns 2 when no match is found', () => {
            const json = `{"name":"test"}`
            expect(getJsonSpaceCount(json)).toBe(2)
        })
        it('handles different indentation levels', () => {
            const json = `{
  "name": "test"
}`
            expect(getJsonSpaceCount(json)).toBe(2)
        })
    })

    describe('makePortablePath', () => {
        it('converts backslashes to forward slashes', () => {
            expect(makePortablePath('path\\to\\file.js')).toBe(
                'path/to/file.js',
            )
        })

        it('strips Windows drive letters', () => {
            expect(makePortablePath('C:/path/to/file.js')).toBe(
                'path/to/file.js',
            )
        })

        it('removes leading slashes', () => {
            expect(makePortablePath('/path/to/file.js')).toBe('path/to/file.js')
        })

        it('handles already normalized paths', () => {
            expect(makePortablePath('path/to/file.js')).toBe('path/to/file.js')
        })

        it('handles complex paths with multiple transformations', () => {
            expect(
                makePortablePath('D:\\\\multiple\\//slashes//\\file.js'),
            ).toBe('multiple/slashes/file.js')
        })
    })
})
