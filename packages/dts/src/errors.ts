export class TyperollError extends Error {
	constructor(message: string) {
		super(`typeroll: ${message}`)
	}
}
