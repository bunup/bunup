#!/usr/bin/env node
import { exec as execCallback } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { promisify } from 'node:util'

import {
	confirm,
	intro,
	log,
	note,
	outro,
	select,
	spinner,
	text,
} from '@clack/prompts'
import colors from 'picocolors'

import latestDepVersions from './latest-dep-versions.json' assert {
	type: 'json',
}

const exec = promisify(execCallback)

type PackageManager = 'bun' | 'pnpm'

interface ProjectOptions {
	projectPath: string
	projectDir: string
	projectName: string
	packageManager: PackageManager
	isMonorepo: boolean
	packages: string[]
	githubRepo: string
	description: string
}

interface PackageJson {
	name: string
	version: string
	description?: string
	private?: boolean
	workspaces?: string[]
	main?: string
	module?: string
	types?: string
	files?: string[]
	scripts: Record<string, string>
	dependencies: Record<string, string>
	devDependencies: Record<string, string>
	license: string
	repository?: {
		type: string
		url: string
	}
	homepage?: string
	packageManager?: string
}

async function main() {
	intro(colors.bgCyan(colors.black(' TypeScript Library Starter ')))

	const projectPath = await text({
		message: 'Where would you like to create your project?',
		placeholder: 'my-ts-lib',
		initialValue: 'my-ts-lib',
		validate(value) {
			if (!value) return 'Please enter a directory name'
			if (existsSync(value) && value !== '.')
				return 'Directory already exists'
			return
		},
	})

	if (typeof projectPath !== 'string') process.exit(1)

	const githubRepo = await text({
		message: 'GitHub username and repo name (username/repo):',
		placeholder: 'username/repo-name',
		validate(value) {
			if (!value.includes('/'))
				return 'Please use the format username/repo'
			return
		},
	})

	if (typeof githubRepo !== 'string') process.exit(1)

	const description = await text({
		message: 'Package description:',
		placeholder: 'A TypeScript library',
	})

	if (typeof description !== 'string') process.exit(1)

	const packageManager = (await select({
		message: 'Select a package manager:',
		options: [
			{
				value: 'bun',
				label: 'bun',
				hint: 'Fast all-in-one JavaScript runtime',
			},
			{
				value: 'pnpm',
				label: 'pnpm',
				hint: 'Fast, disk space efficient package manager',
			},
		],
	})) as PackageManager

	if (typeof packageManager !== 'string') process.exit(1)

	const projectDir =
		projectPath === '.'
			? process.cwd()
			: resolve(process.cwd(), projectPath)

	const projectName =
		projectPath === '.' ? basename(process.cwd()) : basename(projectPath)

	const isMonorepo = await confirm({
		message: 'Set up as a monorepo?',
		initialValue: false,
	})

	if (typeof isMonorepo !== 'boolean') process.exit(1)

	let packages: string[] = []
	if (isMonorepo) {
		const pkg1 = await text({
			message: 'Name for first package:',
			placeholder: projectName,
			initialValue: projectName,
			validate(value) {
				if (!value) return 'Please enter a package name'
				return
			},
		})

		if (typeof pkg1 !== 'string') process.exit(1)

		packages = [pkg1]
	}

	try {
		const options: ProjectOptions = {
			projectPath,
			projectDir,
			projectName,
			packageManager,
			isMonorepo,
			packages,
			githubRepo,
			description,
		}

		const createSpinner = spinner()
		createSpinner.start('Creating your TypeScript project')

		await createProjectFiles(options)
		createSpinner.stop(`${colors.green('Project created')}`)

		note(
			`${colors.cyan('cd')} ${projectPath !== '.' ? projectPath : ''}
${colors.cyan(`${packageManager} install`)}
${colors.cyan(`${packageManager} run dev`)}`,
			'Next steps',
		)

		outro('Happy coding!')
	} catch (error: any) {
		log.error(`Error: ${error.message}`)
		process.exit(1)
	}
}

async function createProjectFiles(options: ProjectOptions): Promise<void> {
	const {
		projectDir,
		projectName,
		packageManager,
		isMonorepo,
		packages,
		githubRepo,
	} = options

	if (projectDir !== process.cwd() && !existsSync(projectDir)) {
		await mkdir(projectDir, { recursive: true })
	}

	if (isMonorepo) {
		await mkdir(join(projectDir, 'packages'), { recursive: true })
	}

	const rootPackageJson = createRootPackageJson(options)
	await writeFile(
		join(projectDir, 'package.json'),
		JSON.stringify(rootPackageJson, null, 2),
	)

	const tsConfig = generateTsConfig(isMonorepo)
	await writeFile(
		join(projectDir, 'tsconfig.json'),
		JSON.stringify(tsConfig, null, 2),
	)

	const contributing = generateContributing(options)
	await writeFile(join(projectDir, 'CONTRIBUTING.md'), contributing)

	const license = generateLicense(githubRepo.split('/')[0])
	await writeFile(join(projectDir, 'LICENSE'), license)

	const biomeConfig = {
		$schema: 'https://biomejs.dev/schemas/1.5.3/schema.json',
		organizeImports: {
			enabled: true,
		},
		linter: {
			enabled: true,
			rules: {
				recommended: true,
			},
			ignore: ['dist', 'node_modules'],
		},
		formatter: {
			enabled: true,
			indentStyle: 'space',
			indentWidth: 4,
			ignore: ['dist', 'node_modules'],
		},
		vcs: {
			enabled: true,
			useIgnoreFile: true,
			clientKind: 'git',
		},
	}

	await writeFile(
		join(projectDir, 'biome.json'),
		JSON.stringify(biomeConfig, null, 2),
	)

	await writeFile(
		join(projectDir, 'commitlint.config.mjs'),
		`export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
  },
};
`,
	)

	await writeFile(
		join(projectDir, 'vitest.config.ts'),
		`import { defineConfig } from 'vitest/config'

export default defineConfig({})
`,
	)

	await mkdir(join(projectDir, '.husky'), { recursive: true })

	await writeFile(
		join(projectDir, '.husky/commit-msg'),
		'npx --no -- commitlint --edit $1',
	)

	await writeFile(
		join(projectDir, '.husky/pre-commit'),
		packageManager === 'bun'
			? 'bun run tsc && bun run lint && bun run format'
			: 'pnpm tsc && pnpm lint && pnpm format',
	)

	try {
		await exec(`chmod +x ${join(projectDir, '.husky/commit-msg')}`)
		await exec(`chmod +x ${join(projectDir, '.husky/pre-commit')}`)
	} catch (error) {}

	await writeFile(
		join(projectDir, '.gitignore'),
		`node_modules
.pnp
.pnp.js
coverage
dist
out
build
.DS_Store
*.pem
.idea
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.turbo
`,
	)

	await writeFile(join(projectDir, '.gitattributes'), '* text=auto eol=lf')

	await writeFile(
		join(projectDir, '.editorconfig'),
		`root = true

[*]
indent_style = tab
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
charset = utf-8
quote_type = single

[*.yml]
indent_style = space
indent_size = 2`,
	)

	await writeFile(
		join(projectDir, 'README.md'),
		`# ${projectName}

${options.description ? options.description : 'A TypeScript library built with [bunup](https://bunup.dev/).'}

## Installation

\`\`\`bash
npm install ${projectName}
\`\`\`

## Usage

\`\`\`typescript
import { greet } from '${projectName}';

console.log(greet('World')); // Hello, World!
\`\`\`

## Development

\`\`\`bash
# Install dependencies
${packageManager === 'bun' ? 'bun install' : 'pnpm install'}

# Build
${packageManager === 'bun' ? 'bun run build' : 'pnpm build'}

# Develop with watch mode
${packageManager === 'bun' ? 'bun run dev' : 'pnpm dev'}

# Run tests
${packageManager === 'bun' ? 'bun run test' : 'pnpm test'}
\`\`\`

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT
`,
	)

	await createBunupConfig(options)

	await mkdir(join(projectDir, '.github', 'workflows'), { recursive: true })

	await writeFile(
		join(projectDir, '.github', 'workflows', 'ci.yml'),
		`name: CI
on:
      push:
            branches:
                  - 'main'
      pull_request: {}

jobs:
      ci:
            strategy:
                  matrix:
                        os: [ubuntu-latest, macos-latest, windows-latest]
                        node-version: [20.x]
            runs-on: \${{ matrix.os }}
            steps:
                  - name: Checkout repository
                    uses: actions/checkout@v4

                  - name: Setup Node.js
                    uses: actions/setup-node@v4
                    with:
                          node-version: \${{ matrix.node-version }}
${
	packageManager === 'pnpm'
		? `
                  - name: Install pnpm
                    uses: pnpm/action-setup@v2
                    with:
                          version: latest

                  - name: Install dependencies
                    run: pnpm install

                  - name: Run validation
                    run: pnpm tsc && pnpm lint && pnpm format

                  - name: Run tests
                    run: pnpm test`
		: `
                  - name: Setup Bun
                    uses: oven-sh/setup-bun@v1
                    with:
                          bun-version: latest
                          
                  - name: Install dependencies
                    run: bun install

                  - name: Run validation
                    run: bun run tsc && bun run lint && bun run format

                  - name: Run tests
                    run: bun run test`
}
`,
	)

	await writeFile(
		join(projectDir, '.github', 'workflows', 'release.yml'),
		`name: Release

permissions:
      contents: write
      id-token: write

on:
      push:
            tags:
                  - 'v*'

jobs:
      release:
            runs-on: ubuntu-latest
            steps:
                  - uses: actions/checkout@v4
                    with:
                          fetch-depth: 0
                  - uses: actions/setup-node@v4
                    with:
                          node-version: lts/*
                          registry-url: https://registry.npmjs.org/
                  - uses: oven-sh/setup-bun@v1
                    with:
                          bun-version: latest
${
	packageManager === 'pnpm'
		? `                  - uses: pnpm/action-setup@v4
                  - run: pnpm install
                  - run: pnpm build`
		: `                  - run: bun install
                  - run: bun run build`
}
                  - run: npx changelogithub
                    continue-on-error: true
                    env:
                          GITHUB_TOKEN: \${{secrets.GITHUB_TOKEN}}
                  - run: ${packageManager === 'pnpm' ? 'pnpm' : 'bun'} run publish:ci
                    env:
                          ${packageManager === 'bun' ? 'NPM_CONFIG_TOKEN' : 'NODE_AUTH_TOKEN'}: \${{ secrets.NPM_TOKEN }}
                          NPM_CONFIG_PROVENANCE: true
`,
	)

	await writeFile(
		join(projectDir, '.github', 'workflows', 'close-issues.yml'),
		`name: Close inactive issues
on:
      schedule:
            - cron: '30 1 * * *'

jobs:
      close-issues:
            runs-on: ubuntu-latest
            permissions:
                  issues: write
                  pull-requests: write
            steps:
                  - uses: actions/stale@v5
                    with:
                          days-before-issue-stale: 30
                          days-before-issue-close: 14
                          stale-issue-label: 'stale'
                          stale-issue-message: 'This issue is stale because it has been open for 30 days with no activity.'
                          close-issue-message: 'This issue was closed because it has been inactive for 14 days since being marked as stale.'
                          days-before-pr-stale: -1
                          days-before-pr-close: -1
                          repo-token: \${{ secrets.GITHUB_TOKEN }}
`,
	)

	await mkdir(join(projectDir, '.github'), { recursive: true })

	await writeFile(
		join(projectDir, '.github', 'PULL_REQUEST_TEMPLATE.md'),
		`<!--
Thanks for your interest in the project. Bugs filed and PRs submitted are appreciated!

Please make sure that you are familiar with and follow the Code of Conduct for
this project (found in the CODE_OF_CONDUCT.md file).

Please fill out the information below to expedite the review and (hopefully)
merge of your pull request!
-->

<!-- What changes are being made? (What feature/bug is being fixed here?) -->

**What**:

<!-- Why are these changes necessary? -->

**Why**:

<!-- How were these changes implemented? -->

**How**:

<!-- Have you done all of these things?  -->

**Checklist**:

<!-- add "N/A" to the end of each line that's irrelevant to your changes -->
<!-- to check an item, place an "x" in the box like so: "- [x] Documentation" -->

- [ ] Documentation
- [ ] Tests
- [ ] Ready to be merged
      <!-- In your opinion, is this ready to be merged as soon as it's reviewed? -->

<!-- feel free to add additional comments -->
`,
	)

	await writeFile(
		join(projectDir, '.github', 'ISSUE_TEMPLATE.md'),
		`<!--
Thanks for your interest in the project. I appreciate bugs filed and PRs submitted!
Please make sure that you are familiar with and follow the Code of Conduct for
this project (found in the CODE_OF_CONDUCT.md file).

Please fill out this template with all the relevant information so we can
understand what's going on and fix the issue.
-->

- \`${projectName}\` version:

Relevant code or config

\`\`\`javascript

\`\`\`

What you did:

What happened:

<!-- Please provide the full error message/screenshots/anything -->

Reproduction repository:

<!--
If possible, please create a repository that reproduces the issue with the
minimal amount of code possible.
-->

Problem description:

Suggested solution:
`,
	)

	if (isMonorepo) {
		if (packageManager === 'pnpm') {
			await writeFile(
				join(projectDir, 'pnpm-workspace.yaml'),
				`packages:
  - 'packages/*'
`,
			)
		}

		for (const pkg of packages) {
			const pkgDir = join(projectDir, 'packages', pkg)
			await mkdir(pkgDir, { recursive: true })
			await mkdir(join(pkgDir, 'src'), { recursive: true })
			await mkdir(join(pkgDir, 'test'), { recursive: true })

			const pkgJson = createPackageJson(pkg, options)
			await writeFile(
				join(pkgDir, 'package.json'),
				JSON.stringify(pkgJson, null, 2),
			)

			const packageTsConfig = generatePackageTsConfig()
			await writeFile(
				join(pkgDir, 'tsconfig.json'),
				JSON.stringify(packageTsConfig, null, 2),
			)

			await writeFile(
				join(pkgDir, 'src', 'index.ts'),
				`export function greet(name: string): string {
  return \`Hello, \${name}! Welcome to the ${pkg} package.\`;
}
`,
			)

			await writeFile(
				join(pkgDir, 'test', 'index.test.ts'),
				`import { describe, it, expect } from 'vitest';
import { greet } from '../src';

describe('${pkg} package', () => {
  it('should greet correctly', () => {
    expect(greet('World')).toBe('Hello, World! Welcome to the ${pkg} package.');
  });
});
`,
			)
		}
	} else {
		await mkdir(join(projectDir, 'src'), { recursive: true })
		await mkdir(join(projectDir, 'test'), { recursive: true })

		await writeFile(
			join(projectDir, 'src', 'index.ts'),
			`export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`,
		)

		await writeFile(
			join(projectDir, 'test', 'index.test.ts'),
			`import { describe, it, expect } from 'vitest';
import { greet } from '../src';

describe('greet', () => {
  it('should greet correctly', () => {
    expect(greet('World')).toBe('Hello, World!');
  });
});
`,
		)
	}

	try {
		await exec(`cd ${projectDir} && git init`)
		await exec(
			`cd ${projectDir} && git remote add origin https://github.com/${githubRepo}.git`,
		)
	} catch (error) {
		console.error('Failed to initialize git repository:', error)
	}
}

function createRootPackageJson(options: ProjectOptions): PackageJson {
	const {
		projectName,
		packageManager,
		isMonorepo,
		packages,
		githubRepo,
		description,
	} = options

	const workspaces = isMonorepo ? { workspaces: ['packages/*'] } : {}
	const repoUrl = `https://github.com/${githubRepo}`

	return {
		name: isMonorepo ? `${projectName}-monorepo` : projectName,
		version: '0.1.0',
		description: !isMonorepo ? description : undefined,
		private: isMonorepo ? true : undefined,
		main: './dist/index.js',
		module: './dist/index.mjs',
		types: './dist/index.d.ts',
		files: ['dist'],
		...workspaces,
		scripts: {
			build: 'bunup',
			dev: 'bunup --watch',
			lint: 'biome check .',
			'lint:fix': 'biome check --write .',
			format: 'biome format .',
			'format:fix': 'biome format --write .',
			tsc: 'tsc --noEmit',
			test: 'vitest run',
			'test:watch': 'vitest',
			'test:coverage': 'vitest run --coverage',
			release: `bumpp${isMonorepo ? ' -r' : ''} --commit --push --tag`,
			'publish:ci': `${packageManager}${isMonorepo ? ` --filter ${packages.map((pkg) => `'${pkg}'`).join(' --filter ')}` : ''} publish --access public --no-git-checks`,
			prepare: 'husky',
		},
		dependencies: {},
		devDependencies: latestDepVersions.starterRootDevDependencies,
		license: 'MIT',
		repository: {
			type: 'git',
			url: `git+${repoUrl}.git`,
		},
		homepage: `${repoUrl}#readme`,
		...(packageManager === 'pnpm'
			? {
					packageManager: `pnpm@${latestDepVersions.internal.pnpm}`,
				}
			: {}),
	}
}

function generateTsConfig(isMonorepo: boolean): Record<string, any> {
	return {
		compilerOptions: {
			target: 'ES2020',
			module: 'ESNext',
			moduleResolution: 'bundler',
			esModuleInterop: true,
			strict: true,
			skipLibCheck: true,
			declaration: true,
			outDir: './dist',
			...(!isMonorepo ? { rootDir: './src' } : {}),
			...(!isMonorepo ? { baseUrl: '.' } : {}),
		},
		include: [!isMonorepo ? 'src/**/*' : 'packages/**/src/**/*'],
		exclude: ['node_modules', 'dist'],
	}
}

function generatePackageTsConfig(): Record<string, any> {
	return {
		extends: '../../tsconfig.json',
		compilerOptions: {
			rootDir: './src',
			outDir: './dist',
		},
		include: ['src/**/*'],
	}
}

function createPackageJson(
	packageName: string,
	options: ProjectOptions,
): PackageJson {
	const { projectName, isMonorepo, githubRepo, description } = options
	const repoUrl = `https://github.com/${githubRepo}`

	return {
		name: isMonorepo ? `@${projectName}/${packageName}` : packageName,
		version: '0.1.0',
		description:
			isMonorepo && packageName === options.packages[0]
				? description
				: undefined,
		main: './dist/index.js',
		module: './dist/index.mjs',
		types: './dist/index.d.ts',
		files: ['dist'],
		scripts: {
			build: 'bunup',
			dev: 'bunup --watch',
			test: 'vitest run',
		},
		dependencies: {},
		devDependencies: {},
		license: 'MIT',
		repository: {
			type: 'git',
			url: `git+${repoUrl}.git`,
		},
		homepage: `${repoUrl}#readme`,
	}
}

async function createBunupConfig(options: ProjectOptions): Promise<void> {
	const { projectDir, isMonorepo, packages } = options

	if (isMonorepo) {
		await writeFile(
			join(projectDir, 'bunup.config.ts'),
			`import { defineWorkspace } from 'bunup';

export default defineWorkspace([
  ${packages
		.map(
			(pkg) => `{
    name: '${pkg}',
    root: 'packages/${pkg}',
    config: {
      entry: ['src/index.ts'],
      format: ['esm', 'cjs'],
      dts: true,
      minify: true,
    },
  }`,
		)
		.join(',\n  ')}
]);
`,
		)
	} else {
		await writeFile(
			join(projectDir, 'bunup.config.ts'),
			`import { defineConfig } from 'bunup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  minify: true,
});
`,
		)
	}
}

function generateContributing(options: ProjectOptions): string {
	const { projectName, packageManager, isMonorepo, githubRepo } = options
	const runCmd = packageManager === 'bun' ? 'bun run' : 'pnpm'
	const username = githubRepo.split('/')[0]

	return `# Contributing to ${projectName}

Thank you for your interest in contributing to our project! This guide will help you get started with the development process.

## Development Setup

### Prerequisites

- ${packageManager === 'bun' ? 'Bun' : 'Node.js and pnpm'} installed on your system

### Getting Started

1. Fork the repository
2. Clone your fork: \`git clone https://github.com/${username}/${projectName}.git\`
3. Navigate to the project directory: \`cd ${projectName}\`
4. Install dependencies: \`${packageManager} install\`
5. Start development: \`${runCmd} dev\`

${
	isMonorepo
		? `
## Working with the Monorepo

This project uses a monorepo structure with ${packageManager === 'bun' ? 'Bun workspaces' : 'pnpm workspaces'}. All packages are located in the \`packages/\` directory.`
		: ''
}

## Development Workflow

1. Create a new branch: \`git checkout -b feature/your-feature-name\`
2. Make your changes
3. Format your code: \`${runCmd} format\`
4. Run linting: \`${runCmd} lint\`
5. Run tests: \`${runCmd} test\`
6. Build the project: \`${runCmd} build\`
7. Commit your changes using the conventions below
8. Push your branch to your fork
9. Open a pull request

## Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear and structured commit messages:

- \`feat:\` New features
- \`fix:\` Bug fixes
- \`docs:\` Documentation changes
- \`style:\` Code style changes (formatting, etc.)
- \`refactor:\` Code changes that neither fix bugs nor add features
- \`perf:\` Performance improvements
- \`test:\` Adding or updating tests
- \`chore:\` Maintenance tasks, dependencies, etc.

## Pull Request Guidelines

1. Update documentation if needed
2. Ensure all tests pass
3. Address any feedback from code reviews
4. Once approved, your PR will be merged

## Code of Conduct

Please be respectful and constructive in all interactions within our community.

## Questions?

If you have any questions, please open an issue for discussion.

Thank you for contributing to ${projectName}!
`
}

function generateLicense(username: string): string {
	const year = new Date().getFullYear()

	return `MIT License

Copyright (c) ${year} ${namify(username)}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
}

function namify(name: string): string {
	return name
		.replace(/-/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase())
}

main().catch(console.error)
