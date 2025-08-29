import { describe, expect, test } from 'bun:test'
import { createProject, runGenerateDts } from './utils'

describe('DTS Misc', () => {
	test('should generate dts for typescript file with module declarations containing special characters', async () => {
		createProject({
			'src/index.ts': `
              declare module '@bun' {
                interface Env {
                  NODE_ENV: 'development' | 'production'
                }
              }

              type User = {
                name: string
                age: number
              }

              export const user: User = {
                name: 'John',
                age: 30
              }
			`,
		})

		const files = await runGenerateDts(['src/index.ts'])

		expect(files[0].dts).toMatchInlineSnapshot(`
		  "declare module "@bun" {
		  	interface Env {
		  		NODE_ENV: "development" | "production";
		  	}
		  }
		  type User = {
		  	name: string
		  	age: number
		  };
		  declare const user: User;
		  export { user };
		  "
		`)
	})

	test('should not generate dts file if no dts needed', async () => {
		createProject({
			'src/cli.ts': `
					#!/usr/bin/env node
					console.log('Hello World');
					process.exit(0);
				`,
		})

		const files = await runGenerateDts(['src/cli.ts'])

		expect(files).toEqual([])
	})

	test('should generate dts for namespace with imported types using aliases', async () => {
		createProject({
			'src/socket.ts': `
				export type Socket = {
					connect: () => void
				}
				export type Manager = {
					connect: () => void
				}
			`,
			'src/index.ts': `
				import type {
					Socket as ClientSocket,
					Manager as ClientManager,
				} from './socket';

				export namespace Hello {
					export type Socket = ClientSocket;
					export type Manager = ClientManager;
				}
			`,
		})

		const files = await runGenerateDts(['src/index.ts'])

		expect(files[0].dts).toMatchInlineSnapshot(`
		  "type Socket2 = {
		  	connect: () => void
		  };
		  type Manager2 = {
		  	connect: () => void
		  };
		  declare namespace Hello {
		  	type Socket = Socket2;
		  	type Manager = Manager2;
		  }
		  export { Hello };
		  "
		`)
	})
})
