import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanProjectDir, createProject, runGenerateDts } from './utils'

describe('Code Splitting Tests', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	test('should split shared types into separate chunks', async () => {
		createProject({
			'src/shared.ts': `
				export interface User {
					id: string;
					name: string;
				}

				export type Status = 'active' | 'inactive';
			`,
			'src/client.ts': `
				import type { User, Status } from './shared';

				export function getUser(): User {
					return { id: '1', name: 'John' };
				}

				export function getStatus(): Status {
					return 'active';
				}
			`,
			'src/server.ts': `
				import type { User, Status } from './shared';

				export function createUser(user: User): void {
					console.log(user);
				}

				export function updateStatus(status: Status): void {
					console.log(status);
				}
			`,
		})

		const files = await runGenerateDts(['src/client.ts', 'src/server.ts'], {
			splitting: true,
		})

		expect(files).toHaveLength(3)

		const entryPoints = files.filter((r) => r.kind === 'entry-point')
		const chunks = files.filter((r) => r.kind === 'chunk')

		expect(entryPoints).toHaveLength(2)
		expect(chunks).toHaveLength(1)

		const clientResult = entryPoints.find((r) =>
			r.entrypoint?.includes('client.ts'),
		)
		const serverResult = entryPoints.find((r) =>
			r.entrypoint?.includes('server.ts'),
		)
		const chunkResult = chunks[0]

		expect(clientResult).toBeDefined()
		expect(serverResult).toBeDefined()
		expect(chunkResult).toBeDefined()

		expect(chunkResult.dts).toContain('interface User')
		expect(chunkResult.dts).toContain('type Status')

		expect(clientResult?.dts).toContain(
			`from "./${chunkResult.chunkFileName?.replace('.d.ts', '')}"`,
		)
		expect(serverResult?.dts).toContain(
			`from "./${chunkResult.chunkFileName?.replace('.d.ts', '')}"`,
		)
	})

	test('should handle splitting with nested shared dependencies', async () => {
		createProject({
			'src/base.ts': `
				export interface BaseEntity {
					id: string;
					createdAt: Date;
				}
			`,
			'src/user.ts': `
				import type { BaseEntity } from './base';

				export interface User extends BaseEntity {
					name: string;
					email: string;
				}
			`,
			'src/product.ts': `
				import type { BaseEntity } from './base';

				export interface Product extends BaseEntity {
					title: string;
					price: number;
				}
			`,
			'src/api.ts': `
				import type { User } from './user';
				import type { Product } from './product';

				export function getUser(): User {
					return {} as User;
				}

				export function getProduct(): Product {
					return {} as Product;
				}
			`,
			'src/admin.ts': `
				import type { User } from './user';
				import type { Product } from './product';

				export function deleteUser(user: User): void {}
				export function deleteProduct(product: Product): void {}
			`,
		})

		const files = await runGenerateDts(['src/api.ts', 'src/admin.ts'], {
			splitting: true,
		})

		expect(files.length).toBeGreaterThan(2) // At least 2 entry points, possibly chunks

		const entryPoints = files.filter((r) => r.kind === 'entry-point')
		const chunks = files.filter((r) => r.kind === 'chunk')

		expect(entryPoints).toHaveLength(2)
		expect(chunks.length).toBeGreaterThan(0)

		// Should have shared chunk with BaseEntity, User, Product
		const hasSharedTypes = chunks.some(
			(chunk) =>
				chunk.dts.includes('BaseEntity') ||
				chunk.dts.includes('User') ||
				chunk.dts.includes('Product'),
		)
		expect(hasSharedTypes).toBe(true)
	})

	test('should not create chunks when splitting is disabled', async () => {
		createProject({
			'src/shared.ts': `
				export interface User {
					id: string;
					name: string;
				}
			`,
			'src/client.ts': `
				import type { User } from './shared';
				export function getUser(): User {
					return { id: '1', name: 'John' };
				}
			`,
			'src/server.ts': `
				import type { User } from './shared';
				export function createUser(user: User): void {}
			`,
		})

		const files = await runGenerateDts(['src/client.ts', 'src/server.ts'], {
			splitting: false,
		})

		expect(files).toHaveLength(2) // Only entry points, no chunks
		expect(files.every((r) => r.kind === 'entry-point')).toBe(true)

		// Each entry point should contain the User interface directly
		for (const result of files) {
			expect(result.dts).toContain('interface User')
		}
	})
})

describe('Output Path Tests', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	test('should generate correct outputPath for simple entry points', async () => {
		createProject({
			'src/index.ts': `export const hello = 'world';`,
			'src/utils.ts': `export const util = 'helper';`,
		})

		const files = await runGenerateDts(['src/index.ts', 'src/utils.ts'])

		expect(files).toHaveLength(2)

		const indexResult = files.find((r) => r.entrypoint?.includes('index.ts'))
		const utilsResult = files.find((r) => r.entrypoint?.includes('utils.ts'))

		expect(indexResult?.outputPath).toBe('index.d.ts')
		expect(utilsResult?.outputPath).toBe('utils.d.ts')
		expect(indexResult?.kind).toBe('entry-point')
		expect(utilsResult?.kind).toBe('entry-point')
	})

	test('should generate correct outputPath for nested directories', async () => {
		createProject({
			'src/index.ts': `export const root = 'index';`,
			'src/client/index.ts': `export const client = 'client';`,
			'src/server/index.ts': `export const server = 'server';`,
			'src/utils/helpers.ts': `export const helper = 'util';`,
			'src/api/v1/users.ts': `export const users = 'api';`,
		})

		const files = await runGenerateDts([
			'src/index.ts',
			'src/client/index.ts',
			'src/server/index.ts',
			'src/utils/helpers.ts',
			'src/api/v1/users.ts',
		])

		expect(files).toHaveLength(5)

		const pathMappings = files.map((r) => ({
			entrypoint: r.entrypoint,
			outputPath: r.outputPath,
			kind: r.kind,
		}))

		expect(pathMappings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					entrypoint: expect.stringContaining('src/index.ts'),
					outputPath: 'index.d.ts',
					kind: 'entry-point',
				}),
				expect.objectContaining({
					entrypoint: expect.stringContaining('src/client/index.ts'),
					outputPath: 'client/index.d.ts',
					kind: 'entry-point',
				}),
				expect.objectContaining({
					entrypoint: expect.stringContaining('src/server/index.ts'),
					outputPath: 'server/index.d.ts',
					kind: 'entry-point',
				}),
				expect.objectContaining({
					entrypoint: expect.stringContaining('src/utils/helpers.ts'),
					outputPath: 'utils/helpers.d.ts',
					kind: 'entry-point',
				}),
				expect.objectContaining({
					entrypoint: expect.stringContaining('src/api/v1/users.ts'),
					outputPath: 'api/v1/users.d.ts',
					kind: 'entry-point',
				}),
			]),
		)
	})

	test('should handle outputPath with splitting and complex directory structure', async () => {
		createProject({
			'src/shared/types.ts': `
				export interface User {
					id: string;
					name: string;
				}
			`,
			'src/client/api.ts': `
				import type { User } from '../shared/types';
				export function getUser(): User {
					return { id: '1', name: 'John' };
				}
			`,
			'src/server/routes.ts': `
				import type { User } from '../shared/types';
				export function createUser(user: User): void {}
			`,
			'src/admin/panel.ts': `
				import type { User } from '../shared/types';
				export function deleteUser(user: User): void {}
			`,
		})

		const files = await runGenerateDts(
			['src/client/api.ts', 'src/server/routes.ts', 'src/admin/panel.ts'],
			{ splitting: true },
		)

		const entryPoints = files.filter((r) => r.kind === 'entry-point')
		const chunks = files.filter((r) => r.kind === 'chunk')

		expect(entryPoints).toHaveLength(3)
		expect(chunks.length).toBeGreaterThan(0)

		// Check entry point paths
		const clientResult = entryPoints.find((r) =>
			r.entrypoint?.includes('client/api.ts'),
		)
		const serverResult = entryPoints.find((r) =>
			r.entrypoint?.includes('server/routes.ts'),
		)
		const adminResult = entryPoints.find((r) =>
			r.entrypoint?.includes('admin/panel.ts'),
		)

		expect(clientResult?.outputPath).toBe('client/api.d.ts')
		expect(serverResult?.outputPath).toBe('server/routes.d.ts')
		expect(adminResult?.outputPath).toBe('admin/panel.d.ts')

		// Check that chunks have proper file names
		for (const chunk of chunks) {
			expect(chunk.chunkFileName).toMatch(/^.+\.d\.ts$/)
			expect(chunk.outputPath).toMatch(/^.+\.d\.ts$/)
			expect(chunk.entrypoint).toBeUndefined()
		}
	})

	test('should ensure entry field is correct for entry-point files', async () => {
		createProject({
			'src/index.ts': `export const hello = 'world';`,
			'src/nested/deep/module.ts': `export const deep = 'module';`,
			'lib/external.ts': `export const external = 'lib';`,
		})

		const entryPaths = [
			'src/index.ts',
			'src/nested/deep/module.ts',
			'lib/external.ts',
		]
		const files = await runGenerateDts(entryPaths)

		expect(files).toHaveLength(3)
		expect(files.every((r) => r.kind === 'entry-point')).toBe(true)

		files.forEach((result, index) => {
			expect(result.entrypoint).toContain(entryPaths[index])
			expect(result.chunkFileName).toBeUndefined()
		})
	})

	test('should ensure chunk files have correct properties', async () => {
		createProject({
			'src/shared.ts': `
				export interface SharedType {
					id: string;
				}
			`,
			'src/a.ts': `
				import type { SharedType } from './shared';
				export function funcA(): SharedType { return { id: 'a' }; }
			`,
			'src/b.ts': `
				import type { SharedType } from './shared';
				export function funcB(): SharedType { return { id: 'b' }; }
			`,
		})

		const files = await runGenerateDts(['src/a.ts', 'src/b.ts'], {
			splitting: true,
		})

		const chunks = files.filter((r) => r.kind === 'chunk')

		if (chunks.length > 0) {
			for (const chunk of chunks) {
				expect(chunk.kind).toBe('chunk')
				expect(chunk.entrypoint).toBeUndefined()
				expect(chunk.chunkFileName).toBeDefined()
				expect(chunk.chunkFileName).toMatch(/^.+\.d\.ts$/)
				expect(chunk.outputPath).toBeDefined()
				expect(chunk.dts).toBeDefined()
			}
		}
	})
})
