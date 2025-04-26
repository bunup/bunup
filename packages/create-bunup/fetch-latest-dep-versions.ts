#!/usr/bin/env node
import fs from 'node:fs/promises'
import https from 'node:https'
import path from 'node:path'

const JSON_FILE = path.join(__dirname, 'src', 'latest-dep-versions.json')

const DEPENDENCIES = [
	'@biomejs/biome',
	'@commitlint/cli',
	'@commitlint/config-conventional',
	'bunup',
	'bumpp',
	'husky',
	'typescript',
	'vitest',
]

const INTERNAL_DEPENDENCIES = ['pnpm']

async function getLatestVersion(packageName: string) {
	return new Promise((resolve, reject) => {
		const url = `https://registry.npmjs.org/${packageName}`

		https
			.get(url, (res) => {
				let data = ''

				res.on('data', (chunk) => {
					data += chunk
				})

				res.on('end', () => {
					try {
						const packageInfo = JSON.parse(data)
						const latestVersion = packageInfo['dist-tags'].latest
						console.log(
							`Latest version of ${packageName}: ${latestVersion}`,
						)
						resolve(latestVersion)
					} catch (error: any) {
						console.error(
							`Error parsing response for ${packageName}:`,
							error.message,
						)
						reject(error)
					}
				})
			})
			.on('error', (error) => {
				console.error(`Error fetching ${packageName}:`, error.message)
				reject(error)
			})
	})
}

async function updateDependencies() {
	try {
		console.log('Updating dependency versions...')

		let dependenciesData: Record<string, any> = {
			starterRootDevDependencies: {},
			internal: {},
		}

		try {
			const fileContent = await fs.readFile(JSON_FILE, 'utf8')
			if (fileContent.trim()) {
				dependenciesData = JSON.parse(fileContent)
			}
		} catch (error: any) {
			console.log('Creating new dependencies file...')
		}

		for (const dep of DEPENDENCIES) {
			try {
				const latestVersion = await getLatestVersion(dep)
				dependenciesData.starterRootDevDependencies[dep] =
					`^${latestVersion}`
			} catch (error: any) {
				console.warn(
					`Could not get latest version for ${dep}, skipping`,
				)
			}
		}

		for (const dep of INTERNAL_DEPENDENCIES) {
			try {
				const latestVersion = await getLatestVersion(dep)
				dependenciesData.internal[dep] = latestVersion
			} catch (error: any) {
				console.warn(
					`Could not get latest version for internal dep ${dep}, skipping`,
				)
			}
		}

		await fs.writeFile(
			JSON_FILE,
			`${JSON.stringify(dependenciesData, null, 4)}\n`,
			'utf8',
		)

		console.log('Dependency versions updated successfully!')
	} catch (error: any) {
		console.error('Error updating dependencies:', error.message)
		process.exit(1)
	}
}

updateDependencies()
