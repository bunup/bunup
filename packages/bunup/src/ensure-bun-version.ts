import pc from 'picocolors'
import { BunupVersionError } from './errors'

const MINIMUM_BUN_VERSION = '1.3.6'

export function ensureBunVersion(
	requiredVersion: string,
	feature?: string,
): void {
	const currentVersion = Bun.version
	const satisfiesRequirement = Bun.semver.satisfies(
		currentVersion,
		`>=${requiredVersion}`,
	)

	if (!satisfiesRequirement) {
		throw new BunupVersionError(
			pc.white(
				`Bun version ${pc.cyan(requiredVersion)} or higher is required${feature ? ` for ${feature}` : ''}. You have ${pc.yellow(currentVersion)} installed. Run ${pc.green('bun upgrade')} to update.`,
			),
		)
	}
}

export function ensureMinimumBunVersion(): void {
	ensureBunVersion(MINIMUM_BUN_VERSION)
}
