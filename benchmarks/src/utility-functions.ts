/**
 * Advanced Utility Functions Library
 * A comprehensive collection of utility functions and helpers
 */

// Type Definitions
export type AnyFunction = (...args: any[]) => any
export type AsyncFunction<T> = (...args: any[]) => Promise<T>
export type Primitive =
	| string
	| number
	| boolean
	| bigint
	| symbol
	| undefined
	| null
export type DeepPartial<T> = T extends Primitive
	? T
	: T extends Array<infer U>
		? Array<DeepPartial<U>>
		: T extends Map<infer K, infer V>
			? Map<DeepPartial<K>, DeepPartial<V>>
			: T extends Set<infer U>
				? Set<DeepPartial<U>>
				: T extends Record<any, any>
					? { [K in keyof T]?: DeepPartial<T[K]> }
					: Partial<T>

export type DeepReadonly<T> = T extends Primitive
	? T
	: T extends Array<infer U>
		? ReadonlyArray<DeepReadonly<U>>
		: T extends Map<infer K, infer V>
			? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
			: T extends Set<infer U>
				? ReadonlySet<DeepReadonly<U>>
				: T extends Record<any, any>
					? { readonly [K in keyof T]: DeepReadonly<T[K]> }
					: Readonly<T>

export type Nullable<T> = T | null | undefined
export type NonNullable<T> = T extends null | undefined ? never : T
export type RecursivePartial<T> = {
	[P in keyof T]?: T[P] extends (infer U)[]
		? RecursivePartial<U>[]
		: T[P] extends object
			? RecursivePartial<T[P]>
			: T[P]
}

// Functional Programming Utilities

/**
 * Identity function - returns the input value unchanged
 */
export function identity<T>(x: T): T {
	return x
}

/**
 * Creates a function that always returns the same value
 */
export function constant<T>(value: T): () => T {
	return () => value
}

/**
 * Composes multiple functions from right to left
 */
export function compose<T>(...fns: AnyFunction[]): (arg: T) => any {
	return (arg: T): any => fns.reduceRight((result, fn) => fn(result), arg)
}

/**
 * Pipes a value through a series of functions from left to right
 */
export function pipe<T>(value: T, ...fns: AnyFunction[]): any {
	return fns.reduce((result, fn) => fn(result), value)
}

/**
 * Creates a curried version of a function
 */
export function curry<T extends any[], R>(fn: (...args: T) => R): any {
	return function curried(...args: any[]): any {
		if (args.length >= fn.length) {
			return fn(...(args as T))
		}
		return (...moreArgs: any[]): any => curried(...args, ...moreArgs)
	}
}

/**
 * Creates a partial application of a function
 */
export function partial<T extends any[], R>(
	fn: (...args: T) => R,
	...partialArgs: Partial<T>
): (...args: any[]) => R {
	return (...args: any[]): R => {
		const allArgs = [...partialArgs]
		let argIndex = 0

		for (let i = 0; i < allArgs.length; i++) {
			if (allArgs[i] === undefined) {
				allArgs[i] = args[argIndex++]
			}
		}

		while (argIndex < args.length) {
			allArgs.push(args[argIndex++])
		}

		return fn(...(allArgs as T))
	}
}

/**
 * Creates a memoized version of a function
 */
export function memoize<T extends AnyFunction>(
	fn: T,
	keyResolver?: (...args: Parameters<T>) => string,
): T {
	const cache = new Map<string, ReturnType<T>>()

	return ((...args: Parameters<T>): ReturnType<T> => {
		const key = keyResolver ? keyResolver(...args) : JSON.stringify(args)

		if (cache.has(key)) {
			return cache.get(key) as ReturnType<T>
		}

		const result = fn(...args)
		cache.set(key, result)

		return result
	}) as T
}

/**
 * Creates a debounced version of a function
 */
export function debounce<T extends AnyFunction>(
	fn: T,
	wait: number,
	options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {},
): T & { cancel: () => void } {
	let timeout: ReturnType<typeof setTimeout> | undefined
	let lastCallTime: number | undefined
	let lastInvokeTime = 0
	let lastArgs: Parameters<T> | undefined
	let lastThis: any
	let result: ReturnType<T>

	const leading = options.leading !== undefined ? options.leading : false
	const trailing = options.trailing !== undefined ? options.trailing : true
	const maxWait = options.maxWait

	function invokeFunc(time: number): ReturnType<T> {
		const args = lastArgs as Parameters<T>
		const thisArg = lastThis

		lastArgs = lastThis = undefined
		lastInvokeTime = time
		result = fn.apply(thisArg, args)

		return result
	}

	function shouldInvoke(time: number): boolean {
		const timeSinceLastCall = time - (lastCallTime || 0)
		const timeSinceLastInvoke = time - lastInvokeTime

		return (
			lastCallTime === undefined ||
			timeSinceLastCall >= wait ||
			timeSinceLastCall < 0 ||
			(maxWait !== undefined && timeSinceLastInvoke >= maxWait)
		)
	}

	function trailingEdge(time: number): ReturnType<T> | undefined {
		timeout = undefined

		if (trailing && lastArgs) {
			return invokeFunc(time)
		}

		lastArgs = lastThis = undefined
		return result
	}

	function leadingEdge(time: number): ReturnType<T> | undefined {
		lastInvokeTime = time
		timeout = setTimeout(timerExpired, wait)

		return leading ? invokeFunc(time) : result
	}

	function remainingWait(time: number): number {
		const timeSinceLastCall = time - (lastCallTime || 0)
		const timeSinceLastInvoke = time - lastInvokeTime
		const timeWaiting = wait - timeSinceLastCall

		return maxWait !== undefined
			? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
			: timeWaiting
	}

	function timerExpired(): void {
		const time = Date.now()

		if (shouldInvoke(time)) {
			return trailingEdge(time)
		}

		timeout = setTimeout(timerExpired, remainingWait(time))
	}

	function cancel(): void {
		if (timeout !== undefined) {
			clearTimeout(timeout)
		}

		lastInvokeTime = 0
		lastArgs = lastCallTime = lastThis = timeout = undefined
	}

	function debounced(
		this: any,
		...args: Parameters<T>
	): ReturnType<T> | undefined {
		const time = Date.now()
		const isInvoking = shouldInvoke(time)

		lastArgs = args
		lastThis = this
		lastCallTime = time

		if (isInvoking) {
			if (timeout === undefined) {
				return leadingEdge(time)
			}

			if (maxWait !== undefined) {
				timeout = setTimeout(timerExpired, wait)
				return invokeFunc(time)
			}
		}

		if (timeout === undefined) {
			timeout = setTimeout(timerExpired, wait)
		}

		return result
	}

	debounced.cancel = cancel

	return debounced as T & { cancel: () => void }
}

/**
 * Creates a throttled version of a function
 */
export function throttle<T extends AnyFunction>(
	fn: T,
	wait: number,
	options: { leading?: boolean; trailing?: boolean } = {},
): T & { cancel: () => void } {
	const leading = options.leading !== undefined ? options.leading : true
	const trailing = options.trailing !== undefined ? options.trailing : true

	return debounce(fn, wait, {
		leading: leading,
		trailing: trailing,
		maxWait: wait,
	}) as T & { cancel: () => void }
}

/**
 * Creates a function that negates the result of the predicate function
 */
export function negate<T extends any[]>(
	predicate: (...args: T) => boolean,
): (...args: T) => boolean {
	return (...args: T): boolean => !predicate(...args)
}

/**
 * Creates a function that executes only once
 */
export function once<T extends AnyFunction>(fn: T): T {
	let called = false
	let result: ReturnType<T>

	return ((...args: Parameters<T>): ReturnType<T> => {
		if (!called) {
			called = true
			result = fn(...args)
		}
		return result
	}) as T
}

/**
 * Creates a function that can be called only a specified number of times
 */
export function before<T extends AnyFunction>(n: number, fn: T): T {
	let result: ReturnType<T>
	let count = 0

	return ((...args: Parameters<T>): ReturnType<T> => {
		if (count < n) {
			count++
			result = fn(...args)
		}
		return result
	}) as T
}

/**
 * Creates a function that can be called only after being called a specified number of times
 */
export function after<T extends AnyFunction>(n: number, fn: T): T {
	let count = 0

	return ((...args: Parameters<T>): ReturnType<T> | undefined => {
		count++

		if (count > n) {
			return fn(...args)
		}

		return undefined as any
	}) as T
}

// Array Utilities

/**
 * Creates chunks of arrays of a specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
	const result: T[][] = []

	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size))
	}

	return result
}

/**
 * Removes falsy values from an array
 */
export function compact<T>(array: T[]): NonNullable<T>[] {
	return array.filter(Boolean) as NonNullable<T>[]
}

/**
 * Creates a new array concatenating array with additional arrays
 */
export function concat<T>(array: T[], ...values: (T | T[])[]): T[] {
	return array.concat(
		...values.map((val) => (Array.isArray(val) ? val : [val])),
	)
}

/**
 * Creates an array of unique values that are included in all given arrays
 */
export function intersection<T>(...arrays: T[][]): T[] {
	if (arrays.length === 0) return []

	const firstArray = arrays[0]
	const otherArrays = arrays.slice(1)

	return firstArray.filter((item) =>
		otherArrays.every((array) => array.includes(item)),
	)
}

/**
 * Creates an array of unique values from all given arrays
 */
export function union<T>(...arrays: T[][]): T[] {
	return Array.from(new Set(arrays.flat()))
}

/**
 * Creates an array excluding all given values
 */
export function difference<T>(array: T[], ...values: T[][]): T[] {
	const excludeSet = new Set(values.flat())
	return array.filter((item) => !excludeSet.has(item))
}

/**
 * Returns a flattened array
 */
export function flatten<T>(array: (T | T[])[]): T[] {
	return array.reduce<T[]>(
		(result, item) => result.concat(Array.isArray(item) ? item : [item]),
		[],
	)
}

/**
 * Recursively flattens an array
 */
export function flattenDeep<T>(array: any[]): T[] {
	return array.reduce(
		(result, item) =>
			result.concat(Array.isArray(item) ? flattenDeep(item) : [item]),
		[] as T[],
	)
}

/**
 * Gets the first element of an array
 */
export function first<T>(array: T[]): T | undefined {
	return array[0]
}

/**
 * Gets the last element of an array
 */
export function last<T>(array: T[]): T | undefined {
	return array[array.length - 1]
}

/**
 * Gets the unique values of an array
 */
export function uniq<T>(array: T[]): T[] {
	return Array.from(new Set(array))
}

/**
 * Creates an array of grouped elements
 */
export function groupBy<T>(
	array: T[],
	iteratee: (value: T) => string | number,
): Record<string, T[]> {
	return array.reduce((result: Record<string, T[]>, value) => {
		const key = iteratee(value)
		;(result[key] = result[key] || []).push(value)
		return result
	}, {})
}

/**
 * Finds an array element's index by predicate
 */
export function findIndex<T>(
	array: T[],
	predicate: (value: T, index: number, array: T[]) => boolean,
	fromIndex = 0,
): number {
	for (let i = fromIndex; i < array.length; i++) {
		if (predicate(array[i], i, array)) {
			return i
		}
	}

	return -1
}

/**
 * Zips multiple arrays together
 */
export function zip<T>(...arrays: T[][]): T[][] {
	const length = Math.min(...arrays.map((arr) => arr.length))
	const result: T[][] = []

	for (let i = 0; i < length; i++) {
		result.push(arrays.map((arr) => arr[i]))
	}

	return result
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
	const result = [...array]

	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[result[i], result[j]] = [result[j], result[i]]
	}

	return result
}

// Object Utilities

/**
 * Creates an object composed of keys generated from the results of running
 * each element of collection through iteratee
 */
export function keyBy<T>(
	array: T[],
	iteratee: (value: T) => string | number,
): Record<string, T> {
	return array.reduce(
		(result, value) => {
			result[iteratee(value)] = value
			return result
		},
		{} as Record<string, T>,
	)
}

/**
 * Creates an object composed of the picked object properties
 */
export function pick<T extends object, K extends keyof T>(
	object: T,
	...paths: K[]
): Pick<T, K> {
	const result = {} as Pick<T, K>

	for (const path of paths) {
		if (path in object) {
			result[path] = object[path]
		}
	}

	return result
}

/**
 * Creates an object composed of the object properties not included in the given paths
 */
export function omit<T extends object, K extends keyof T>(
	object: T,
	...paths: K[]
): Omit<T, K> {
	const result = { ...object } as any

	for (const path of paths) {
		delete result[path]
	}

	return result
}

/**
 * Deep merges two objects
 */
export function deepMerge<T1 extends object, T2 extends object>(
	obj1: T1,
	obj2: T2,
): T1 & T2 {
	const result: any = { ...obj1 }

	for (const key in obj2) {
		if (Object.prototype.hasOwnProperty.call(obj2, key)) {
			if (
				typeof obj2[key] === 'object' &&
				obj2[key] !== null &&
				!Array.isArray(obj2[key]) &&
				Object.prototype.hasOwnProperty.call(result, key) &&
				typeof result[key] === 'object' &&
				result[key] !== null &&
				!Array.isArray(result[key])
			) {
				result[key] = deepMerge(result[key], obj2[key])
			} else {
				result[key] = obj2[key]
			}
		}
	}

	return result
}

/**
 * Creates a deep clone of an object
 */
export function deepClone<T>(value: T): T {
	if (value === null || typeof value !== 'object') {
		return value
	}

	if (Array.isArray(value)) {
		return value.map(deepClone) as unknown as T
	}

	const result = {} as any

	for (const key in value) {
		if (Object.prototype.hasOwnProperty.call(value, key)) {
			result[key] = deepClone(value[key])
		}
	}

	return result
}

/**
 * Checks if an object has a property path
 */
export function has(object: any, path: string | string[]): boolean {
	const keys = Array.isArray(path) ? path : path.split('.')
	let current = object

	for (const key of keys) {
		if (current === null || current === undefined) {
			return false
		}

		if (!Object.prototype.hasOwnProperty.call(current, key)) {
			return false
		}

		current = current[key]
	}

	return true
}

/**
 * Gets the value at path of object
 */
export function get<T>(
	object: any,
	path: string | string[],
	defaultValue?: T,
): T | undefined {
	const keys = Array.isArray(path) ? path : path.split('.')
	let current = object

	for (const key of keys) {
		if (current === null || current === undefined) {
			return defaultValue
		}

		current = current[key]
	}

	return current === undefined ? defaultValue : current
}

/**
 * Sets the value at path of object
 */
export function set<T>(object: T, path: string | string[], value: any): T {
	const keys = Array.isArray(path) ? path : path.split('.')
	const result = { ...(object as any) }
	let current = result

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i]

		if (
			!Object.prototype.hasOwnProperty.call(current, key) ||
			current[key] === null
		) {
			current[key] = {}
		}

		current = current[key]
	}

	current[keys[keys.length - 1]] = value

	return result
}

/**
 * Maps an object's values with a function
 */
export function mapValues<T, R>(
	object: Record<string, T>,
	mapper: (value: T, key: string) => R,
): Record<string, R> {
	const result: Record<string, R> = {}

	for (const key in object) {
		if (Object.prototype.hasOwnProperty.call(object, key)) {
			result[key] = mapper(object[key], key)
		}
	}

	return result
}

/**
 * Maps an object's keys with a function
 */
export function mapKeys<T>(
	object: Record<string, T>,
	mapper: (key: string, value: T) => string,
): Record<string, T> {
	const result: Record<string, T> = {}

	for (const key in object) {
		if (Object.prototype.hasOwnProperty.call(object, key)) {
			result[mapper(key, object[key])] = object[key]
		}
	}

	return result
}

/**
 * Inverts an object's keys and values
 */
export function invert<T extends Record<string, string>>(
	object: T,
): Record<string, string> {
	const result: Record<string, string> = {}

	for (const key in object) {
		if (Object.prototype.hasOwnProperty.call(object, key)) {
			result[object[key]] = key
		}
	}

	return result
}

// String Utilities

/**
 * Converts a string to camelCase
 */
export function camelCase(str: string): string {
	return str
		.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
			index === 0 ? letter.toLowerCase() : letter.toUpperCase(),
		)
		.replace(/\s+|[-_]/g, '')
}

/**
 * Converts a string to snake_case
 */
export function snakeCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1_$2')
		.replace(/\s+|[-]/g, '_')
		.toLowerCase()
}

/**
 * Converts a string to kebab-case
 */
export function kebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/\s+|[_]/g, '-')
		.toLowerCase()
}

/**
 * Converts a string to PascalCase
 */
export function pascalCase(str: string): string {
	return str
		.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter) => letter.toUpperCase())
		.replace(/\s+|[-_]/g, '')
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Truncates a string to a specified length
 */
export function truncate(
	str: string,
	length: number,
	omission = '...',
): string {
	if (str.length <= length) {
		return str
	}

	return str.slice(0, length - omission.length) + omission
}

/**
 * Pads a string to a specified length
 */
export function pad(str: string, length: number, chars = ' '): string {
	const paddingLength = Math.max(0, length - str.length)
	const halfLength = Math.floor(paddingLength / 2)

	return (
		chars.repeat(halfLength) +
		str +
		chars.repeat(paddingLength - halfLength)
	)
}

/**
 * Escapes special characters in a string for regex
 */
export function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Checks if a string contains another string
 */
export function includes(
	str: string,
	searchString: string,
	position = 0,
): boolean {
	return str.indexOf(searchString, position) !== -1
}

/**
 * Converts a string to a slug
 */
export function slugify(str: string): string {
	return str
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '')
		.replace(/--+/g, '-')
		.replace(/^-+/, '')
		.replace(/-+$/, '')
}

/**
 * Templates a string with placeholders
 */
export function template(
	str: string,
	data: Record<string, any>,
	pattern: RegExp = /\{\{([^}]+)\}\}/g,
): string {
	return str.replace(pattern, (match, key) => {
		const value = get(data, key.trim())
		return value !== undefined ? String(value) : match
	})
}

// Validation Utilities

/**
 * Checks if a value is a string
 */
export function isString(value: any): value is string {
	return typeof value === 'string'
}

/**
 * Checks if a value is a number
 */
export function isNumber(value: any): value is number {
	return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * Checks if a value is a boolean
 */
export function isBoolean(value: any): value is boolean {
	return typeof value === 'boolean'
}

/**
 * Checks if a value is an array
 */
export function isArray(value: any): value is any[] {
	return Array.isArray(value)
}

/**
 * Checks if a value is an object
 */
export function isObject(value: any): value is object {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Checks if a value is null or undefined
 */
export function isNil(value: any): value is null | undefined {
	return value === null || value === undefined
}

/**
 * Checks if a value is a valid email
 */
export function isEmail(value: string): boolean {
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
	return emailRegex.test(value)
}

/**
 * Checks if a value is a valid URL
 */
export function isUrl(value: string): boolean {
	try {
		new URL(value)
		return true
	} catch {
		return false
	}
}

/**
 * Checks if an object is empty
 */
export function isEmpty(value: any): boolean {
	if (value === null || value === undefined) {
		return true
	}

	if (typeof value === 'string' || Array.isArray(value)) {
		return value.length === 0
	}

	if (typeof value === 'object') {
		return Object.keys(value).length === 0
	}

	return false
}

// Math Utilities

/**
 * Clamps a number between minimum and maximum values
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

/**
 * Returns a random number between min and max
 */
export function random(min: number, max: number, floating = false): number {
	const randomValue = Math.random() * (max - min) + min
	return floating ? randomValue : Math.floor(randomValue)
}

/**
 * Returns a random integer between min and max
 */
export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Returns a random element from an array
 */
export function sample<T>(array: T[]): T | undefined {
	if (array.length === 0) return undefined
	return array[randomInt(0, array.length - 1)]
}

/**
 * Returns multiple random elements from an array
 */
export function sampleSize<T>(array: T[], n: number): T[] {
	if (array.length === 0) return []
	const result: T[] = shuffle(array)
	return result.slice(0, n)
}

/**
 * Rounds a number to a specified precision
 */
export function round(value: number, precision = 0): number {
	const multiplier: number = 10 ** precision
	return Math.round(value * multiplier) / multiplier
}

/**
 * Sums an array of numbers
 */
export function sum(array: number[]): number {
	return array.reduce((acc: number, val: number): number => acc + val, 0)
}

/**
 * Returns the average of an array of numbers
 */
export function avg(array: number[]): number {
	if (array.length === 0) return Number.NaN
	return sum(array) / array.length
}

/**
 * Returns the median of an array of numbers
 */
export function median(array: number[]): number {
	if (array.length === 0) return Number.NaN

	const sorted: number[] = [...array].sort(
		(a: number, b: number): number => a - b,
	)
	const mid: number = Math.floor(sorted.length / 2)

	return sorted.length % 2 === 0
		? (sorted[mid - 1] + sorted[mid]) / 2
		: sorted[mid]
}

/**
 * Returns the mode (most frequent value) of an array
 */
export function mode<T>(array: T[]): T | undefined {
	if (array.length === 0) return undefined

	const counts: Map<T, number> = array.reduce(
		(acc: Map<T, number>, val: T): Map<T, number> => {
			acc.set(val, (acc.get(val) || 0) + 1)
			return acc
		},
		new Map<T, number>(),
	)

	let maxCount = 0
	let maxValue: T | undefined = undefined

	for (const [value, count] of counts.entries()) {
		if (count > maxCount) {
			maxCount = count
			maxValue = value
		}
	}

	return maxValue
}

// Date Utilities

/**
 * Formats a date as a string
 */
export function formatDate(date: Date, format = 'YYYY-MM-DD'): string {
	const year: number = date.getFullYear()
	const month: number = date.getMonth() + 1
	const day: number = date.getDate()
	const hours: number = date.getHours()
	const minutes: number = date.getMinutes()
	const seconds: number = date.getSeconds()

	const pad = (num: number): string => num.toString().padStart(2, '0')

	return format
		.replace('YYYY', year.toString())
		.replace('MM', pad(month))
		.replace('DD', pad(day))
		.replace('HH', pad(hours))
		.replace('mm', pad(minutes))
		.replace('ss', pad(seconds))
}

/**
 * Returns the difference between two dates in days
 */
export function dateDiffInDays(date1: Date, date2: Date): number {
	const diffTime: number = Math.abs(date2.getTime() - date1.getTime())
	return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Adds days to a date
 */
export function addDays(date: Date, days: number): Date {
	const result: Date = new Date(date)
	result.setDate(result.getDate() + days)
	return result
}

/**
 * Adds months to a date
 */
export function addMonths(date: Date, months: number): Date {
	const result: Date = new Date(date)
	result.setMonth(result.getMonth() + months)
	return result
}

/**
 * Adds years to a date
 */
export function addYears(date: Date, years: number): Date {
	const result: Date = new Date(date)
	result.setFullYear(result.getFullYear() + years)
	return result
}

/**
 * Checks if a date is before another date
 */
export function isBefore(date1: Date, date2: Date): boolean {
	return date1.getTime() < date2.getTime()
}

/**
 * Checks if a date is after another date
 */
export function isAfter(date1: Date, date2: Date): boolean {
	return date1.getTime() > date2.getTime()
}

/**
 * Checks if a date is between two other dates
 */
export function isBetween(date: Date, start: Date, end: Date): boolean {
	return isAfter(date, start) && isBefore(date, end)
}

/**
 * Gets the start of a day
 */
export function startOfDay(date: Date): Date {
	const result: Date = new Date(date)
	result.setHours(0, 0, 0, 0)
	return result
}

/**
 * Gets the end of a day
 */
export function endOfDay(date: Date): Date {
	const result: Date = new Date(date)
	result.setHours(23, 59, 59, 999)
	return result
}

/**
 * Gets the start of a month
 */
export function startOfMonth(date: Date): Date {
	const result: Date = new Date(date)
	result.setDate(1)
	result.setHours(0, 0, 0, 0)
	return result
}

/**
 * Gets the end of a month
 */
export function endOfMonth(date: Date): Date {
	const result: Date = new Date(date)
	result.setMonth(result.getMonth() + 1)
	result.setDate(0)
	result.setHours(23, 59, 59, 999)
	return result
}

// Async Utilities

/**
 * Creates a promise that resolves after a specified time
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve: () => void) => setTimeout(resolve, ms))
}

/**
 * Creates a promise with timeout
 */
export function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	errorMessage = 'Operation timed out',
): Promise<T> {
	let timeoutId: NodeJS.Timeout

	const timeoutPromise: Promise<never> = new Promise<never>(
		(_, reject: (reason: Error) => void): void => {
			timeoutId = setTimeout((): void => {
				reject(new Error(errorMessage))
			}, ms)
		},
	)

	return Promise.race([
		promise.then((value: T): T => {
			clearTimeout(timeoutId)
			return value
		}),
		timeoutPromise,
	])
}

/**
 * Retries an async function until it succeeds or reaches maximum attempts
 */
export async function retry<T>(
	fn: () => Promise<T>,
	options: {
		maxAttempts?: number
		delay?: number
		backoff?: number
		onRetry?: (attempt: number, error: Error) => void
	} = {},
): Promise<T> {
	const {
		maxAttempts = 3,
		delay = 1000,
		backoff = 2,
		onRetry = (): void => {},
	} = options

	let lastError: Error
	let waitTime: number = delay

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error as Error

			if (attempt < maxAttempts) {
				onRetry(attempt, lastError)
				await sleep(waitTime)
				waitTime *= backoff
			}
		}
	}

	throw lastError!
}

/**
 * Creates a function that caches the promises returned by an async function
 */
export function memoizeAsync<T extends AsyncFunction<any>>(
	fn: T,
	keyResolver?: (...args: Parameters<T>) => string,
): T {
	const cache: Map<string, Promise<ReturnType<T>>> = new Map<
		string,
		Promise<ReturnType<T>>
	>()

	return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
		const key: string = keyResolver
			? keyResolver(...args)
			: JSON.stringify(args)

		if (cache.has(key)) {
			return cache.get(key) as ReturnType<T>
		}

		const promise: Promise<ReturnType<T>> = fn(...args)
		cache.set(key, promise)

		try {
			return await promise
		} catch (error) {
			cache.delete(key)
			throw error
		}
	}) as T
}

/**
 * Runs multiple promises with concurrency limit
 */
export async function promisePool<T, R>(
	items: T[],
	fn: (item: T) => Promise<R>,
	concurrency = 5,
): Promise<R[]> {
	const results: R[] = []
	const executing: Promise<void>[] = []
	let index = 0

	const enqueue = async (): Promise<void> => {
		if (index >= items.length) return

		const currentIndex: number = index++
		const item: T = items[currentIndex]

		try {
			const result: R = await fn(item)
			results[currentIndex] = result
		} catch (error) {
			results[currentIndex] = error as any
		}

		const released: number = executing.indexOf(enqueuePromise)
		if (released >= 0) {
			executing.splice(released, 1)
		}

		return enqueue()
	}

	const enqueuePromise: Promise<void> = enqueue()
	executing.push(enqueuePromise)

	while (index < items.length && executing.length < concurrency) {
		const nextPromise: Promise<void> = enqueue()
		executing.push(nextPromise)
	}

	await Promise.all(executing)

	return results
}

/**
 * Creates a deferred promise
 */
export function createDeferred<T>(): {
	promise: Promise<T>
	resolve: (value: T) => void
	reject: (reason?: any) => void
} {
	let resolve!: (value: T) => void
	let reject!: (reason?: any) => void

	const promise: Promise<T> = new Promise<T>(
		(res: (value: T) => void, rej: (reason?: any) => void): void => {
			resolve = res
			reject = rej
		},
	)

	return { promise, resolve, reject }
}

/**
 * Creates a cancelable promise
 */
export function createCancelablePromise<T>(
	promiseFactory: (signal: AbortSignal) => Promise<T>,
): {
	promise: Promise<T>
	cancel: () => void
} {
	const controller: AbortController = new AbortController()
	const signal: AbortSignal = controller.signal

	const promise: Promise<T> = promiseFactory(signal).catch(
		(error: any): never => {
			if (signal.aborted) {
				throw new Error('Operation canceled')
			}
			throw error
		},
	)

	return {
		promise: promise,
		cancel: (): void => controller.abort(),
	}
}

// DOM Utilities (for browser environments)

/**
 * Safely adds an event listener with automatic cleanup
 */
export function addEventListenerWithCleanup<
	K extends keyof HTMLElementEventMap,
>(
	element: HTMLElement,
	type: K,
	listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
	options?: boolean | AddEventListenerOptions,
): () => void {
	element.addEventListener(type, listener, options)

	return (): void => {
		element.removeEventListener(type, listener, options)
	}
}

/**
 * Creates a debounced event handler
 */
export function debounceEvent<E extends Event>(
	callback: (event: E) => void,
	wait: number,
): (event: E) => void {
	let timeout: ReturnType<typeof setTimeout>

	return (event: E): void => {
		clearTimeout(timeout)

		timeout = setTimeout((): void => {
			callback(event)
		}, wait)
	}
}

/**
 * Creates a throttled event handler
 */
export function throttleEvent<E extends Event>(
	callback: (event: E) => void,
	wait: number,
): (event: E) => void {
	let lastCall = 0
	let lastEvent: E
	let timeout: ReturnType<typeof setTimeout> | undefined

	return (event: E): void => {
		const now: number = Date.now()

		if (now - lastCall < wait) {
			lastEvent = event

			if (!timeout) {
				timeout = setTimeout(
					(): void => {
						lastCall = now
						callback(lastEvent)
						timeout = undefined
					},
					wait - (now - lastCall),
				)
			}
		} else {
			lastCall = now
			callback(event)
		}
	}
}

// More advanced utilities and patterns

/**
 * Observable pattern implementation
 */
export class Observable<T> {
	private subscribers: Set<(value: T) => void> = new Set()
	private value: T

	constructor(initialValue: T) {
		this.value = initialValue
	}

	get(): T {
		return this.value
	}

	set(newValue: T): void {
		this.value = newValue
		this.notify()
	}

	subscribe(subscriber: (value: T) => void): () => void {
		this.subscribers.add(subscriber)
		subscriber(this.value)

		return (): void => {
			this.subscribers.delete(subscriber)
		}
	}

	private notify(): void {
		for (const subscriber of this.subscribers) {
			subscriber(this.value)
		}
	}
}

/**
 * Creates a store with state management
 */
export function createStore<T>(initialState: T): {
	getState: () => T
	setState: (newState: Partial<T>) => void
	subscribe: (listener: (state: T) => void) => () => void
} {
	let state: T = initialState
	const listeners: Set<(state: T) => void> = new Set<(state: T) => void>()

	function getState(): T {
		return state
	}

	function setState(newState: Partial<T>): void {
		state = { ...state, ...newState }
		notifyListeners()
	}

	function subscribe(listener: (state: T) => void): () => void {
		listeners.add(listener)
		listener(state)

		return (): void => {
			listeners.delete(listener)
		}
	}

	function notifyListeners(): void {
		for (const listener of listeners) {
			listener(state)
		}
	}

	return {
		getState: getState,
		setState: setState,
		subscribe: subscribe,
	}
}
