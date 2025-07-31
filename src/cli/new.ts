import { renameSync } from 'node:fs'
import path from 'node:path'
import {
	cancel,
	confirm,
	intro,
	outro,
	select,
	tasks,
	text,
} from '@clack/prompts'
import { downloadTemplate } from 'giget'
import pc from 'picocolors'
import { replaceInFile } from 'replace-in-file'
import { link } from '../logger'
import { pathExistsSync } from '../utils'
import { displayBunupGradientArt } from './utils'

type Template = {
	type: 'typescript' | 'react'
	defaultName: string
	name: string
	dir: string
	monorepoDir?: string
}

const TEMPLATE_OWNER = 'arshad-yaseen'
const TEMPLATE_REPO = 'bunup-new'

const GITHUB_USERNAME_PLACEHOLDER = 'username'
const GITHUB_REPO_PLACEHOLDER = 'repo-name'
const MONOREPO_FIRST_PACKAGE_NAME_PLACEHOLDER = 'package-1'
const MONOREPO_PACKAGES_DIR = 'packages'

const TEMPLATES: Template[] = [
	{
		type: 'typescript',
		defaultName: 'my-ts-lib',
		name: 'TypeScript Library',
		dir: 'ts-lib',
		monorepoDir: 'ts-lib-monorepo',
	},
	{
		type: 'react',
		defaultName: 'my-react-lib',
		name: 'React Library',
		dir: 'react-lib',
	},
]

export async function newProject(): Promise<void> {
	displayBunupGradientArt()
	intro(pc.bgCyan(pc.black(' Scaffold a new project with Bunup ')))

	const selectedTemplateDir = await select({
		message: 'Select a template',
		options: TEMPLATES.map((template) => ({
			value: template.dir,
			label: pc.blue(template.name),
		})),
	})

	const template = TEMPLATES.find((t) => t.dir === selectedTemplateDir)

	if (!template) {
		cancel('Invalid template')
		process.exit(1)
	}

	const hasMonorepo = template.monorepoDir !== undefined

	const projectName = (await text({
		message: 'Enter the project name',
		placeholder: template.defaultName,
		defaultValue: template.defaultName,
		validate: (value) => {
			if (!value) {
				return 'Project name is required'
			}

			if (value.includes(' ')) {
				return 'Project name cannot contain spaces'
			}

			if (pathExistsSync(getProjectPath(value))) {
				return 'Project already exists'
			}
		},
	})) as string

	const projectPath = getProjectPath(projectName)

	let useMonorepo = false
	let monorepoFirstPackageName: string | undefined

	if (hasMonorepo) {
		useMonorepo = (await confirm({
			message: 'Do you want to create a monorepo?',
			initialValue: false,
		})) as boolean

		if (useMonorepo) {
			monorepoFirstPackageName = (await text({
				message: 'Enter the name of the first package',
				placeholder: MONOREPO_FIRST_PACKAGE_NAME_PLACEHOLDER,
				defaultValue: MONOREPO_FIRST_PACKAGE_NAME_PLACEHOLDER,
			})) as string
		}
	}

	const githubRepoInfo = (await text({
		message: 'GitHub username and repo name (username/repo):',
		placeholder: `${GITHUB_USERNAME_PLACEHOLDER}/${GITHUB_REPO_PLACEHOLDER}`,
		defaultValue: `${GITHUB_USERNAME_PLACEHOLDER}/${GITHUB_REPO_PLACEHOLDER}`,
	})) as string

	const [githubUsername, githubRepoName] = githubRepoInfo.split('/')

	await tasks([
		{
			title: 'Downloading template',
			task: async () => {
				const templatePath = useMonorepo ? template.monorepoDir : template.dir
				await downloadTemplate(
					`github:${TEMPLATE_OWNER}/${TEMPLATE_REPO}/${templatePath}`,
					{
						dir: projectPath,
					},
				)

				return 'Template downloaded'
			},
		},
		{
			title: 'Making the project yours',
			task: async () => {
				await replaceInFile({
					files: path.join(projectPath, '**/*'),
					from: [
						new RegExp(GITHUB_REPO_PLACEHOLDER, 'g'),
						new RegExp(GITHUB_USERNAME_PLACEHOLDER, 'g'),
						new RegExp(template.defaultName, 'g'),
					],
					to: [githubRepoName, githubUsername, projectName],
					ignore: ['node_modules', 'dist', 'bun.lock'],
				})

				if (useMonorepo && monorepoFirstPackageName) {
					await replaceInFile({
						files: path.join(projectPath, '**/*'),
						from: [new RegExp(MONOREPO_FIRST_PACKAGE_NAME_PLACEHOLDER, 'g')],
						to: [monorepoFirstPackageName],
						ignore: ['node_modules', 'dist', 'bun.lock'],
					})

					renameSync(
						path.join(
							projectPath,
							MONOREPO_PACKAGES_DIR,
							MONOREPO_FIRST_PACKAGE_NAME_PLACEHOLDER,
						),
						path.join(
							projectPath,
							MONOREPO_PACKAGES_DIR,
							monorepoFirstPackageName,
						),
					)
				}
			},
		},
	])

	outro(`
   ${pc.green('✨ Project scaffolded successfully! ✨')}

   ${pc.bold('Ready to launch your awesome new project?')}

   ${pc.cyan('cd')} ${projectName}
   ${pc.cyan('bun install')}
   ${pc.cyan('bun run dev')}${pc.dim(' (watch mode for development)')}${template.type === 'react' ? `\n   ${pc.cyan('bun run dev:test')} ${pc.dim('(preview components in a test Next.js app)')} ` : ''}

   ${pc.dim('Learn more:')} ${link('https://bunup.dev/docs')}

   ${pc.yellow('Happy coding!')} 🚀
		`)
}

function getProjectPath(projectName: string): string {
	return path.join(process.cwd(), projectName)
}
