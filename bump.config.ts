import { defineConfig } from 'bumpp'

export default defineConfig({
	files: [
		'packages/bunup/package.json',
		'packages/create-bunup/package.json',
	],
	commit: true,
	push: true,
	tag: true,
})
