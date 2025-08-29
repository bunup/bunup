import { describe, expect, it } from 'bun:test'
import {
	deleteExtension,
	getDeclarationExtensionFromJsExtension,
	getExtension,
	replaceExtension,
} from '../src/utils'

describe('utils', () => {
	describe('getDeclarationExtensionFromJsExtension', () => {
		it('should return the correct extension for .mjs', () => {
			expect(getDeclarationExtensionFromJsExtension('.mjs')).toBe('.d.mts')
		})

		it('should return the correct extension for .cjs', () => {
			expect(getDeclarationExtensionFromJsExtension('.cjs')).toBe('.d.cts')
		})

		it('should return the correct extension for .js', () => {
			expect(getDeclarationExtensionFromJsExtension('.js')).toBe('.d.ts')
		})
	})

	describe('getExtension', () => {
		it('should return the extension for a filename', () => {
			expect(getExtension('file.js')).toBe('.js')
			expect(getExtension('path/to/file.ts')).toBe('.ts')
			expect(getExtension('file.d.ts')).toBe('.d.ts')
			expect(getExtension('file.test.js')).toBe('.js')
		})

		it('should return an empty string for files without extension', () => {
			expect(getExtension('file')).toBe('')
			expect(getExtension('path/to/file')).toBe('')
		})
	})

	describe('replaceExtension', () => {
		it('should replace the extension of a filename', () => {
			expect(replaceExtension('file.js', '.ts')).toBe('file.ts')
			expect(replaceExtension('path/to/file.js', '.d.ts')).toBe(
				'path/to/file.d.ts',
			)
			expect(replaceExtension('file.test.js', '.ts')).toBe('file.test.ts')
		})

		it('should add extension if file has none', () => {
			expect(replaceExtension('file', '.js')).toBe('file.js')
			expect(replaceExtension('path/to/file', '.ts')).toBe('path/to/file.ts')
		})
	})

	describe('deleteExtension', () => {
		it('should remove the extension from a filename', () => {
			expect(deleteExtension('file.js')).toBe('file')
			expect(deleteExtension('path/to/file.ts')).toBe('path/to/file')
			expect(deleteExtension('file.d.ts')).toBe('file')
			expect(deleteExtension('file.test.js')).toBe('file.test')
		})

		it('should return the original string if no extension exists', () => {
			expect(deleteExtension('file')).toBe('file')
			expect(deleteExtension('path/to/file')).toBe('path/to/file')
		})
	})
})
