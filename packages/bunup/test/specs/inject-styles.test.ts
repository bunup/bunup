import { beforeEach, describe, expect, it } from 'bun:test'
import { injectStyles } from '../../src/plugins'
import { cleanProjectDir, createProject, findFile, runBuild } from '../utils'

describe('injectStyles plugin', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	it('should transform CSS files to JS that injects styles', async () => {
		createProject({
			'src/index.ts': `
                import './styles.css';
                export const hello = 'world';
            `,
			'src/styles.css': `
                .container {
                    color: red;
                    padding: 20px;
                }
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [injectStyles()],
		})

		expect(result.success).toBe(true)
		const file = findFile(result, 'index', '.mjs')
		expect(file).toBeDefined()
		expect(file?.content).toMatchSnapshot()
	})

	it('should use custom inject function when provided', async () => {
		createProject({
			'src/index.ts': `
                import './styles.css';
                export const hello = 'world';
            `,
			'src/styles.css': `
                .button {
                    background-color: blue;
                    color: white;
                }
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [
				injectStyles({
					inject: (css, filePath) => {
						return `console.log("Custom injection for ${filePath}"); document.adoptedStyleSheets = [...document.adoptedStyleSheets || [], (() => { const sheet = new CSSStyleSheet(); sheet.replaceSync(${css}); return sheet; })()];`
					},
				}),
			],
		})

		expect(result.success).toBe(true)
		const file = findFile(result, 'index', '.mjs')
		expect(file).toBeDefined()
		expect(file?.content).toMatchSnapshot()
	})

	it('should handle multiple CSS files', async () => {
		createProject({
			'src/index.ts': `
                import './base.css';
                import './components.css';
                export const app = 'my-app';
            `,
			'src/base.css': `
                body {
                    margin: 0;
                    font-family: sans-serif;
                }
            `,
			'src/components.css': `
                .card {
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [injectStyles()],
		})

		expect(result.success).toBe(true)
		const file = findFile(result, 'index', '.mjs')
		expect(file).toBeDefined()
		expect(file?.content).toMatchSnapshot()
	})

	it('should handle CSS in different formats correctly', async () => {
		createProject({
			'src/index.ts': `
                import './styles.css';
                export const hello = 'world';
            `,
			'src/styles.css': `
                /* Custom properties */
                :root {
                    --primary-color: #3498db;
                }

                /* Media query */
                @media (max-width: 768px) {
                    .container {
                        padding: 10px;
                    }
                }

                /* Nested selectors */
                .container {
                    color: var(--primary-color);

                    .title {
                        font-size: 24px;
                    }
                }
            `,
		})

		const result = await runBuild({
			entry: 'src/index.ts',
			format: 'esm',
			plugins: [injectStyles()],
		})

		expect(result.success).toBe(true)
		const file = findFile(result, 'index', '.mjs')
		expect(file).toBeDefined()
		expect(file?.content).toMatchSnapshot()
	})
})
