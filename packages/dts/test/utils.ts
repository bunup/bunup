import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { type GenerateDtsOptions, generateDts } from '../src'
import type { GenerateDtsResultFile } from '../src/options'

const PROJECT_DIR = 'packages/dts/test/.project'

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

export async function runGenerateDts(
	entry: string[],
	options: GenerateDtsOptions = {},
): Promise<GenerateDtsResultFile[]> {
	const { files } = await generateDts(entry, {
		...options,
		cwd: PROJECT_DIR,
	})

	return files
}
