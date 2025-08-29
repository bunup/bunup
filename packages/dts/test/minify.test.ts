import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanProjectDir, createProject, runGenerateDts } from './utils'

describe('Minify Tests', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	test('should minify simple function exports with JSDoc comments', async () => {
		createProject({
			'src/index.ts': `
				/**
				 * Calculates the sum of two numbers
				 * @param a - First number
				 * @param b - Second number
				 * @returns The sum of a and b
				 */
				export function add(a: number, b: number): number {
					// This is a simple addition function
					return a + b
				}

				/**
				 * Multiplies two numbers together
				 * @param x - First factor
				 * @param y - Second factor
				 * @returns The product of x and y
				 */
				export function multiply(x: number, y: number): number {
					// Simple multiplication
					return x * y
				}

				// Utility function for division
				export function divide(numerator: number, denominator: number): number {
					if (denominator === 0) {
						throw new Error('Division by zero')
					}
					return numerator / denominator
				}
			`,
		})

		const files = await runGenerateDts(['src/index.ts'], { minify: true })

		expect(files[0].dts).toMatchInlineSnapshot(
			`"declare function e(a:number,b:number): number;declare function _(x:number,y:number): number;declare function n(numerator:number,denominator:number): number;export{_ as multiply,n as divide,e as add};"`,
		)
	})

	test('should minify complex types and interfaces with comments', async () => {
		createProject({
			'src/types.ts': `
				// Base user interface
				export interface User {
					/** Unique identifier for the user */
					id: string
					/** User's display name */
					name: string
					/** Optional email address */
					email?: string
					/** When the user was created */
					readonly createdAt: Date
					/** User's current status */
					status: UserStatus
				}

				// User status enum
				export enum UserStatus {
					Active = 'active',
					Inactive = 'inactive',
					Pending = 'pending',
					Suspended = 'suspended'
				}

				// Type for user creation
				export type CreateUserRequest = Omit<User, 'id' | 'createdAt'>

				// Type for user updates
				export type UpdateUserRequest = Partial<Pick<User, 'name' | 'email' | 'status'>>

				// Generic response wrapper
				export interface ApiResponse<T> {
					/** Whether the request was successful */
					success: boolean
					/** Response data */
					data?: T
					/** Error message if any */
					error?: string
					/** HTTP status code */
					statusCode: number
				}
			`,
		})

		const files = await runGenerateDts(['src/types.ts'], { minify: true })

		expect(files[0].dts).toMatchInlineSnapshot(
			`"interface _{id:string;name:string;email?:string;readonly createdAt:Date;status:e;}declare enum e {Active=\`active\`,Inactive=\`inactive\`,Pending=\`pending\`,Suspended=\`suspended\`}type t=Omit<_,\`id\`|\`createdAt\`>;type i=Partial<Pick<_,\`name\`|\`email\`|\`status\`>>;interface r<T>{success:boolean;data?:T;error?:string;statusCode:number;}export{e as UserStatus,_ as User,i as UpdateUserRequest,t as CreateUserRequest,r as ApiResponse};"`,
		)
	})

	test('should minify class exports with methods and properties', async () => {
		createProject({
			'src/calculator.ts': `
				/**
				 * Advanced calculator class with various mathematical operations
				 */
				export class Calculator {
					/** Current result stored in calculator */
					private result: number = 0

					/** Calculator history for undo operations */
					private history: number[] = []

					/**
					 * Adds a number to the current result
					 * @param value - Number to add
					 * @returns Updated result
					 */
					add(value: number): number {
						this.history.push(this.result)
						this.result += value
						return this.result
					}

					/**
					 * Subtracts a number from the current result
					 * @param value - Number to subtract
					 * @returns Updated result
					 */
					subtract(value: number): number {
						this.history.push(this.result)
						this.result -= value
						return this.result
					}

					/**
					 * Multiplies the current result by a number
					 * @param method - Multiplier
					 * @returns Updated result
					 */
					multiply(value: number): number {
						this.history.push(this.result)
						this.result *= value
						return this.result
					}

					/**
					 * Divides the current result by a number
					 * @param value - Divisor
					 * @returns Updated result
					 * @throws Error when dividing by zero
					 */
					divide(value: number): number {
						if (value === 0) {
							throw new Error('Division by zero is not allowed')
						}
						this.history.push(this.result)
						this.result /= value
						return this.result
					}

					/** Gets the current result */
					getResult(): number {
						return this.result
					}

					/** Clears the calculator and resets result to 0 */
					clear(): void {
						this.history = []
						this.result = 0
					}

					/** Undoes the last operation */
					undo(): number {
						if (this.history.length > 0) {
							this.result = this.history.pop()!
						}
						return this.result
					}
				}

				// Default export for convenience
				export default Calculator
			`,
		})

		const files = await runGenerateDts(['src/calculator.ts'], { minify: true })

		expect(files[0].dts).toMatchInlineSnapshot(
			`"declare class _{private result;private history;add(value:number):number;subtract(value:number):number;multiply(value:number):number;divide(value:number):number;getResult():number;clear():void;undo():number;}export{_ as default,_ as Calculator};"`,
		)
	})

	test('should minify mixed exports with constants, functions, and types', async () => {
		createProject({
			'src/api.ts': `
				// API configuration constants
				export const API_BASE_URL: string = 'https://api.example.com/v1'
				export const DEFAULT_TIMEOUT: number = 30000
				export const MAX_RETRIES: number = 3

				// HTTP methods enum
				export enum HttpMethod {
					GET = 'GET',
					POST = 'POST',
					PUT = 'PUT',
					DELETE = 'DELETE',
					PATCH = 'PATCH'
				}

				// Request configuration interface
				export interface RequestConfig {
					/** Request timeout in milliseconds */
					timeout?: number
					/** Number of retry attempts */
					retries?: number
					/** Request headers */
					headers?: Record<string, string>
					/** Whether to include credentials */
					withCredentials?: boolean
				}

				// Response type
				export type ApiResponse<T = any> = {
					/** Response status code */
					status: number
					/** Response data */
					data: T
					/** Response headers */
					headers: Record<string, string>
					/** Response timestamp */
					timestamp: Date
				}

				/**
				 * Makes an HTTP request to the API
				 * @param endpoint - API endpoint path
				 * @param method - HTTP method to use
				 * @param data - Request payload
				 * @param config - Request configuration
				 * @returns Promise resolving to API response
				 */
				export async function apiRequest<T>(
					endpoint: string,
					method: HttpMethod = HttpMethod.GET,
					data?: any,
					config: RequestConfig = {}
				): Promise<ApiResponse<T>> {
					const url = \`\${API_BASE_URL}\${endpoint}\`
					const timeout = config.timeout ?? DEFAULT_TIMEOUT
					const retries = config.retries ?? MAX_RETRIES

					// Implementation would go here
					return {} as ApiResponse<T>
				}

				// Convenience functions for common HTTP methods
				export const api = {
					/** GET request */
					get: <T>(endpoint: string, config?: RequestConfig) =>
						apiRequest<T>(endpoint, HttpMethod.GET, undefined, config),

					/** POST request */
					post: <T>(endpoint: string, data: any, config?: RequestConfig) =>
						apiRequest<T>(endpoint, HttpMethod.POST, data, config),

					/** PUT request */
					put: <T>(endpoint: string, data: any, config?: RequestConfig) =>
						apiRequest<T>(endpoint, HttpMethod.PUT, data, config),

					/** DELETE request */
					delete: <T>(endpoint: string, config?: RequestConfig) =>
						apiRequest<T>(endpoint, HttpMethod.DELETE, undefined, config)
				}

				// Default export
				export default api
			`,
		})

		const files = await runGenerateDts(['src/api.ts'], { minify: true })

		expect(files[0].dts).toMatchInlineSnapshot(
			`"declare const i:string;declare const r:number;declare const n:number;declare enum _ {GET=\`GET\`,POST=\`POST\`,PUT=\`PUT\`,DELETE=\`DELETE\`,PATCH=\`PATCH\`}interface e{timeout?:number;retries?:number;headers?:Record<string,string>;withCredentials?:boolean;}type t<T = any>={status:number;data:T;headers:Record<string,string>;timestamp:Date;};declare function l<T>(endpoint:string,method?:_,data?:any,config?:e): Promise<t<T>>;declare const a:{};export{a as default,l as apiRequest,a as api,e as RequestConfig,n as MAX_RETRIES,_ as HttpMethod,r as DEFAULT_TIMEOUT,t as ApiResponse,i as API_BASE_URL};"`,
		)
	})

	test('should minify multiple files with imports and exports', async () => {
		createProject({
			'src/shared/types.ts': `
				// Base entity interface
				export interface BaseEntity {
					/** Unique identifier */
					id: string
					/** Creation timestamp */
					createdAt: Date
					/** Last update timestamp */
					updatedAt: Date
				}

				// User interface extending base entity
				export interface User extends BaseEntity {
					/** User's display name */
					name: string
					/** User's email address */
					email: string
					/** User's role in the system */
					role: UserRole
				}

				// User roles enum
				export enum UserRole {
					Admin = 'admin',
					User = 'user',
					Moderator = 'moderator'
				}

				// Product interface
				export interface Product extends BaseEntity {
					/** Product name */
					title: string
					/** Product description */
					description: string
					/** Product price */
					price: number
					/** Product category */
					category: string
				}
			`,
			'src/services/user-service.ts': `
				import type { User, UserRole, BaseEntity } from '../shared/types'

				/**
				 * User service for managing user operations
				 */
				export class UserService {
					/**
					 * Creates a new user
					 * @param userData - User data to create
					 * @returns Created user
					 */
					async createUser(userData: Omit<User, keyof BaseEntity>): Promise<User> {
						// Implementation would go here
						return {} as User
					}

					/**
					 * Updates an existing user
					 * @param id - User ID
					 * @param updates - User updates
					 * @returns Updated user
					 */
					async updateUser(id: string, updates: Partial<User>): Promise<User> {
						// Implementation would go here
						return {} as User
					}

					/**
					 * Deletes a user
					 * @param id - User ID to delete
					 */
					async deleteUser(id: string): Promise<void> {
						// Implementation would go here
					}

					/**
					 * Gets user by ID
					 * @param id - User ID
					 * @returns User or null if not found
					 */
					async getUserById(id: string): Promise<User | null> {
						// Implementation would go here
						return null
					}

					/**
					 * Gets all users with optional role filter
					 * @param role - Optional role filter
					 * @returns Array of users
					 */
					async getUsers(role?: UserRole): Promise<User[]> {
						// Implementation would go here
						return []
					}
				}

				// Default export
				export default UserService
			`,
			'src/services/product-service.ts': `
				import type { Product, BaseEntity } from '../shared/types'

				/**
				 * Product service for managing product operations
				 */
				export class ProductService {
					/**
					 * Creates a new product
					 * @param productData - Product data to create
					 * @returns Created product
					 */
					async createProduct(productData: Omit<Product, keyof BaseEntity>): Promise<Product> {
						// Implementation would go here
						return {} as Product
					}

					/**
					 * Updates an existing product
					 * @param id - Product ID
					 * @param updates - Product updates
					 * @returns Updated product
					 */
					async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
						// Implementation would go here
						return {} as Product
					}

					/**
					 * Deletes a product
					 * @param id - Product ID to delete
					 */
					async deleteProduct(id: string): Promise<void> {
						// Implementation would go here
					}

					/**
					 * Gets product by ID
					 * @param id - Product ID
					 * @returns Product or null if not found
					 */
					async getProductById(id: string): Promise<Product | null> {
						// Implementation would go here
						return null
					}

					/**
					 * Gets all products with optional category filter
					 * @param category - Optional category filter
					 * @returns Array of products
					 */
					async getProducts(category?: string): Promise<Product[]> {
						// Implementation would go here
						return []
					}
				}

				// Default export
				export default ProductService
			`,
			'src/index.ts': `
				// Re-export all types from shared
				export * from './shared/types'

				// Re-export services
				export { default as UserService } from './services/user-service'
				export { default as ProductService } from './services/product-service'

				// Re-export specific classes
				export { UserService as UserManager } from './services/user-service'
				export { ProductService as ProductManager } from './services/product-service'

				// Export convenience functions
				export function createUserService(): UserService {
					return new UserService()
				}

				export function createProductService(): ProductService {
					return new ProductService()
				}

				// Default export with all services
				export default {
					UserService,
					ProductService,
					createUserService,
					createProductService
				}
			`,
		})

		const files = await runGenerateDts(['src/index.ts'], { minify: true })

		expect(files).toHaveLength(1)
		expect(files[0].dts).toMatchInlineSnapshot(
			`"interface t{id:string;createdAt:Date;updatedAt:Date;}interface _ extends t{name:string;email:string;role:r;}declare enum r {Admin=\`admin\`,_=\`user\`,Moderator=\`moderator\`}interface e extends t{title:string;description:string;price:number;category:string;}declare class i{createUser(userData:Omit<_,keyof t>):Promise<_>;updateUser(id:string,updates:Partial<_>):Promise<_>;deleteUser(id:string):Promise<void>;getUserById(id:string):Promise<_|null>;getUsers(role?:r):Promise<_[]>;}declare class l{createProduct(productData:Omit<e,keyof t>):Promise<e>;updateProduct(id:string,updates:Partial<e>):Promise<e>;deleteProduct(id:string):Promise<void>;getProductById(id:string):Promise<e|null>;getProducts(category?:string):Promise<e[]>;}declare function n(): UserService;declare function a(): ProductService;declare const o:{};export{o as default,n as createUserService,a as createProductService,i as UserService,r as UserRole,i as UserManager,_ as User,l as ProductService,l as ProductManager,e as Product,t as BaseEntity};"`,
		)
	})

	test('should minify with complex re-exports and barrel files', async () => {
		createProject({
			'src/utils/math.ts': `
				/**
				 * Mathematical utility functions
				 */

				// Basic arithmetic functions
				export function add(a: number, b: number): number {
					return a + b
				}

				export function subtract(a: number, b: number): number {
					return a - b
				}

				export function multiply(a: number, b: number): number {
					return a * b
				}

				export function divide(a: number, b: number): number {
					if (b === 0) throw new Error('Division by zero')
					return a / b
				}

				// Advanced math functions
				export function power(base: number, exponent: number): number {
					return Math.pow(base, exponent)
				}

				export function sqrt(value: number): number {
					return Math.sqrt(value)
				}

				// Math constants
				export const PI: number = Math.PI
				export const E: number = Math.E
			`,
			'src/utils/string.ts': `
				/**
				 * String utility functions
				 */

				export function capitalize(str: string): string {
					return str.charAt(0).toUpperCase() + str.slice(1)
				}

				export function reverse(str: string): string {
					return str.split('').reverse().join('')
				}

				export function truncate(str: string, length: number): string {
					return str.length > length ? str.slice(0, length) + '...' : str
				}

				export function slugify(str: string): string {
					return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
				}
			`,
			'src/utils/array.ts': `
				/**
				 * Array utility functions
				 */

				export function chunk<T>(array: T[], size: number): T[][] {
					const chunks: T[][] = []
					for (let i = 0; i < array.length; i += size) {
						chunks.push(array.slice(i, i + size))
					}
					return chunks
				}

				export function unique<T>(array: T[]): T[] {
					return [...new Set(array)]
				}

				export function shuffle<T>(array: T[]): T[] {
					const shuffled = [...array]
					for (let i = shuffled.length - 1; i > 0; i--) {
						const j = Math.floor(Math.random() * (i + 1))
						;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
					}
					return shuffled
				}

				export function groupBy<T, K extends string | number>(
					array: T[],
					keyFn: (item: T) => K
				): Record<K, T[]> {
					return array.reduce((groups, item) => {
						const key = keyFn(item)
						if (!groups[key]) groups[key] = []
						groups[key].push(item)
						return groups
					}, {} as Record<K, T[]>)
				}
			`,
			'src/utils/index.ts': `
				// Re-export all math utilities
				export * from './math'

				// Re-export all string utilities
				export * from './string'

				// Re-export all array utilities
				export * from './array'

				// Export utility namespaces
				export * as Math from './math'
				export * as String from './string'
				export * as Array from './array'

				// Default export with all utilities
				export default {
					...require('./math'),
					...require('./string'),
					...require('./array')
				}
			`,
			'src/validators/string-validator.ts': `
				import { isEmail, isURL } from '../utils/string'

				/**
				 * String validation utilities
				 */
				export class StringValidator {
					/**
					 * Validates if a string is a valid email
					 * @param email - Email to validate
					 * @returns True if valid email
					 */
					static isValidEmail(email: string): boolean {
						const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/
						return emailRegex.test(email)
					}

					/**
					 * Validates if a string is a valid URL
					 * @param url - URL to validate
					 * @returns True if valid URL
					 */
					static isValidURL(url: string): boolean {
						try {
							new URL(url)
							return true
						} catch {
							return false
						}
					}

					/**
					 * Validates if a string is not empty
					 * @param str - String to validate
					 * @returns True if not empty
					 */
					static isNotEmpty(str: string): boolean {
						return str.trim().length > 0
					}

					/**
					 * Validates string length
					 * @param str - String to validate
					 * @param min - Minimum length
					 * @param max - Maximum length
					 * @returns True if length is within range
					 */
					static hasLength(str: string, min: number, max?: number): boolean {
						const length = str.length
						return length >= min && (max === undefined || length <= max)
					}
				}
			`,
			'src/validators/number-validator.ts': `
				import { isFinite } from '../utils/math'

				/**
				 * Number validation utilities
				 */
				export class NumberValidator {
					/**
					 * Validates if a value is a valid number
					 * @param value - Value to validate
					 * @returns True if valid number
					 */
					static isValidNumber(value: any): value is number {
						return typeof value === 'number' && !isNaN(value) && isFinite(value)
					}

					/**
					 * Validates if a number is within range
					 * @param value - Number to validate
					 * @param min - Minimum value
					 * @param max - Maximum value
					 * @returns True if within range
					 */
					static isInRange(value: number, min: number, max: number): boolean {
						return value >= min && value <= max
					}

					/**
					 * Validates if a number is positive
					 * @param value - Number to validate
					 * @returns True if positive
					 */
					static isPositive(value: number): boolean {
						return value > 0
					}

					/**
					 * Validates if a number is negative
					 * @param value - Number to validate
					 * @returns True if negative
					 */
					static isNegative(value: number): boolean {
						return value < 0
					}
				}
			`,
			'src/validators/index.ts': `
				// Re-export all validators
				export * from './string-validator'
				export * from './number-validator'

				// Export validator namespaces
				export * as StringValidator from './string-validator'
				export * as NumberValidator from './number-validator'

				// Default export
				export default {
					StringValidator,
					NumberValidator
				}
			`,
			'src/main.ts': `
				// Import utilities
				import utils, { add, multiply, capitalize, chunk, unique } from './utils'
				import { StringValidator, NumberValidator } from './validators'

				// Re-export everything
				export * from './utils'
				export * from './validators'

				// Export specific utilities with aliases
				export { add as sum, multiply as product }
				export { capitalize as toTitleCase }
				export { chunk as splitArray, unique as deduplicate }

				// Export validators with aliases
				export { StringValidator as StringUtils }
				export { NumberValidator as NumberUtils }

				// Export convenience functions
				export function validateEmail(email: string): boolean {
					return StringValidator.isValidEmail(email)
				}

				export function validateNumber(value: any): boolean {
					return NumberValidator.isValidNumber(value)
				}

				export function calculateSum(numbers: number[]): number {
					return numbers.reduce(add, 0)
				}

				// Default export with everything
				export default {
					utils,
					StringValidator,
					NumberValidator,
					validateEmail,
					validateNumber,
					calculateSum
				}
			`,
		})

		const files = await runGenerateDts(['src/main.ts'], { minify: true })

		expect(files).toHaveLength(1)
		expect(files[0].dts).toMatchInlineSnapshot(
			`"declare namespace w{export{d as subtract,u as sqrt,y as power,r as multiply,p as divide,i as add,b as PI,s as E}}declare function i(a:number,b:number): number;declare function d(a:number,b:number): number;declare function r(a:number,b:number): number;declare function p(a:number,b:number): number;declare function y(base:number,exponent:number): number;declare function u(value:number): number;declare const b:number;declare const s:number;declare namespace x{export{v as truncate,f as slugify,c as reverse,l as capitalize}}declare function l(str:string): string;declare function c(str:string): string;declare function v(str:string,length:number): string;declare function f(str:string): string;declare namespace h{export{n as unique,g as shuffle,V as groupBy,a as chunk}}declare function a<T>(array:T[],size:number): T[][];declare function n<T>(array:T[]): T[];declare function g<T>(array:T[]): T[];declare function V<T,K extends string|number>(array:T[],keyFn:(item:T)=>K): Record<K,T[]>;declare namespace o{export{N as StringValidator}}declare class N{static isValidEmail(email:string):boolean;static isValidURL(url:string):boolean;static isNotEmpty(str:string):boolean;static hasLength(str:string,min:number,max?:number):boolean;}declare namespace m{export{S as NumberValidator}}declare class S{static isValidNumber(value:any):value is number;static isInRange(value:number,min:number,max:number):boolean;static isPositive(value:number):boolean;static isNegative(value:number):boolean;}declare function E(email:string): boolean;declare function L(value:any): boolean;declare function k(numbers:number[]): number;declare const q:{};export{L as validateNumber,E as validateEmail,n as unique,v as truncate,l as toTitleCase,i as sum,d as subtract,u as sqrt,a as splitArray,f as slugify,g as shuffle,c as reverse,r as product,y as power,r as multiply,V as groupBy,p as divide,q as default,n as deduplicate,a as chunk,l as capitalize,k as calculateSum,i as add,o as StringValidator,o as StringUtils,x as String,b as PI,m as NumberValidator,m as NumberUtils,w as Math,s as E,h as Array};"`,
		)
	})

	test('should minify with circular dependencies and complex imports', async () => {
		createProject({
			'src/models/base.ts': `
				import type { Entity } from './entity'

				/**
				 * Base model class
				 */
				export abstract class BaseModel {
					/** Unique identifier */
					public id: string

					/** Creation timestamp */
					public createdAt: Date

					/** Last update timestamp */
					public updatedAt: Date

					constructor(id: string) {
						this.id = id
						this.createdAt = new Date()
						this.updatedAt = new Date()
					}

					/**
					 * Updates the model
					 * @param updates - Updates to apply
					 */
					abstract update(updates: Partial<Entity>): void

					/**
					 * Validates the model
					 * @returns True if valid
					 */
					abstract validate(): boolean
				}
			`,
			'src/models/entity.ts': `
				import type { BaseModel } from './base'

				/**
				 * Entity interface
				 */
				export interface Entity {
					/** Entity ID */
					id: string
					/** Entity type */
					type: string
					/** Entity data */
					data: Record<string, any>
					/** Entity metadata */
					metadata?: Record<string, any>
				}

				/**
				 * Entity model implementation
				 */
				export class EntityModel extends BaseModel {
					/** Entity type */
					public type: string

					/** Entity data */
					public data: Record<string, any>

					/** Entity metadata */
					public metadata?: Record<string, any>

					constructor(id: string, type: string, data: Record<string, any> = {}) {
						super(id)
						this.type = type
						this.data = data
					}

					/**
					 * Updates the entity
					 * @param updates - Updates to apply
					 */
					update(updates: Partial<Entity>): void {
						if (updates.type) this.type = updates.type
						if (updates.data) this.data = { ...this.data, ...updates.data }
						if (updates.metadata) this.metadata = { ...this.metadata, ...updates.metadata }
						this.updatedAt = new Date()
					}

					/**
					 * Validates the entity
					 * @returns True if valid
					 */
					validate(): boolean {
						return !!this.id && !!this.type
					}
				}
			`,
			'src/repositories/base-repository.ts': `
				import type { BaseModel } from '../models/base'
				import type { Entity } from '../models/entity'

				/**
				 * Base repository interface
				 */
				export interface Repository<T extends BaseModel> {
					/**
					 * Finds an entity by ID
					 * @param id - Entity ID
					 * @returns Entity or null
					 */
					findById(id: string): Promise<T | null>

					/**
					 * Finds all entities
					 * @returns Array of entities
					 */
					findAll(): Promise<T[]>

					/**
					 * Saves an entity
					 * @param entity - Entity to save
					 * @returns Saved entity
					 */
					save(entity: T): Promise<T>

					/**
					 * Deletes an entity
					 * @param id - Entity ID to delete
					 */
					delete(id: string): Promise<void>
				}

				/**
				 * Base repository implementation
				 */
				export abstract class BaseRepository<T extends BaseModel> implements Repository<T> {
					protected entities: Map<string, T> = new Map()

					async findById(id: string): Promise<T | null> {
						return this.entities.get(id) || null
					}

					async findAll(): Promise<T[]> {
						return Array.from(this.entities.values())
					}

					async save(entity: T): Promise<T> {
						this.entities.set(entity.id, entity)
						return entity
					}

					async delete(id: string): Promise<void> {
						this.entities.delete(id)
					}
				}
			`,
			'src/repositories/entity-repository.ts': `
				import type { EntityModel } from '../models/entity'
				import type { BaseRepository } from './base-repository'

				/**
				 * Entity repository implementation
				 */
				export class EntityRepository extends BaseRepository<EntityModel> {
					/**
					 * Finds entities by type
					 * @param type - Entity type
					 * @returns Array of entities
					 */
					async findByType(type: string): Promise<EntityModel[]> {
						const entities = await this.findAll()
						return entities.filter(entity => entity.type === type)
					}

					/**
					 * Finds entities by metadata key
					 * @param key - Metadata key
					 * @param value - Metadata value
					 * @returns Array of entities
					 */
					async findByMetadata(key: string, value: any): Promise<EntityModel[]> {
						const entities = await this.findAll()
						return entities.filter(entity =>
							entity.metadata && entity.metadata[key] === value
						)
					}
				}
			`,
			'src/services/entity-service.ts': `
				import type { EntityModel } from '../models/entity'
				import type { EntityRepository } from '../repositories/entity-repository'

				/**
				 * Entity service for business logic
				 */
				export class EntityService {
					private repository: EntityRepository

					constructor(repository: EntityRepository) {
						this.repository = repository
					}

					/**
					 * Creates a new entity
					 * @param type - Entity type
					 * @param data - Entity data
					 * @param metadata - Optional metadata
					 * @returns Created entity
					 */
					async createEntity(
						type: string,
						data: Record<string, any> = {},
						metadata?: Record<string, any>
					): Promise<EntityModel> {
						const id = this.generateId()
						const entity = new EntityModel(id, type, data)
						if (metadata) entity.metadata = metadata
						return await this.repository.save(entity)
					}

					/**
					 * Updates an entity
					 * @param id - Entity ID
					 * @param updates - Updates to apply
					 * @returns Updated entity
					 */
					async updateEntity(
						id: string,
						updates: Partial<EntityModel>
					): Promise<EntityModel> {
						const entity = await this.repository.findById(id)
						if (!entity) {
							throw new Error(\`Entity with ID \${id} not found\`)
						}
						entity.update(updates)
						return await this.repository.save(entity)
					}

					/**
					 * Deletes an entity
					 * @param id - Entity ID
					 */
					async deleteEntity(id: string): Promise<void> {
						await this.repository.delete(id)
					}

					/**
					 * Gets entity by ID
					 * @param id - Entity ID
					 * @returns Entity or null
					 */
					async getEntity(id: string): Promise<EntityModel | null> {
						return await this.repository.findById(id)
					}

					/**
					 * Gets all entities
					 * @returns Array of entities
					 */
					async getAllEntities(): Promise<EntityModel[]> {
						return await this.repository.findAll()
					}

					/**
					 * Gets entities by type
					 * @param type - Entity type
					 * @returns Array of entities
					 */
					async getEntitiesByType(type: string): Promise<EntityModel[]> {
						return await this.repository.findByType(type)
					}

					/**
					 * Generates a unique ID
					 * @returns Unique ID
					 */
					private generateId(): string {
						return Date.now().toString(36) + Math.random().toString(36).substr(2)
					}
				}
			`,
			'src/index.ts': `
				// Export all models
				export * from './models/base'
				export * from './models/entity'

				// Export all repositories
				export * from './repositories/base-repository'
				export * from './repositories/entity-repository'

				// Export all services
				export * from './services/entity-service'

				// Export specific types with aliases
				export type { Entity as EntityType } from './models/entity'
				export type { Repository as RepositoryInterface } from './repositories/base-repository'

				// Export convenience functions
				export function createEntityService(): EntityService {
					const repository = new EntityRepository()
					return new EntityService(repository)
				}

				export function createEntity(
					type: string,
					data: Record<string, any> = {},
					metadata?: Record<string, any>
				): EntityModel {
					return new EntityModel(
						Date.now().toString(36),
						type,
						data
					)
				}

				const ex: {
					EntityModel: typeof EntityModel
					EntityRepository: typeof EntityRepository
					EntityService: typeof EntityService
					createEntityService: typeof createEntityService
					createEntity: typeof createEntity
				} = {
					EntityModel,
					EntityRepository,
					EntityService,
					createEntityService,
					createEntity
				}

				// Default export with everything
				export default ex
			`,
		})

		const files = await runGenerateDts(['src/index.ts'], { minify: true })

		expect(files).toHaveLength(1)
		expect(files[0].dts).toMatchInlineSnapshot(
			`"interface t{id:string;type:string;data:Record<string,any>;metadata?:Record<string,any>;}declare class _ extends e{type:string;data:Record<string,any>;metadata?:Record<string,any>;constructor(id:string,type:string,data?:Record<string,any>);update(updates:Partial<t>):void;validate():boolean;}declare abstract class e{id:string;createdAt:Date;updatedAt:Date;constructor(id:string);abstract validate():boolean;}interface i<T extends e>{findById(id:string):Promise<T|null>;findAll():Promise<T[]>;save(entity:T):Promise<T>;delete(id:string):Promise<void>;}declare abstract class l<T extends e> implements i<T>{protected entities:Map<string,T>;findById(id:string):Promise<T|null>;findAll():Promise<T[]>;save(entity:T):Promise<T>;delete(id:string):Promise<void>;}declare class n extends l<_>{findByType(type:string):Promise<_[]>;findByMetadata(key:string,value:any):Promise<_[]>;}declare class d{private repository;constructor(repository:n);createEntity(type:string,data?:Record<string,any>,metadata?:Record<string,any>):Promise<_>;updateEntity(id:string,updates:Partial<_>):Promise<_>;deleteEntity(id:string):Promise<void>;getEntity(id:string):Promise<_|null>;getAllEntities():Promise<_[]>;getEntitiesByType(type:string):Promise<_[]>;private generateId}declare function r(): EntityService;declare function a(type:string,data?:Record<string,any>,metadata?:Record<string,any>): EntityModel;declare const o:{EntityModel:typeof EntityModel;EntityRepository:typeof EntityRepository;EntityService:typeof EntityService;r:typeof r;a:typeof a;};export{o as default,r as createEntityService,a as createEntity,i as RepositoryInterface,i as Repository,t as EntityType,d as EntityService,n as EntityRepository,_ as EntityModel,t as Entity,l as BaseRepository,e as BaseModel};"`,
		)
	})
})
