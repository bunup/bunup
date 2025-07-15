import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { exec } from 'tinyexec'
import { build } from '../src/build'
import type { PackageJson } from '../src/loaders'
import type { BuildOptions } from '../src/options'
import { OUTPUT_DIR, PROJECT_DIR } from './constants'

export interface BuildResult {
	success: boolean
	files: FileResult[]
	error?: Error
	packageJson: PackageJson
}

export interface RunCliResult extends BuildResult {
	stdout: string
	stderr: string
}

export interface FileResult {
	path: string
	name: string
	extension: string
	size: number
	content: string
}

function getFullExtension(fileName: string): string {
	const baseName = basename(fileName)
	const firstDotIndex = baseName.indexOf('.')
	return firstDotIndex === -1 ? '' : baseName.substring(firstDotIndex)
}

function processDirectory(dir: string): FileResult[] {
	const files = readdirSync(dir)
	const newFiles: FileResult[] = []
	for (const fileName of files) {
		const filePath = join(dir, fileName)
		if (statSync(filePath).isFile()) {
			const fileContent = readFileSync(filePath, 'utf-8')
			const fileStats = Bun.file(filePath)
			const extension = getFullExtension(fileName)
			const name = basename(fileName, extension)

			newFiles.push({
				path: cleanPath(filePath),
				name,
				extension,
				size: fileStats.size,
				content: fileContent,
			})
		} else if (statSync(filePath).isDirectory()) {
			newFiles.push(...processDirectory(filePath))
		}
	}

	return newFiles
}

function cleanPath(path: string): string {
	return path.replace(PROJECT_DIR, '').replace(/\\/g, '/')
}

export async function runBuild(
	options: Omit<BuildOptions, 'outDir'>,
): Promise<BuildResult> {
	const result: Omit<BuildResult, 'packageJson'> = {
		success: true,
		files: [],
	}

	try {
		const buildOptions = {
			outDir: '.output',
			silent: true,
			dts: false,
			...options,
		}

		await build(buildOptions, PROJECT_DIR)

		if (!existsSync(OUTPUT_DIR)) {
			throw new Error(
				`Output directory "${OUTPUT_DIR}" does not exist after build`,
			)
		}

		result.files = processDirectory(OUTPUT_DIR)
	} catch (error) {
		result.success = false
		result.error = error instanceof Error ? error : new Error(String(error))
	}

	return { ...result, packageJson: getPackageJson(PROJECT_DIR) }
}

export async function runDtsBuild(
	options: Omit<BuildOptions, 'outDir'>,
): Promise<BuildResult> {
	return runBuild({
		dts: true,
		external: [/.*/],
		...options,
	})
}

export function findFile(
	result: BuildResult | RunCliResult,
	name: string,
	extension: string,
): FileResult | undefined {
	return result.files.find(
		(file) => file.name === name && file.extension === extension,
	)
}

export function validateBuildFiles(
	result: BuildResult,
	{
		expectedFiles,
		notExpectedFiles,
	}: {
		expectedFiles: string[]
		notExpectedFiles?: string[]
	},
): boolean {
	if (!result.success) {
		return false
	}

	const allExpectedFilesExist = expectedFiles.every((fileName) => {
		const { name, extension } = parseFileName(fileName)
		const exists = result.files.some(
			(file) => file.name === name && file.extension === extension,
		)
		if (!exists) {
			console.log(`Expected file not found: ${fileName}`)
		}
		return exists
	})

	const noUnexpectedFilesExist = notExpectedFiles
		? notExpectedFiles.every((fileName) => {
				const { name, extension } = parseFileName(fileName)
				const exists = result.files.some(
					(file) => file.name === name && file.extension === extension,
				)
				if (exists) {
					console.log(`Unexpected file found: ${fileName}`)
				}
				return !exists
			})
		: true

	return allExpectedFilesExist && noUnexpectedFilesExist
}

function parseFileName(fileName: string): { name: string; extension: string } {
	const extension = getFullExtension(fileName)
	const name = basename(fileName, extension)
	return { name, extension }
}

interface ProjectTree {
	[key: string]: string
}

export function cleanProjectDir(): void {
	if (existsSync(PROJECT_DIR)) {
		rmSync(PROJECT_DIR, { recursive: true, force: true })
		mkdirSync(PROJECT_DIR, { recursive: true })
	}
}

export function createProject(tree: ProjectTree): void {
	if (!existsSync(PROJECT_DIR)) {
		mkdirSync(PROJECT_DIR, { recursive: true })
	}

	for (const [key, value] of Object.entries(tree)) {
		const path = join(PROJECT_DIR, key)
		mkdirSync(dirname(path), { recursive: true })
		writeFileSync(path, value, 'utf-8')
	}
}

export async function runCli(options: string): Promise<RunCliResult> {
	const result: Omit<RunCliResult, 'packageJson'> = {
		success: true,
		files: [],
		stdout: '',
		stderr: '',
	}

	try {
		const command = `bun run ${join(
			process.cwd(),
			'src/cli/index.ts',
		)} ${options} --out-dir .output`

		const execResult = await exec(command, [], {
			nodeOptions: {
				cwd: PROJECT_DIR,
				shell: true,
			},
		})

		result.stdout = execResult.stdout
		result.stderr = execResult.stderr

		if (execResult.exitCode !== 0) {
			result.success = false
			result.error = new Error(
				`CLI command failed with exit code ${execResult.exitCode}: ${execResult.stderr}`,
			)
			return {
				...result,
				packageJson: {
					data: null,
					path: null,
				},
			}
		}

		if (!existsSync(OUTPUT_DIR)) {
			throw new Error(
				`Output directory "${OUTPUT_DIR}" does not exist after build`,
			)
		}

		result.files = processDirectory(OUTPUT_DIR)
	} catch (error) {
		result.success = false
		result.error = error instanceof Error ? error : new Error(String(error))
	}

	return { ...result, packageJson: getPackageJson(PROJECT_DIR) }
}

function getPackageJson(rootDir: string): PackageJson {
	try {
		const packageJsonPath = join(rootDir, 'package.json')
		const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
		return {
			data: packageJson,
			path: packageJsonPath,
		}
	} catch {
		return {
			data: null,
			path: null,
		}
	}
}

export function isCI() {
	return process.env.GITHUB_ACTIONS === 'true'
}
