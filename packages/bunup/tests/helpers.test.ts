import { describe, expect, it } from 'bun:test'
import {
	getEntryNameOnly,
	normalizeEntryToProcessableEntries,
} from '../src/helpers/entry'

describe('Helpers', () => {
	it('normalizes string entry', () => {
		const result = normalizeEntryToProcessableEntries('src/index.ts')
		expect(result).toEqual([
			{ fullEntryPath: 'src/index.ts', name: 'index' },
		])
	})

	it('normalizes array entry', () => {
		const result = normalizeEntryToProcessableEntries([
			'src/index.ts',
			'src/utils.ts',
		])
		expect(result).toEqual([
			{ fullEntryPath: 'src/index.ts', name: 'index' },
			{ fullEntryPath: 'src/utils.ts', name: 'utils' },
		])
	})

	it('normalizes object entry', () => {
		const result = normalizeEntryToProcessableEntries({
			main: 'src/index.ts',
		})
		expect(result).toEqual([
			{ fullEntryPath: 'src/index.ts', name: 'main' },
		])
	})

	it('handles name conflicts in array entries', () => {
		const result = normalizeEntryToProcessableEntries([
			'src/index.ts',
			'lib/index.ts',
		])
		expect(result.length).toBe(2)
		expect(result[0].name).toBe('index')
		expect(result[1].name).toBe('lib/index')
	})

	it('getEntryNameOnly extracts name', () => {
		expect(getEntryNameOnly('src/index.ts')).toBe('index')
	})

	it('handles empty array', () => {
		const result = normalizeEntryToProcessableEntries([])
		expect(result).toEqual([])
	})

	it('handles empty object', () => {
		const result = normalizeEntryToProcessableEntries({})
		expect(result).toEqual([])
	})

	it('handles entries without file extensions', () => {
		const result = normalizeEntryToProcessableEntries('src/README')
		expect(result).toEqual([
			{ fullEntryPath: 'src/README', name: 'README' },
		])
	})

	it('handles deep nested paths', () => {
		const result = normalizeEntryToProcessableEntries(
			'src/components/ui/Button.ts',
		)
		expect(result).toEqual([
			{
				fullEntryPath: 'src/components/ui/Button.ts',
				name: 'Button',
			},
		])
	})

	it('handles multiple name conflicts with complex resolution', () => {
		const result = normalizeEntryToProcessableEntries([
			'src/components/Button.ts',
			'src/ui/Button.ts',
			'lib/components/Button.ts',
		])

		expect(result.length).toBe(3)
		const outputPaths = result.map((r) => r.name)

		const uniquePaths = new Set(outputPaths)
		expect(uniquePaths.size).toBe(3)

		expect(outputPaths.some((p) => p.includes('components/Button'))).toBe(
			true,
		)
		expect(outputPaths.some((p) => p.includes('ui/Button'))).toBe(true)
		expect(outputPaths.some((p) => p.includes('Button'))).toBe(true)
	})

	it('handles mix of object and array entry types', () => {
		const result = normalizeEntryToProcessableEntries({
			app: 'src/index.ts',
			utils: 'src/utils/index.ts',
			'components/button': 'src/components/Button.ts',
		})

		expect(result).toEqual([
			{ fullEntryPath: 'src/index.ts', name: 'app' },
			{
				fullEntryPath: 'src/utils/index.ts',
				name: 'utils',
			},
			{
				fullEntryPath: 'src/components/Button.ts',
				name: 'components/button',
			},
		])
	})
})
