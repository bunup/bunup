import { describe, expect, it } from 'bun:test'
import { createProject, isCI, runBuild } from 'utils'

describe.skipIf(isCI())('chunk splitting', () => {
	it('should generate correctly named chunks and assets in the specified output directory', async () => {
		createProject({
			'src/index.ts': `
				import plain from './plain.txt'
				import("./utils").then(({ hello }) => hello())

				export { plain }
			`,
			'src/utils.ts': 'export function hello() { return "hello" }',
			'src/plain.txt': 'plain',
		})

		const result = await runBuild({
			entry: ['src/index.ts'],
			format: ['esm'],
			splitting: true,
			loader: {
				'.txt': 'file',
			},
		})

		expect(result.success).toBe(true)
		expect(
			result.files.some((file) => file.path.includes('shared/chunk-')),
		).toBe(true)
		expect(result.files.some((file) => file.path.includes('plain-'))).toBe(true)
		expect(result.files.some((file) => file.path.includes('/index.mjs'))).toBe(
			true,
		)
	})

	it('should place JS and DTS chunk files in the shared folder, and not place assets in shared', async () => {
		createProject({
			'src/a.ts': `
				import { SharedType } from './shared-type'
				export const a: SharedType = { value: 'a' }
				import txt from './asset.txt'
				export { txt }
			`,
			'src/b.ts': `
				import { SharedType } from './shared-type'
				export const b: SharedType = { value: 'b' }
			`,
			'src/shared-type.ts': `
				export type SharedType = { value: string }
			`,
			'src/asset.txt': 'hello asset',
		})

		const result = await runBuild({
			entry: ['src/a.ts', 'src/b.ts'],
			format: ['esm', 'cjs'],
			splitting: true,
			dts: { splitting: true },
			loader: {
				'.txt': 'file',
			},
		})

		expect(result.success).toBe(true)

		const jsChunkFiles = result.files.filter(
			(f) =>
				f.path.includes('shared/chunk-') &&
				(f.path.endsWith('.js') || f.path.endsWith('.mjs')),
		)
		expect(jsChunkFiles.length).toBeGreaterThan(0)

		const dtsChunkFiles = result.files.filter(
			(f) =>
				f.path.includes('shared/chunk-') &&
				(f.path.endsWith('.d.ts') ||
					f.path.endsWith('.d.mts') ||
					f.path.endsWith('.d.cts')),
		)
		expect(dtsChunkFiles).toHaveLength(1)

		const assetFile = result.files.find((f) => f.path.includes('asset'))
		expect(assetFile).toBeDefined()
		expect(assetFile?.path.includes('shared/')).toBe(false)
	})

	it('should only create one dts chunk file per chunk regardless of formats', async () => {
		createProject({
			'src/a.ts': `
				import { SharedType } from './shared-type'
				export const a: SharedType = { value: 'a' }
			`,
			'src/b.ts': `
				import { SharedType } from './shared-type'
				export const b: SharedType = { value: 'b' }
			`,
			'src/shared-type.ts': `
				export type SharedType = { value: string }
			`,
		})

		const result = await runBuild({
			entry: ['src/a.ts', 'src/b.ts'],
			format: ['esm', 'cjs'],
			splitting: true,
			dts: { splitting: true },
		})

		expect(result.success).toBe(true)

		const dtsChunkFiles = result.files.filter(
			(f) =>
				f.path.includes('shared/chunk-') &&
				(f.path.endsWith('.d.ts') ||
					f.path.endsWith('.d.mts') ||
					f.path.endsWith('.d.cts')),
		)

		const chunkBaseNames = new Set<string>()
		for (const file of dtsChunkFiles) {
			const match = file.path.match(/shared\/(chunk-[^/.]+)/)
			if (match) {
				chunkBaseNames.add(match[1])
			}
		}
		for (const base of chunkBaseNames) {
			const filesForChunk = dtsChunkFiles.filter((f) =>
				f.path.includes(`shared/${base}.d.`),
			)
			expect(filesForChunk.length).toBe(1)
			expect(filesForChunk[0].path.endsWith('.d.ts')).toBe(true)
		}
	})

	it('should prefix all chunk file names with the provided name in build config', async () => {
		createProject({
			'src/entry1.ts': `
				import { sharedUtil } from './shared'
				export const foo = sharedUtil('foo')
			`,
			'src/entry2.ts': `
				import { sharedUtil } from './shared'
				export const bar = sharedUtil('bar')
			`,
			'src/shared.ts': `
				export function sharedUtil(x: string) { return x.toUpperCase() }
			`,
		})

		const result = await runBuild({
			entry: ['src/entry1.ts', 'src/entry2.ts'],
			format: ['esm', 'cjs'],
			splitting: true,
			name: 'mybundle',
		})

		expect(result.success).toBe(true)

		const chunkFiles = result.files.filter((f) => f.path.includes('shared/'))

		expect(chunkFiles.length).toBeGreaterThan(0)
		for (const file of chunkFiles) {
			const baseName = file.path.split('/').pop()
			expect(baseName.startsWith('mybundle-')).toBe(true)
		}
	})
})
