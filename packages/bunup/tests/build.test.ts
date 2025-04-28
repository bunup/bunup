import { beforeEach, describe, expect, it } from 'bun:test'
import {
	cleanProjectDir,
	createProject,
	findFile,
	runBuild,
	validateBuildFiles,
} from './utils'

describe('Build Process', () => {
	beforeEach(() => {
		cleanProjectDir()
		createProject({ 'src/index.ts': 'export const x = 1;' })
	})

	it('builds single entry', async () => {
		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
		})
		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.mjs'],
			}),
		).toBe(true)
	})

	it('builds multiple entries', async () => {
		createProject({ 'src/index.ts': '', 'src/utils.ts': '' })
		const result = await runBuild({
			entry: ['src/index.ts', 'src/utils.ts'],
			format: ['esm'],
		})
		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.mjs', 'utils.mjs'],
			}),
		).toBe(true)
	})

	it('builds named entries', async () => {
		const result = await runBuild({
			entry: { main: 'src/index.ts' },
			format: ['esm'],
		})
		expect(
			validateBuildFiles(result, {
				expectedFiles: ['main.mjs'],
			}),
		).toBe(true)
	})

	it('handles multiple formats', async () => {
		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm', 'cjs', 'iife'],
		})
		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.mjs', 'index.js', 'index.global.js'],
			}),
		).toBe(true)
	})

	it('generates DTS when enabled', async () => {
		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			dts: true,
		})
		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.mjs', 'index.d.mts'],
			}),
		).toBe(true)
	})

	it('respects minify options', async () => {
		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			minify: true,
		})
		expect(result.files[0].size).toBeLessThan(50)
	})

	it('includes banner/footer', async () => {
		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			banner: '// Banner',
			footer: '// Footer',
		})
		const file = result.files[0]
		expect(file.content).toContain('// Banner')
		expect(file.content).toContain('// Footer')
	})

	it('respects external', async () => {
		createProject({ 'src/index.ts': `import 'chalk';` })
		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			external: ['chalk'],
		})
		expect(result.files[0].content).toContain('chalk')
	})

	it('should clean the output directory before building when the clean option is true', async () => {
		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
		})

		expect(result.success).toBe(true)
		expect(result.files.length).toBe(1)

		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.mjs'],
			}),
		).toBe(true)

		const result2 = await runBuild({
			entry: 'src/index.ts',
			format: ['cjs'],
			clean: true,
		})

		expect(result2.success).toBe(true)
		expect(result2.files.length).toBe(1)

		expect(
			validateBuildFiles(result2, {
				expectedFiles: ['index.js'],
			}),
		).toBe(true)
	})

	it('should not clean the output directory when the clean option is false', async () => {
		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			clean: false,
		})

		expect(result.success).toBe(true)
		expect(result.files.length).toBe(1)

		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.mjs'],
			}),
		).toBe(true)

		const result2 = await runBuild({
			entry: 'src/index.ts',
			format: ['cjs'],
			clean: false,
		})

		expect(result2.success).toBe(true)
		expect(result2.files.length).toBe(2)

		expect(
			validateBuildFiles(result2, {
				expectedFiles: ['index.js', 'index.mjs'],
			}),
		).toBe(true)
	})

	it('should generate only DTS files when dtsOnly is enabled', async () => {
		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm', 'cjs'],
			dtsOnly: true,
		})

		expect(result.success).toBe(true)

		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.d.mts', 'index.d.ts'],
				notExpectedFiles: ['index.js', 'index.mjs', 'index.cjs'],
			}),
		).toBe(true)
	})

	it('should handle named entries with dtsOnly option', async () => {
		const result = await runBuild({
			entry: { main: 'src/index.ts' },
			format: ['esm', 'cjs'],
			dtsOnly: true,
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, {
				expectedFiles: ['main.d.mts', 'main.d.ts'],
				notExpectedFiles: ['main.js', 'main.mjs', 'main.cjs'],
			}),
		).toBe(true)
	})

	it('should respect custom dts entry points when using dtsOnly', async () => {
		createProject({
			'src/index.ts': 'export const x = 1;',
			'src/utils.ts': "export const util = () => 'utility';",
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			dtsOnly: true,
			dts: {
				entry: 'src/utils.ts',
			},
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, {
				expectedFiles: ['utils.d.mts'],
				notExpectedFiles: ['utils.d.ts'],
			}),
		).toBe(true)
	})

	it('should handle all supported file extensions simultaneously with DTS generation', async () => {
		createProject({
			'package.json': JSON.stringify({
				name: 'test-package',
				version: '1.0.0',
				dependencies: {
					react: '^19.0.0',
				},
			}),
			'src/js-file.js': 'export const jsVar = 1;',
			'src/jsx-file.jsx': 'export const jsxVar = () => <div>JSX</div>;',
			'src/ts-file.ts': 'export const tsVar: number = 2;',
			'src/tsx-file.tsx':
				'export const tsxComponent = (): JSX.Element => <div>TSX</div>;',
			'src/mjs-file.mjs': 'export const mjsVar = 3;',
			'src/cjs-file.cjs': 'exports.cjsVar = 4;',
			'src/mts-file.mts': 'export const mtsVar: number = 5;',
			'src/cts-file.cts': 'export const ctsVar: number = 6;',
		})

		const result = await runBuild({
			entry: [
				'src/js-file.js',
				'src/jsx-file.jsx',
				'src/ts-file.ts',
				'src/tsx-file.tsx',
				'src/mjs-file.mjs',
				'src/cjs-file.cjs',
				'src/mts-file.mts',
				'src/cts-file.cts',
			],
			format: ['esm', 'cjs'],
			dts: true,
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, {
				expectedFiles: [
					'js-file.mjs',
					'jsx-file.mjs',
					'ts-file.mjs',
					'tsx-file.mjs',
					'mjs-file.mjs',
					'cjs-file.mjs',
					'mts-file.mjs',
					'cts-file.mjs',

					'js-file.js',
					'jsx-file.js',
					'ts-file.js',
					'tsx-file.js',
					'mjs-file.js',
					'cjs-file.js',
					'mts-file.js',
					'cts-file.js',

					'ts-file.d.ts',
					'tsx-file.d.ts',
					'mts-file.d.ts',
					'cts-file.d.ts',
					'ts-file.d.mts',
					'tsx-file.d.mts',
					'mts-file.d.mts',
					'cts-file.d.mts',
				],
			}),
		).toBe(true)
	})

	it('should treat dependencies as external by default', async () => {
		createProject({
			'src/index.ts': `
                import chalk from 'chalk';

                console.log(chalk.red('Hello, world!'));
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
		})

		expect(result.success).toBe(true)

		expect(result.files[0].content).toContain('chalk')
		expect(result.files[0].content).toMatch(
			/import\s+.*\s+from\s+["']chalk["']/,
		)
	})

	it('should treat peerDependencies as external by default', async () => {
		createProject({
			'src/index.tsx': `
                import ora from 'ora';
                import type { Ora } from 'ora';

                const spinner: Ora = ora('Loading...').start();

                setTimeout(() => {
                  spinner.succeed('Done!');
                }, 1000);
            `,
		})

		const result = await runBuild({
			entry: 'src/index.tsx',
			format: ['esm'],
		})

		expect(result.success).toBe(true)

		expect(result.files[0].content).toContain('ora')
		expect(result.files[0].content).toMatch(
			/import\s+.*\s+from\s+["']ora["']/,
		)
	})

	it('should not treat devDependencies as external by default', async () => {
		createProject({
			'src/index.ts': `
                import picocolors from 'picocolors';

                console.log(picocolors.red('Hello, world!'));
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
		})

		expect(result.success).toBe(true)

		expect(result.files[0].content).not.toMatch(
			/import\s+.*\s+from\s+["']picocolors["']/,
		)
	})

	it('should bundle dependencies specified in noExternal option', async () => {
		createProject({
			'src/index.ts': `
                import ora from 'ora';
                import chalk from 'chalk';

                console.log(chalk.red('Hello, world!'));
                ora('Loading...').start();
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			noExternal: ['ora'],
		})

		expect(result.success).toBe(true)

		expect(result.files[0].content).not.toMatch(
			/import\s+.*\s+from\s+["']ora["']/,
		)

		expect(result.files[0].content).toMatch(
			/import\s+.*\s+from\s+["']chalk["']/,
		)
	})

	it('should consider sub-modules as external when parent module is in external option', async () => {
		createProject({
			'src/index.ts': `
                import lodashArray from 'lodash/array';
                import lodashObject from 'lodash/object';
                import chalk from 'chalk';

                console.log(chalk.red('Hello, world!'));
                ora('Loading...').start();
                lodashArray.join(['Hello', 'World'], ' ');
                lodashObject.join(['Hello', 'World'], ' ');
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			external: ['lodash'],
		})

		expect(result.success).toBe(true)

		expect(result.files[0].content).toMatch(
			/import\s+.*\s+from\s+["']lodash\/array["']/,
		)
		expect(result.files[0].content).toMatch(
			/import\s+.*\s+from\s+["']lodash\/object["']/,
		)
		expect(result.files[0].content).toMatch(
			/import\s+.*\s+from\s+["']chalk["']/,
		)
	})

	it('should call onSuccess callback after successful build', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		let callbackCalled = false
		let callbackOptions: any = null

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			onSuccess: (options) => {
				callbackCalled = true
				callbackOptions = options
			},
		})

		expect(result.success).toBe(true)
		expect(callbackCalled).toBe(true)
		expect(callbackOptions).not.toBeNull()
		expect(callbackOptions.entry).toBe('src/index.ts')
		expect(callbackOptions.format).toContain('esm')
	})

	it('should pass correct build options to onSuccess callback', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		let passedOptions: any = null

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm', 'cjs'],
			minify: true,
			dts: true,
			onSuccess: (options) => {
				passedOptions = options
			},
		})

		expect(result.success).toBe(true)
		expect(passedOptions).not.toBeNull()
		expect(passedOptions.entry).toBe('src/index.ts')
		expect(passedOptions.format).toEqual(['esm', 'cjs'])
		expect(passedOptions.minify).toBe(true)
		expect(passedOptions.dts).toBe(true)
	})

	it('should support async onSuccess callback', async () => {
		createProject({ 'src/index.ts': 'export const x = 1;' })

		let asyncOperationCompleted = false

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			onSuccess: async () => {
				await new Promise((resolve) => setTimeout(resolve, 1))
				asyncOperationCompleted = true
			},
		})

		expect(result.success).toBe(true)
		expect(asyncOperationCompleted).toBe(true)
	})

	it('should not execute onSuccess callback when build fails', async () => {
		createProject({ 'src/index.ts': 'export const x = ' })

		let callbackCalled = false

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			onSuccess: () => {
				callbackCalled = true
			},
		})

		expect(result.success).toBe(false)
		expect(callbackCalled).toBe(false)
	})

	it('should handle regex external patterns, only matching hyphenated packages', async () => {
		createProject({
			'src/index.ts': `
                import { exec } from 'uvu';
                import * as uvuExpect from 'uvu-expect';

                export const test = exec;
                export const expect = uvuExpect;
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			external: [/uvu-/],
		})

		expect(result.success).toBe(true)

		expect(result.files[0].content).toMatch(
			/import\s+.*\s+from\s+["']uvu-expect["']/,
		)

		expect(result.files[0].content).not.toMatch(
			/import\s+.*\s+from\s+["']uvu["']/,
		)
	})

	it('should handle regex noExternal patterns, only matching hyphenated packages', async () => {
		createProject({
			'src/index.ts': `
                import { $ } from 'zx';
                import { fs } from 'zx-extra';

                export const exec = $;
                export const fileSystem = fs;
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: ['esm'],
			external: ['zx', 'zx-extra'],
			noExternal: [/zx-/],
		})

		expect(result.success).toBe(true)

		expect(result.files[0].content).toMatch(
			/import\s+.*\s+from\s+["']zx["']/,
		)

		expect(result.files[0].content).not.toMatch(
			/import\s+.*\s+from\s+["']zx-extra["']/,
		)
	})

	it('should handle naming conflicts in normal builds', async () => {
		createProject({
			'src/index.ts': 'export const x = 1;',
			'lib/index.ts': 'export const y = 2;',
			'test/index.ts': 'export const z = 3;',
		})

		const result = await runBuild({
			entry: ['src/index.ts', 'lib/index.ts', 'test/index.ts'],
			format: ['esm'],
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.mjs', 'lib/index.mjs', 'test/index.mjs'],
			}),
		).toBe(true)
	})

	it('should handle naming conflicts in DTS generation', async () => {
		createProject({
			'src/types.ts': 'export type A = string;',
			'lib/types.ts': 'export type B = number;',
			'utils/types.ts': 'export type C = boolean;',
		})

		const result = await runBuild({
			entry: ['src/types.ts', 'lib/types.ts', 'utils/types.ts'],
			format: ['esm'],
			dts: true,
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, {
				expectedFiles: [
					'types.mjs',
					'lib/types.mjs',
					'utils/types.mjs',
					'types.d.mts',
					'lib/types.d.mts',
					'utils/types.d.mts',
				],
			}),
		).toBe(true)
	})

	it('should maintain directory structure when resolving naming conflicts', async () => {
		createProject({
			'src/components/button.ts': "export const Button = () => 'button';",
			'src/elements/button.ts':
				"export const Button = () => 'element-button';",
			'lib/ui/button.ts': "export const Button = () => 'ui-button';",
		})

		const result = await runBuild({
			entry: [
				'src/components/button.ts',
				'src/elements/button.ts',
				'lib/ui/button.ts',
			],
			format: ['esm'],
			dts: true,
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, {
				expectedFiles: [
					'components/button.mjs',
					'elements/button.mjs',
					'ui/button.mjs',
					'components/button.d.mts',
					'elements/button.d.mts',
					'ui/button.d.mts',
				],
			}),
		).toBe(true)
	})

	it('should handle deeper nesting in conflict resolution', async () => {
		createProject({
			'src/ui/components/header/index.ts':
				"export const Header = () => 'header';",
			'src/layouts/header/index.ts':
				"export const Header = () => 'layout-header';",
			'src/ui/header/index.ts':
				"export const Header = () => 'ui-header';",
		})

		const result = await runBuild({
			entry: [
				'src/ui/components/header/index.ts',
				'src/layouts/header/index.ts',
				'src/ui/header/index.ts',
			],
			format: ['esm'],
			dts: true,
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, {
				expectedFiles: [
					'ui/components/header/index.mjs',
					'layouts/header/index.mjs',
					'ui/header/index.mjs',
					'ui/components/header/index.d.mts',
					'layouts/header/index.d.mts',
					'ui/header/index.d.mts',
				],
			}),
		).toBe(true)
	})

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
			entry: { 'nested/index': 'src/index.ts' },
			format: ['esm'],
			splitting: true,
			loader: {
				'.txt': 'file',
			},
		})

		expect(result.success).toBe(true)
		expect(
			result.files.some((file) =>
				/\/nested\/index-[a-zA-Z0-9]+\.js/.test(file.path),
			),
		).toBe(true)
		expect(
			result.files.some((file) =>
				/\/nested\/index-plain-[a-zA-Z0-9]+\.txt/.test(file.path),
			),
		).toBe(true)
		expect(
			result.files.some((file) =>
				file.path.includes('/nested/index.mjs'),
			),
		).toBe(true)
	})
})
