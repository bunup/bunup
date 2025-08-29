import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanProjectDir, createProject, runGenerateDts } from './utils'

describe('generateDts', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	describe('Basic functionality', () => {
		test('should generate declaration for simple function', async () => {
			createProject({
				'src/index.ts': `
					export function hello(name: string): string {
						return \`Hello \${name}!\`
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function hello(name: string): string;
			  export { hello };
			  "
			`)
		})

		test('should generate declaration for class', async () => {
			createProject({
				'src/index.ts': `
					export class Calculator {
						add(a: number, b: number): number {
							return a + b
						}

						private value: number = 0

						getValue(): number {
							return this.value
						}
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare class Calculator {
			  	add(a: number, b: number): number;
			  	private value;
			  	getValue(): number;
			  }
			  export { Calculator };
			  "
			`)
		})

		test('should generate declaration for interface', async () => {
			createProject({
				'src/index.ts': `
					export interface User {
						id: number
						name: string
						email?: string
						readonly createdAt: Date
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface User {
			  	id: number;
			  	name: string;
			  	email?: string;
			  	readonly createdAt: Date;
			  }
			  export { User };
			  "
			`)
		})

		test('should generate declaration for type alias', async () => {
			createProject({
				'src/index.ts': `
					export type Status = 'pending' | 'completed' | 'failed'
					export type UserWithStatus = User & { status: Status }

					interface User {
						id: number
						name: string
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "type Status = "pending" | "completed" | "failed";
			  type UserWithStatus = User & {
			  	status: Status
			  };
			  interface User {
			  	id: number;
			  	name: string;
			  }
			  export { UserWithStatus, Status };
			  "
			`)
		})

		test('should generate declaration for enum', async () => {
			createProject({
				'src/index.ts': `
					export enum Color {
						Red = 'red',
						Green = 'green',
						Blue = 'blue'
					}

					export enum Direction {
						Up,
						Down,
						Left,
						Right
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare enum Color {
			  	Red = "red",
			  	Green = "green",
			  	Blue = "blue"
			  }
			  declare enum Direction {
			  	Up = 0,
			  	Down = 1,
			  	Left = 2,
			  	Right = 3
			  }
			  export { Direction, Color };
			  "
			`)
		})

		test('should generate declaration for variable exports', async () => {
			createProject({
				'src/index.ts': `
					export const API_URL: string = 'https://api.example.com'
					export let counter: number = 0
					export var isEnabled: boolean = true
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare const API_URL: string;
			  declare let counter: number;
			  declare var isEnabled: boolean;
			  export { isEnabled, counter, API_URL };
			  "
			`)
		})
	})

	describe('Default exports', () => {
		test('should generate declaration for default function export', async () => {
			createProject({
				'src/index.ts': `
					export default function greet(name: string): string {
						return \`Hello, \${name}!\`
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function greet(name: string): string;
			  export { greet as default };
			  "
			`)
		})

		test('should generate declaration for default class export', async () => {
			createProject({
				'src/index.ts': `
					export default class Database {
						private connection: string = ''

						connect(): void {}
						disconnect(): void {}

						query<T>(sql: string): Promise<T[]> {
							return Promise.resolve([])
						}
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare class Database {
			  	private connection;
			  	connect(): void;
			  	disconnect(): void;
			  	query<T>(sql: string): Promise<T[]>;
			  }
			  export { Database as default };
			  "
			`)
		})

		test('should generate declaration for default interface export', async () => {
			createProject({
				'src/index.ts': `
					interface Config {
						apiUrl: string
						timeout: number
						retries?: number
					}
					export default Config
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface Config {
			  	apiUrl: string;
			  	timeout: number;
			  	retries?: number;
			  }
			  export { Config as default };
			  "
			`)
		})
	})

	describe('Mixed exports', () => {
		test('should handle multiple export types in single file', async () => {
			createProject({
				'src/index.ts': `
					export interface User {
						id: number
						name: string
					}

					export class UserService {
						getUser(id: number): User | null {
							return null
						}

						createUser(data: Omit<User, 'id'>): User {
							return { id: Date.now(), ...data }
						}
					}

					export const DEFAULT_USER: User = { id: 0, name: 'Guest' }

					export function validateUser(user: User): boolean {
						return user.name.length > 0
					}

					export default UserService
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface User {
			  	id: number;
			  	name: string;
			  }
			  declare class UserService {
			  	getUser(id: number): User | null;
			  	createUser(data: Omit<User, "id">): User;
			  }
			  declare const DEFAULT_USER: User;
			  declare function validateUser(user: User): boolean;
			  export { validateUser, UserService as default, UserService, User, DEFAULT_USER };
			  "
			`)
		})
	})

	describe('Generics', () => {
		test('should handle generic functions', async () => {
			createProject({
				'src/index.ts': `
					export function identity<T>(value: T): T {
						return value
					}

					export function map<T, U>(items: T[], fn: (item: T) => U): U[] {
						return items.map(fn)
					}

					export function filter<T>(items: T[], predicate: (item: T, index: number) => boolean): T[] {
						return items.filter(predicate)
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function identity<T>(value: T): T;
			  declare function map<
			  	T,
			  	U
			  >(items: T[], fn: (item: T) => U): U[];
			  declare function filter<T>(items: T[], predicate: (item: T, index: number) => boolean): T[];
			  export { map, identity, filter };
			  "
			`)
		})

		test('should handle generic classes', async () => {
			createProject({
				'src/index.ts': `
					export class Container<T> {
						private value: T

						constructor(value: T) {
							this.value = value
						}

						get(): T {
							return this.value
						}

						set(value: T): void {
							this.value = value
						}

						map<U>(fn: (value: T) => U): Container<U> {
							return new Container(fn(this.value))
						}
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare class Container<T> {
			  	private value;
			  	constructor(value: T);
			  	get(): T;
			  	set(value: T): void;
			  	map<U>(fn: (value: T) => U): Container<U>;
			  }
			  export { Container };
			  "
			`)
		})

		test('should handle generic interfaces with constraints', async () => {
			createProject({
				'src/index.ts': `
					export interface Repository<T extends { id: string }> {
						findById(id: string): Promise<T | null>
						save(entity: T): Promise<T>
						delete(id: string): Promise<void>
					}

					export interface PaginatedResponse<T> {
						data: T[]
						total: number
						page: number
						limit: number
					}

					export interface ApiClient<T = any> {
						get<U = T>(url: string): Promise<PaginatedResponse<U>>
						post<U = T>(url: string, data: U): Promise<U>
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface Repository<T extends {
			  	id: string
			  }> {
			  	findById(id: string): Promise<T | null>;
			  	save(entity: T): Promise<T>;
			  	delete(id: string): Promise<void>;
			  }
			  interface PaginatedResponse<T> {
			  	data: T[];
			  	total: number;
			  	page: number;
			  	limit: number;
			  }
			  interface ApiClient<T = any> {
			  	get<U = T>(url: string): Promise<PaginatedResponse<U>>;
			  	post<U = T>(url: string, data: U): Promise<U>;
			  }
			  export { Repository, PaginatedResponse, ApiClient };
			  "
			`)
		})
	})

	describe('Namespaces', () => {
		test('should handle namespace declarations', async () => {
			createProject({
				'src/index.ts': `
					export namespace Utils {
						export function isString(value: any): value is string {
							return typeof value === 'string'
						}

						export function isNumber(value: any): value is number {
							return typeof value === 'number'
						}

						export const VERSION: string = '1.0.0'

						export interface Config {
							debug: boolean
						}
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare namespace Utils {
			  	function isString(value: any): value is string;
			  	function isNumber(value: any): value is number;
			  	const VERSION: string;
			  	interface Config {
			  		debug: boolean;
			  	}
			  }
			  export { Utils };
			  "
			`)
		})
	})

	describe('Comments preservation', () => {
		test('should preserve JSDoc comments', async () => {
			createProject({
				'src/index.ts': `
					/**
					 * Calculates the sum of two numbers
					 * @param a - First number
					 * @param b - Second number
					 * @returns The sum of a and b
					 * @example
					 * \`\`\`ts
					 * add(2, 3) // returns 5
					 * \`\`\`
					 */
					export function add(a: number, b: number): number {
						return a + b
					}

					/**
					 * A user interface with comprehensive documentation
					 */
					export interface User {
						/** Unique identifier */
						id: number
						/** User's full name */
						name: string
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "/**
			  * Calculates the sum of two numbers
			  * @param a - First number
			  * @param b - Second number
			  * @returns The sum of a and b
			  * @example
			  * \`\`\`ts
			  * add(2, 3) // returns 5
			  * \`\`\`
			  */
			  declare function add(a: number, b: number): number;
			  /**
			  * A user interface with comprehensive documentation
			  */
			  interface User {
			  	/** Unique identifier */
			  	id: number;
			  	/** User's full name */
			  	name: string;
			  }
			  export { add, User };
			  "
			`)
		})
	})

	describe('Advanced TypeScript features', () => {
		test('should handle utility types and conditional types', async () => {
			createProject({
				'src/index.ts': `
					export type Optional<T> = T | undefined
					export type NonNullable<T> = T extends null | undefined ? never : T

					export interface User {
						id: number
						name: string
						email?: string
					}

					export type PartialUser = Partial<User>
					export type RequiredUser = Required<User>
					export type UserKeys = keyof User
					export type UserEmail = Pick<User, 'email'>
					export type UserWithoutId = Omit<User, 'id'>
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "type Optional<T> = T | undefined;
			  type NonNullable<T> = T extends null | undefined ? never : T;
			  interface User {
			  	id: number;
			  	name: string;
			  	email?: string;
			  }
			  type PartialUser = Partial<User>;
			  type RequiredUser = Required<User>;
			  type UserKeys = keyof User;
			  type UserEmail = Pick<User, "email">;
			  type UserWithoutId = Omit<User, "id">;
			  export { UserWithoutId, UserKeys, UserEmail, User, RequiredUser, PartialUser, Optional, NonNullable };
			  "
			`)
		})

		test('should handle async functions and promises', async () => {
			createProject({
				'src/index.ts': `
					export async function fetchData(url: string): Promise<string> {
						const response = await fetch(url)
						return response.text()
					}

					export async function* generateNumbers(count: number): AsyncGenerator<number, void, unknown> {
						for (let i = 0; i < count; i++) {
							yield i
						}
					}

					export function createPromise<T>(value: T): Promise<T> {
						return Promise.resolve(value)
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function fetchData(url: string): Promise<string>;
			  declare function generateNumbers(count: number): AsyncGenerator<number, void, unknown>;
			  declare function createPromise<T>(value: T): Promise<T>;
			  export { generateNumbers, fetchData, createPromise };
			  "
			`)
		})

		test('should handle complex inheritance and mixins', async () => {
			createProject({
				'src/index.ts': `
					export abstract class Animal {
						abstract makeSound(): string

						getName(): string {
							return 'Animal'
						}

						protected age: number = 0
					}

					export class Dog extends Animal {
						makeSound(): string {
							return 'Woof!'
						}

						fetch(): void {}
					}

					export interface Flyable {
						fly(): void
						altitude: number
					}

					export interface Swimmer {
						swim(): void
						depth: number
					}

					export class Bird extends Animal implements Flyable {
						altitude: number = 0

						makeSound(): string {
							return 'Tweet!'
						}

						fly(): void {}
					}

					export class Duck extends Animal implements Flyable, Swimmer {
						altitude: number = 0
						depth: number = 0

						makeSound(): string {
							return 'Quack!'
						}

						fly(): void {}
						swim(): void {}
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare abstract class Animal {
			  	abstract makeSound(): string;
			  	getName(): string;
			  	protected age: number;
			  }
			  declare class Dog extends Animal {
			  	makeSound(): string;
			  	fetch(): void;
			  }
			  interface Flyable {
			  	fly(): void;
			  	altitude: number;
			  }
			  interface Swimmer {
			  	swim(): void;
			  	depth: number;
			  }
			  declare class Bird extends Animal implements Flyable {
			  	altitude: number;
			  	makeSound(): string;
			  	fly(): void;
			  }
			  declare class Duck extends Animal implements Flyable, Swimmer {
			  	altitude: number;
			  	depth: number;
			  	makeSound(): string;
			  	fly(): void;
			  	swim(): void;
			  }
			  export { Swimmer, Flyable, Duck, Dog, Bird, Animal };
			  "
			`)
		})
	})

	describe('Options', () => {
		test('should use custom cwd option', async () => {
			createProject({
				'nested/src/index.ts': `
					export function test(): string {
						return 'test'
					}
				`,
			})

			const files = await runGenerateDts(['nested/src/index.ts'], {
				cwd: 'project',
			})

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function test(): string;
			  export { test };
			  "
			`)
		})

		test('should use custom tsconfig path', async () => {
			createProject({
				'tsconfig.custom.json': JSON.stringify({
					compilerOptions: {
						strict: true,
						declaration: true,
						isolatedDeclarations: true,
					},
				}),
				'src/index.ts': `
					export function test(): string {
						return 'test'
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'], {
				preferredTsConfigPath: 'project/tsconfig.custom.json',
			})

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function test(): string;
			  export { test };
			  "
			`)
		})
	})
})
