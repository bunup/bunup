import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanProjectDir, createProject, runGenerateDts } from './utils'

describe('Bundle functionality', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	describe('Imports and re-exports', () => {
		test('should handle basic imports', async () => {
			createProject({
				'src/types.ts': `
					export interface User {
						id: number
						name: string
					}

					export type UserRole = 'admin' | 'user' | 'guest'
				`,
				'src/index.ts': `
					import { User, UserRole } from './types'

					export function getUser(id: number): User | null {
						return null
					}

					export function hasRole(user: User, role: UserRole): boolean {
						return true
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface User {
			  	id: number;
			  	name: string;
			  }
			  type UserRole = "admin" | "user" | "guest";
			  declare function getUser(id: number): User | null;
			  declare function hasRole(user: User, role: UserRole): boolean;
			  export { hasRole, getUser };
			  "
			`)
		})

		test('should handle re-exports', async () => {
			createProject({
				'src/types.ts': `
					export interface User {
						id: number
						name: string
					}

					export type UserRole = 'admin' | 'user'

					export class UserValidator {
						validate(user: User): boolean {
							return true
						}
					}
				`,
				'src/index.ts': `
					export { User, type UserRole, UserValidator } from './types'

					export function createUser(name: string): User {
						return { id: Date.now(), name }
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface User2 {
			  	id: number;
			  	name: string;
			  }
			  type UserRole = "admin" | "user";
			  declare class UserValidator {
			  	validate(user: User2): boolean;
			  }
			  declare function createUser(name: string): User;
			  export { createUser, UserValidator, UserRole, User2 as User };
			  "
			`)
		})

		test('should handle export all from another file', async () => {
			createProject({
				'src/utils.ts': `
					export function test(): string {
						return 'test'
					}

					export const test2 = 'test2'
				`,
				'src/index.ts': `
					export * from './utils'
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function test(): string;
			  declare const test2 = "test2";
			  export { test2, test };
			  "
			`)
		})

		test('should handle export all', async () => {
			createProject({
				'src/types.ts': `
					export interface User {
						id: number
						name: string
					}

					export type UserRole = 'admin' | 'user'

					export enum UserStatus {
						Active,
						Inactive
					}
				`,
				'src/index.ts': `
					export * from './types'

					export function createUser(name: string): User {
						return { id: Date.now(), name }
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface User2 {
			  	id: number;
			  	name: string;
			  }
			  type UserRole = "admin" | "user";
			  declare enum UserStatus {
			  	Active = 0,
			  	Inactive = 1
			  }
			  declare function createUser(name: string): User;
			  export { createUser, UserStatus, UserRole, User2 as User };
			  "
			`)
		})

		test('should handle import all and export all', async () => {
			createProject({
				'src/utils.ts': `
					export function test(): string {
						return 'test'
					}

					export const test2 = 'test2'
				`,
				'src/index.ts': `
					import * as utils from './utils'
					export { utils }
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare namespace exports_utils {
			  	export { test2, test };
			  }
			  declare function test(): string;
			  declare const test2 = "test2";
			  export { exports_utils as utils };
			  "
			`)
		})

		test('should handle function import with ReturnType utility type', async () => {
			createProject({
				'src/api.ts': `
					export function fetchUser(): { id: number; name: string; email: string } {
						return { id: 1, name: 'John', email: 'john@example.com' }
					}

					export async function fetchData(): Promise<{ data: string; timestamp: number }> {
						return { data: 'test', timestamp: Date.now() }
					}
				`,
				'src/index.ts': `
					import { fetchUser, fetchData } from './api'

					export type User = ReturnType<typeof fetchUser>
					export type ApiResponse = ReturnType<typeof fetchData>
					export type UserEmail = User['email']

					export function processUser(user: User): UserEmail {
						return user.email
					}

					export function createUser(): User {
						return fetchUser()
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function fetchUser(): {
			  	id: number
			  	name: string
			  	email: string
			  };
			  declare function fetchData(): Promise<{
			  	data: string
			  	timestamp: number
			  }>;
			  type User = ReturnType<typeof fetchUser>;
			  type ApiResponse = ReturnType<typeof fetchData>;
			  type UserEmail = User["email"];
			  declare function processUser(user: User): UserEmail;
			  declare function createUser(): User;
			  export { processUser, createUser, UserEmail, User, ApiResponse };
			  "
			`)
		})
	})

	describe('Complex bundling scenarios', () => {
		test('should handle import all and export all as default', async () => {
			createProject({
				'src/utils.ts': `
					export function test(): string {
						return 'test'
					}

					export const test2 = 'test2'
				`,
				'src/index.ts': `
					import * as utils from './utils'
					export default utils
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare namespace exports_utils {
			  	export { test2, test };
			  }
			  declare function test(): string;
			  declare const test2 = "test2";
			  export { exports_utils as default };
			  "
			`)
		})

		test('should handle importing and re-exporting functions with namespace preservation', async () => {
			createProject({
				'src/math.ts': `
					export function calculate(a: number, b: number): number {
						return a + b
					}

					export const PI = 3.14159
				`,
				'src/string.ts': `
					export function calculate(text: string): string {
						return text.toUpperCase()
					}

					export const EMPTY = ''
				`,
				'src/index.ts': `
					import * as str from './string'
					export type CalculateReturnType = ReturnType<typeof str.calculate>
					export * from './string'
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare namespace exports_string {
			  	export { calculate, EMPTY };
			  }
			  declare function calculate(text: string): string;
			  declare const EMPTY = "";
			  type CalculateReturnType = ReturnType<typeof exports_string.calculate>;
			  export { calculate, EMPTY, CalculateReturnType };
			  "
			`)
		})

		test('should handle renaming exports using as keyword', async () => {
			createProject({
				'src/utils.ts': `
					export function process(data: string): string {
						return data.trim()
					}

					export function validate(input: string): boolean {
						return input.length > 0
					}

					export const CONFIG = { debug: true }
				`,
				'src/index.ts': `
					export {
						process as processString,
						validate as validateInput,
						CONFIG as AppConfig
					} from './utils'

					export function newFunction(): string {
						return 'new'
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function process(data: string): string;
			  declare function validate(input: string): boolean;
			  declare const CONFIG: {
			  	debug: boolean
			  };
			  declare function newFunction(): string;
			  export { validate as validateInput, process as processString, newFunction, CONFIG as AppConfig };
			  "
			`)
		})

		test('should handle exporting as default using as keyword', async () => {
			createProject({
				'src/logger.ts': `
					export class Logger {
						log(message: string): void {
							console.log(message)
						}

						error(message: string): void {
							console.error(message)
						}
					}

					export const LOG_LEVELS = {
						INFO: 'info',
						ERROR: 'error',
						DEBUG: 'debug'
					} as const
				`,
				'src/config.ts': `
					export interface AppConfig {
						apiUrl: string
						timeout: number
					}

					export const defaultConfig: AppConfig = {
						apiUrl: 'https://api.example.com',
						timeout: 5000
					}
				`,
				'src/index.ts': `
					export { Logger as default, LOG_LEVELS } from './logger'
					export { AppConfig, defaultConfig as config } from './config'
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare class Logger {
			  	log(message: string): void;
			  	error(message: string): void;
			  }
			  declare const LOG_LEVELS: {
			  	readonly INFO: "info"
			  	readonly ERROR: "error"
			  	readonly DEBUG: "debug"
			  };
			  interface AppConfig {
			  	apiUrl: string;
			  	timeout: number;
			  }
			  declare const defaultConfig: AppConfig;
			  export { Logger as default, defaultConfig as config, LOG_LEVELS, AppConfig };
			  "
			`)
		})

		test('should handle nested dependencies', async () => {
			createProject({
				'src/types/user.ts': `
					export interface User {
						id: number
						name: string
					}
				`,
				'src/types/index.ts': `
					export { User } from './user'
					export type UserRole = 'admin' | 'user'
				`,
				'src/services/user.ts': `
					import { User, UserRole } from '../types'

					export class UserService {
						getUser(id: number): User | null {
							return null
						}

						hasRole(user: User, role: UserRole): boolean {
							return true
						}
					}
				`,
				'src/index.ts': `
					export * from './types'
					export * from './services/user'
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface User {
			  	id: number;
			  	name: string;
			  }
			  type UserRole = "admin" | "user";
			  declare class UserService {
			  	getUser(id: number): User | null;
			  	hasRole(user: User, role: UserRole): boolean;
			  }
			  export { UserService, UserRole, User };
			  "
			`)
		})
	})

	describe('TypeScript import/export syntax jsifying', () => {
		test('should handle type-only imports', async () => {
			createProject({
				'src/types.ts': `
					export interface User {
						id: number
						name: string
					}

					export interface Product {
						id: string
						price: number
					}

					export class UserService {
						getUser(): User | null {
							return null
						}
					}
				`,
				'src/index.ts': `
					import type { User, Product } from './types'
					import { UserService } from './types'

					export function createUser(service: UserService): User | null {
						return service.getUser()
					}

					export type { User, Product }
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface User {
			  	id: number;
			  	name: string;
			  }
			  interface Product {
			  	id: string;
			  	price: number;
			  }
			  declare class UserService {
			  	getUser(): User | null;
			  }
			  declare function createUser(service: UserService): User | null;
			  export { createUser, User, Product };
			  "
			`)
		})

		test('should handle mixed type and value imports in destructuring', async () => {
			createProject({
				'src/types.ts': `
					export interface Config {
						apiUrl: string
						timeout: number
					}

					export type Theme = 'light' | 'dark'

					export const DEFAULT_CONFIG: Config = {
						apiUrl: 'https://api.example.com',
						timeout: 5000
					}

					export function validateConfig(config: Config): boolean {
						return config.timeout > 0
					}
				`,
				'src/index.ts': `
					import { type Config, type Theme, DEFAULT_CONFIG, validateConfig } from './types'

					export function useConfig(): Config {
						return DEFAULT_CONFIG
					}

					export function isValidConfig(config: Config): boolean {
						return validateConfig(config)
					}

					export type { Config, Theme }
					export { DEFAULT_CONFIG }
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface Config {
			  	apiUrl: string;
			  	timeout: number;
			  }
			  type Theme = "light" | "dark";
			  declare const DEFAULT_CONFIG: Config;
			  declare function useConfig(): Config;
			  declare function isValidConfig(config: Config): boolean;
			  export { useConfig, isValidConfig, Theme, DEFAULT_CONFIG, Config };
			  "
			`)
		})

		test('should handle type imports with renaming', async () => {
			createProject({
				'src/models.ts': `
					export interface UserModel {
						id: number
						username: string
					}

					export interface ProductModel {
						sku: string
						name: string
					}

					export type Status = 'active' | 'inactive'
				`,
				'src/index.ts': `
					import {
						type UserModel as User,
						type ProductModel as Product,
						type Status as ItemStatus
					} from './models'

					export interface Order {
						user: User
						products: Product[]
						status: ItemStatus
					}

					export type { User, Product, ItemStatus }
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface UserModel {
			  	id: number;
			  	username: string;
			  }
			  interface ProductModel {
			  	sku: string;
			  	name: string;
			  }
			  type Status = "active" | "inactive";
			  interface Order {
			  	user: UserModel;
			  	products: ProductModel[];
			  	status: Status;
			  }
			  export { UserModel as User, ProductModel as Product, Order, Status as ItemStatus };
			  "
			`)
		})

		test('should handle type-only re-exports', async () => {
			createProject({
				'src/core.ts': `
					export interface CoreConfig {
						debug: boolean
						version: string
					}

					export class CoreService {
						config: CoreConfig
						constructor(config: CoreConfig) {
							this.config = config
						}
					}

					export type LogLevel = 'info' | 'warn' | 'error'
				`,
				'src/index.ts': `
					export type { CoreConfig, LogLevel } from './core'
					export { CoreService } from './core'

					export function createDefaultConfig(): CoreConfig {
						return { debug: false, version: '1.0.0' }
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface CoreConfig2 {
			  	debug: boolean;
			  	version: string;
			  }
			  declare class CoreService {
			  	config: CoreConfig2;
			  	constructor(config: CoreConfig2);
			  }
			  type LogLevel = "info" | "warn" | "error";
			  declare function createDefaultConfig(): CoreConfig;
			  export { createDefaultConfig, LogLevel, CoreService, CoreConfig2 as CoreConfig };
			  "
			`)
		})

		test('should handle default type imports and exports', async () => {
			createProject({
				'src/component.ts': `
					export default interface Component {
						render(): void
						name: string
					}

					export interface ComponentProps {
						className?: string
					}
				`,
				'src/index.ts': `
					import type Component from './component'
					import type { ComponentProps } from './component'

					export default class MyComponent implements Component {
						name = 'MyComponent'
						render(): void {
							console.log('rendering')
						}
					}

					export type { Component, ComponentProps }
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface Component {
			  	render(): void;
			  	name: string;
			  }
			  interface ComponentProps {
			  	className?: string;
			  }
			  declare class MyComponent implements Component {
			  	name: string;
			  	render(): void;
			  }
			  export { MyComponent as default, ComponentProps, Component };
			  "
			`)
		})

		test('should handle namespace type imports', async () => {
			createProject({
				'src/types.ts': `
					export interface User {
						id: number
						name: string
					}

					export interface Post {
						id: number
						title: string
						author: User
					}

					export type Permission = 'read' | 'write' | 'admin'
				`,
				'src/index.ts': `
					import type * as Types from './types'

					export function createPost(author: Types.User): Types.Post {
						return {
							id: 1,
							title: 'New Post',
							author
						}
					}

					export function hasPermission(user: Types.User, perm: Types.Permission): boolean {
						return true
					}

					export type { Types }
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare namespace exports_types {
			  	export { User2 as User, Post2 as Post, Permission2 as Permission };
			  }
			  interface User2 {
			  	id: number;
			  	name: string;
			  }
			  interface Post2 {
			  	id: number;
			  	title: string;
			  	author: User2;
			  }
			  type Permission2 = "read" | "write" | "admin";
			  declare function createPost(author: exports_types.User): exports_types.Post;
			  declare function hasPermission(user: exports_types.User, perm: exports_types.Permission): boolean;
			  export { hasPermission, createPost, exports_types as Types };
			  "
			`)
		})

		test('should handle type imports in export statements', async () => {
			createProject({
				'src/base.ts': `
					export interface BaseEntity {
						id: string
						createdAt: Date
					}

					export interface Timestamped {
						updatedAt: Date
					}
				`,
				'src/user.ts': `
					import type { BaseEntity, Timestamped } from './base'

					export interface User extends BaseEntity, Timestamped {
						email: string
					}
				`,
				'src/index.ts': `
					export { type User } from './user'
					export { type BaseEntity, type Timestamped } from './base'
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface BaseEntity {
			  	id: string;
			  	createdAt: Date;
			  }
			  interface Timestamped {
			  	updatedAt: Date;
			  }
			  interface User extends BaseEntity, Timestamped {
			  	email: string;
			  }
			  export { User, Timestamped, BaseEntity };
			  "
			`)
		})

		test('should handle complex mixed imports with default and named imports', async () => {
			createProject({
				'src/framework.ts': `
					export default class Framework {
						name = 'MyFramework'
					}

					export interface FrameworkConfig {
						plugins: string[]
					}

					export type FrameworkHook = () => void

					export const VERSION = '1.0.0'
				`,
				'src/index.ts': `
					import Framework, {
						type FrameworkConfig,
						type FrameworkHook as Hook,
						VERSION
					} from './framework'

					export { Framework as default, VERSION }
					export type { FrameworkConfig, Hook }

					export function createFramework(config: FrameworkConfig): Framework {
						return new Framework()
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare class Framework {
			  	name: string;
			  }
			  interface FrameworkConfig {
			  	plugins: string[];
			  }
			  type FrameworkHook = () => void;
			  declare const VERSION = "1.0.0";
			  declare function createFramework(config: FrameworkConfig): Framework;
			  export { Framework as default, createFramework, VERSION, FrameworkHook as Hook, FrameworkConfig };
			  "
			`)
		})

		test('should handle type-only exports with all variations', async () => {
			createProject({
				'src/models.ts': `
					export interface Model {
						id: string
					}

					export type ModelType = 'user' | 'post' | 'comment'

					export class ModelFactory {
						create(type: ModelType): Model {
							return { id: '1' }
						}
					}

					export const MODEL_VERSION = 2
				`,
				'src/services.ts': `
					import { Model, ModelType, ModelFactory } from './models'

					export class Service {
						factory: ModelFactory = new ModelFactory()

						getModel(type: ModelType): Model {
							return this.factory.create(type)
						}
					}
				`,
				'src/index.ts': `
					// Re-export everything with type annotations
					export { type Model, type ModelType, ModelFactory, MODEL_VERSION } from './models'
					export { Service } from './services'

					// Type-only re-export
					export type { Model as BaseModel } from './models'
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "interface Model {
			  	id: string;
			  }
			  type ModelType = "user" | "post" | "comment";
			  declare class ModelFactory {
			  	create(type: ModelType): Model;
			  }
			  declare const MODEL_VERSION = 2;
			  declare class Service {
			  	factory: ModelFactory;
			  	getModel(type: ModelType): Model;
			  }
			  export { Service, ModelType, ModelFactory, Model, MODEL_VERSION, Model as BaseModel };
			  "
			`)
		})

		test('should handle import equals syntax', async () => {
			createProject({
				'src/legacy.ts': `
					export = {
						legacyFunction(): string {
							return 'legacy'
						},
						LEGACY_CONSTANT: 42
					}
				`,
				'src/index.ts': `
					import legacy = require('./legacy')

					export function useLegacy(): string {
						return legacy.legacyFunction()
					}

					export const constant: number = legacy.LEGACY_CONSTANT
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function useLegacy(): string;
			  declare const constant: number;
			  export { useLegacy, constant };
			  "
			`)
		})

		test('should handle function overloads', async () => {
			createProject({
				'src/index.ts': `
					/**
					 * Process a string value
					 * @param value - The string to process
					 * @returns The processed string in uppercase
					 */
					export function processValue(value: string): string;
					/**
					 * Process a numeric value
					 * @param value - The number to process
					 * @returns The doubled number
					 */
					export function processValue(value: number): number;
					/**
					 * Process a boolean value
					 * @param value - The boolean to process
					 * @returns The inverted boolean
					 */
					export function processValue(value: boolean): boolean;
					export function processValue(value: string | number | boolean): string | number | boolean {
						if (typeof value === 'string') {
							return value.toUpperCase();
						}
						if (typeof value === 'number') {
							return value * 2;
						}
						return !value;
					}

					export function createItem(name: string): { name: string };
					export function createItem(id: number, name: string): { id: number; name: string };
					export function createItem(nameOrId: string | number, name?: string): any {
						if (typeof nameOrId === 'string') {
							return { name: nameOrId };
						}
						return { id: nameOrId, name };
					}
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "/**
			  * Process a string value
			  * @param value - The string to process
			  * @returns The processed string in uppercase
			  */
			  declare function processValue(value: string): string;
			  /**
			  * Process a numeric value
			  * @param value - The number to process
			  * @returns The doubled number
			  */
			  declare function processValue(value: number): number;
			  /**
			  * Process a boolean value
			  * @param value - The boolean to process
			  * @returns The inverted boolean
			  */
			  declare function processValue(value: boolean): boolean;
			  declare function createItem(name: string): {
			  	name: string
			  };
			  declare function createItem(id: number, name: string): {
			  	id: number
			  	name: string
			  };
			  export { processValue, createItem };
			  "
			`)
		})
	})
	describe('Ensure tokenization does not break build', () => {
		test('should inline referenced function with camel case name', async () => {
			createProject({
				'src/index.ts': `
					export function camelCaseFunction(): string {
						return "CamelCaseFunction"
					}

					export type CamelCaseFunction = ReturnType<typeof camelCaseFunction>
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare function camelCaseFunction(): string;
			  type CamelCaseFunction = ReturnType<typeof camelCaseFunction>;
			  export { camelCaseFunction, CamelCaseFunction };
			  "
			`)
		})

		test('should not detect camel case strings as identifiers', async () => {
			createProject({
				'src/index.ts': `
					type User = {
						camelCase: string
					}

					function getUser(): User {
						return {
							camelCase: "camelCase"
						}
					}

					export type GetUserReturnType = Omit<ReturnType<typeof getUser>, "camelCase">
				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "type User = {
			  	camelCase: string
			  };
			  declare function getUser(): User;
			  type GetUserReturnType = Omit<ReturnType<typeof getUser>, "camelCase">;
			  export { GetUserReturnType };
			  "
			`)
		})
	})
	describe('Ensure stitching tokens back to string does not break build', () => {
		test('should handle quotes in strings', async () => {
			createProject({
				'src/index.ts': `
					export const TWO_FACTOR_ERROR_CODES = {
	OTP_NOT_ENABLED: "OTP not enabled",
	OTP_HAS_EXPIRED: "OTP has expired",
	TOTP_NOT_ENABLED: "TOTP not enabled",
	TWO_FACTOR_NOT_ENABLED: "Two factor isn't enabled",
	BACKUP_CODES_NOT_ENABLED: "Backup codes aren't enabled",
	INVALID_BACKUP_CODE: "Invalid backup code",
	INVALID_CODE: "Invalid code",
	TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE:
		"Too many attempts. Please request a new code.",
	INVALID_TWO_FACTOR_COOKIE: "Invalid two factor cookie",
} as const;

				`,
			})

			const files = await runGenerateDts(['src/index.ts'])

			expect(files[0].dts).toMatchInlineSnapshot(`
			  "declare const TWO_FACTOR_ERROR_CODES: {
			  	readonly OTP_NOT_ENABLED: "OTP not enabled"
			  	readonly OTP_HAS_EXPIRED: "OTP has expired"
			  	readonly TOTP_NOT_ENABLED: "TOTP not enabled"
			  	readonly TWO_FACTOR_NOT_ENABLED: "Two factor isn't enabled"
			  	readonly BACKUP_CODES_NOT_ENABLED: "Backup codes aren't enabled"
			  	readonly INVALID_BACKUP_CODE: "Invalid backup code"
			  	readonly INVALID_CODE: "Invalid code"
			  	readonly TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "Too many attempts. Please request a new code."
			  	readonly INVALID_TWO_FACTOR_COOKIE: "Invalid two factor cookie"
			  };
			  export { TWO_FACTOR_ERROR_CODES };
			  "
			`)
		})
	})

	test('should not preserve side-effect imports like CSS imports in dts file', async () => {
		createProject({
			'src/styles.css': `
					.button {
						background-color: blue;
						color: white;
					}
				`,
			'src/index.ts': `
					import "./styles.css"

					import "./config.json"

					import "./polyfills"

					export interface ButtonProps {
						label: string;
						disabled?: boolean;
					}

					export function createButton(props: ButtonProps): HTMLElement {
						const button = document.createElement('button');
						button.textContent = props.label;
						button.disabled = props.disabled ?? false;
						button.className = 'button';
						return button;
					}

					export const VERSION = '1.0.0';
				`,
			'src/config.json': `{
					"apiUrl": "https://api.example.com",
					"timeout": 5000
				}`,
			'src/polyfills.ts': `
					if (!Array.prototype.includes) {
						Array.prototype.includes = function(searchElement) {
							return this.indexOf(searchElement) !== -1;
						};
					}
				`,
		})

		const files = await runGenerateDts(['src/index.ts'])

		expect(files[0].dts).toMatchInlineSnapshot(`
		  "interface ButtonProps {
		  	label: string;
		  	disabled?: boolean;
		  }
		  declare function createButton(props: ButtonProps): HTMLElement;
		  declare const VERSION = "1.0.0";
		  export { createButton, VERSION, ButtonProps };
		  "
		`)
	})
})
