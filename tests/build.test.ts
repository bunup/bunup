import { beforeEach, describe, expect, it } from 'bun:test'
import {
	cleanProjectDir,
	createProject,
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

	it('ensures "use client" directive appears at the top of the file', async () => {
		createProject({
			'src/component.tsx': `"use client";
import { useState } from 'react';

export function Counter() {
    const [count, setCount] = useState(0);
    return (
        <button onClick={() => setCount(count + 1)}>
            Count: {count}
        </button>
    );
}`,
			'package.json': JSON.stringify({
				name: 'test-package',
				version: '1.0.0',
				dependencies: {
					react: '^19.0.0',
				},
			}),
		})

		const result = await runBuild({
			entry: 'src/component.tsx',
			format: ['esm'],
		})

		expect(result.success).toBe(true)

		const outputFile = result.files.find((f) =>
			f.path.endsWith('component.mjs'),
		)
		expect(outputFile).toBeDefined()

		expect(outputFile.content.trimStart().startsWith('"use client";')).toBe(
			true,
		)

		const clientDirectivePos = outputFile.content.indexOf('"use client";')
		const importPos = outputFile.content.indexOf('import')
		expect(clientDirectivePos).toBeLessThan(importPos)
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
		expect(result.files[0].content).toMatch(/import\s+.*\s+from\s+["']ora["']/)
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

		expect(result.files[0].content).toMatch(/import\s+.*\s+from\s+["']zx["']/)

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
			'src/elements/button.ts': "export const Button = () => 'element-button';",
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
			'src/ui/header/index.ts': "export const Header = () => 'ui-header';",
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

	it('should support glob patterns in entry points', async () => {
		createProject({
			'src/components/button.ts': "export const Button = () => 'button';",
			'src/components/card.ts': "export const Card = () => 'card';",
			'src/utils/string.ts':
				'export const capitalize = (s: string) => s.toUpperCase();',
			'src/utils/number.ts':
				'export const add = (a: number, b: number) => a + b;',
		})

		const result = await runBuild({
			entry: ['src/**/*.ts'],
			format: ['esm'],
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, {
				expectedFiles: [
					'components/button.mjs',
					'components/card.mjs',
					'utils/string.mjs',
					'utils/number.mjs',
				],
			}),
		).toBe(true)
	})

	it('should support exclude patterns in entry points', async () => {
		createProject({
			'src/index.ts': "export const version = '1.0.0';",
			'src/utils.ts': 'export const sum = (a: number, b: number) => a + b;',
			'src/utils.test.ts': "import { sum } from './utils';",
			'src/components/button.ts': "export const Button = () => 'button';",
			'src/components/button.test.ts': "import { Button } from './button';",
		})

		const result = await runBuild({
			entry: ['src/**/*.ts', '!src/**/*.test.ts'],
			format: ['esm'],
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.mjs', 'utils.mjs', 'components/button.mjs'],
				notExpectedFiles: ['utils.test.mjs', 'components/button.test.mjs'],
			}),
		).toBe(true)
	})

	it('should support complex include/exclude glob patterns', async () => {
		createProject({
			'src/index.ts': "export const version = '1.0.0';",
			'src/utils/common.ts': 'export const noop = () => {};',
			'src/utils/internal.ts': 'export const privateMethod = () => {};',
			'src/utils/test-helpers.ts': 'export const createMock = () => ({});',
			'src/components/button.ts': "export const Button = () => 'button';",
			'src/components/internal/base.ts':
				'export const BaseComponent = () => {};',
			'lib/helpers.ts': 'export const logger = () => console.log;',
			'tests/setup.ts': 'export const beforeAll = () => {};',
		})

		const result = await runBuild({
			entry: [
				'src/**/*.ts',
				'lib/**/*.ts',
				'!src/**/internal*.ts',
				'!src/**/internal/**/*.ts',
				'!tests/**/*.ts',
			],
			format: ['esm'],
		})

		expect(result.success).toBe(true)
		expect(
			validateBuildFiles(result, {
				expectedFiles: [
					'index.mjs',
					'utils/common.mjs',
					'utils/test-helpers.mjs',
					'components/button.mjs',
					'helpers.mjs',
				],
			}),
		).toBe(true)
		expect(result.files.some((file) => file.path.includes('internal'))).toBe(
			false,
		)
		expect(result.files.some((file) => file.path.includes('tests/'))).toBe(
			false,
		)
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
			entry: ['src/index.ts'],
			format: ['esm'],
			splitting: true,
			loader: {
				'.txt': 'file',
			},
		})

		expect(result.success).toBe(true)
		expect(
			result.files.some((file) => file.path.includes('shared/chunk-')),
		).toBe(true)
		expect(result.files.some((file) => file.path.includes('plain-'))).toBe(true)
		expect(result.files.some((file) => file.path.includes('/index.mjs'))).toBe(
			true,
		)
	})

	it('should place JS and DTS chunk files in the shared folder, and not place assets in shared', async () => {
		createProject({
			'src/a.ts': `
				import { SharedType } from './shared-type'
				export const a: SharedType = { value: 'a' }
				import txt from './asset.txt'
				export { txt }
			`,
			'src/b.ts': `
				import { SharedType } from './shared-type'
				export const b: SharedType = { value: 'b' }
			`,
			'src/shared-type.ts': `
				export type SharedType = { value: string }
			`,
			'src/asset.txt': 'hello asset',
		})

		const result = await runBuild({
			entry: ['src/a.ts', 'src/b.ts'],
			format: ['esm', 'cjs'],
			splitting: true,
			dts: { splitting: true },
			loader: {
				'.txt': 'file',
			},
		})

		expect(result.success).toBe(true)

		const jsChunkFiles = result.files.filter(
			(f) =>
				f.path.includes('shared/chunk-') &&
				(f.path.endsWith('.js') || f.path.endsWith('.mjs')),
		)
		expect(jsChunkFiles.length).toBeGreaterThan(0)

		const dtsChunkFiles = result.files.filter(
			(f) =>
				f.path.includes('shared/chunk-') &&
				(f.path.endsWith('.d.ts') ||
					f.path.endsWith('.d.mts') ||
					f.path.endsWith('.d.cts')),
		)
		expect(dtsChunkFiles).toHaveLength(1)

		const assetFile = result.files.find((f) => f.path.includes('asset'))
		expect(assetFile).toBeDefined()
		expect(assetFile?.path.includes('shared/')).toBe(false)
	})

	// it('should only create one dts chunk file per chunk regardless of formats', async () => {
	// 	createProject({
	// 		'src/a.ts': `
	// 			import { SharedType } from './shared-type'
	// 			export const a: SharedType = { value: 'a' }
	// 		`,
	// 		'src/b.ts': `
	// 			import { SharedType } from './shared-type'
	// 			export const b: SharedType = { value: 'b' }
	// 		`,
	// 		'src/shared-type.ts': `
	// 			export type SharedType = { value: string }
	// 		`,
	// 	})

	// 	const result = await runBuild({
	// 		entry: ['src/a.ts', 'src/b.ts'],
	// 		format: ['esm', 'cjs'],
	// 		splitting: true,
	// 		dts: { splitting: true },
	// 	})

	// 	expect(result.success).toBe(true)

	// 	const dtsChunkFiles = result.files.filter(
	// 		(f) =>
	// 			f.path.includes('shared/chunk-') &&
	// 			(f.path.endsWith('.d.ts') ||
	// 				f.path.endsWith('.d.mts') ||
	// 				f.path.endsWith('.d.cts')),
	// 	)

	// 	const chunkBaseNames = new Set<string>()
	// 	for (const file of dtsChunkFiles) {
	// 		const match = file.path.match(/shared\/(chunk-[^/.]+)/)
	// 		if (match) {
	// 			chunkBaseNames.add(match[1])
	// 		}
	// 	}
	// 	for (const base of chunkBaseNames) {
	// 		const filesForChunk = dtsChunkFiles.filter((f) =>
	// 			f.path.includes(`shared/${base}.d.`),
	// 		)
	// 		expect(filesForChunk.length).toBe(1)
	// 		expect(filesForChunk[0].path.endsWith('.d.ts')).toBe(true)
	// 	}
	// })

	// it('should prefix all chunk file names with the provided name in build config', async () => {
	// 	createProject({
	// 		'src/entry1.ts': `
	// 			import { sharedUtil } from './shared'
	// 			export const foo = sharedUtil('foo')
	// 		`,
	// 		'src/entry2.ts': `
	// 			import { sharedUtil } from './shared'
	// 			export const bar = sharedUtil('bar')
	// 		`,
	// 		'src/shared.ts': `
	// 			export function sharedUtil(x: string) { return x.toUpperCase() }
	// 		`,
	// 	})

	// 	const result = await runBuild({
	// 		entry: ['src/entry1.ts', 'src/entry2.ts'],
	// 		format: ['esm', 'cjs'],
	// 		splitting: true,
	// 		name: 'mybundle',
	// 	})

	// 	expect(result.success).toBe(true)

	// 	const chunkFiles = result.files.filter((f) => f.path.includes('shared/'))

	// 	expect(chunkFiles.length).toBeGreaterThan(0)
	// 	for (const file of chunkFiles) {
	// 		const baseName = file.path.split('/').pop()
	// 		expect(baseName.startsWith('mybundle-')).toBe(true)
	// 	}
	// })
})
