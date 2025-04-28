import('./utils').then(({ createFixture }) => {
	createFixture('hello')
})

export function hello() {
	return 'hello'
}

export * from './utils'
