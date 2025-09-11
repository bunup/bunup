import { beforeEach, describe, expect, it } from 'bun:test'
import {
	cleanProjectDir,
	createProject,
	findFile,
	runBuild,
	validateBuildFiles,
} from '../utils'

describe('CSS Handling', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	it('generates correct CSS output for standard imports', async () => {
		createProject({
			'src/index.tsx': `
				import { Button } from './components/button';
				export function App() {
					return <Button />;
				}
			`,
			'src/components/button.tsx': `
				import './button.css';
				export function Button() {
					return <button className="buttons">Click me</button>;
				}
			`,
			'src/components/button.css': `
				.buttons {
					background-color: rebeccapurple;
				}
				.button-active {
					background-color: red;
				}
			`,
		})

		const result = await runBuild({
			entry: 'src/index.tsx',
			format: 'esm',
		})

		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.mjs', 'index.css'],
			}),
		).toBe(true)

		const cssFile = findFile(result, 'index', '.css')

		expect(cssFile).toMatchSnapshot()
	})

	it('handles CSS Modules and generates correct output', async () => {
		createProject({
			'src/button.module.css': `
				.buttons {
					background-color: rebeccapurple;
				}
				.button-active {
					background-color: red;
				}
			`,
			'src/index.tsx': `
				import React from "react";
				import styles from "./button.module.css";

				export function Button() {
					return (
						<button className={styles.buttons}>
							Click me
						</button>
					);
				}
			`,
		})

		const result = await runBuild({
			entry: 'src/index.tsx',
			format: 'esm',
		})

		expect(
			validateBuildFiles(result, {
				expectedFiles: ['index.mjs', 'index.css'],
			}),
		).toBe(true)

		const cssFile = findFile(result, 'index', '.css')
		const jsFile = findFile(result, 'index', '.mjs')

		expect(cssFile).toMatchSnapshot()

		expect(jsFile).toMatchSnapshot()
	})

	it('builds standalone CSS entrypoints', async () => {
		createProject({
			'src/entry.css': `
				:root { --brand: rebeccapurple; }
				body { background: var(--brand); }
			`,
			'src/other.css': `
				.button { color: red; }
			`,
		})

		const result = await runBuild({
			entry: ['src/entry.css', 'src/other.css'],
			format: 'esm',
		})

		expect(
			validateBuildFiles(result, {
				expectedFiles: ['entry.css', 'other.css'],
			}),
		).toBe(true)

		const entryCss = findFile(result, 'entry', '.css')
		expect(entryCss).toMatchSnapshot()

		const otherCss = findFile(result, 'other', '.css')
		expect(otherCss).toMatchSnapshot()
	})
})
