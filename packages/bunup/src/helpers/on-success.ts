import { exec } from 'tinyexec'
import treeKill from 'tree-kill'
import type { BuildOptions, OnSuccess } from '../options'
import { logger } from '../printer/logger'

export async function executeOnSuccess(
	onSuccess: OnSuccess,
	options: Partial<BuildOptions>,
	signal: AbortSignal,
): Promise<void> {
	if (typeof onSuccess === 'function') {
		const result = await onSuccess(options)

		if (typeof result === 'function') {
			signal.addEventListener('abort', () => {
				result()
			})
		}
	} else {
		const command = typeof onSuccess === 'string' ? onSuccess : onSuccess.cmd
		const spawnOptions =
			typeof onSuccess === 'object' && 'options' in onSuccess
				? onSuccess.options
				: {}

		logger.info(`Running command: ${command}`, {
			muted: true,
		})

		const proc = exec(command, [], {
			timeout: spawnOptions?.timeout,
			nodeOptions: {
				shell: true,
				stdio: 'inherit',
				env: spawnOptions?.env,
				cwd: spawnOptions?.cwd,
			},
		})

		proc.then(({ exitCode }) => {
			if (exitCode) {
				process.exitCode = exitCode
			}
		})

		signal.addEventListener('abort', () => {
			if (typeof proc.pid === 'number') {
				treeKill(proc.pid, spawnOptions?.killSignal ?? 'SIGTERM')
			}
		})
	}
}
3
