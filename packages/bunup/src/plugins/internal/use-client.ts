import type { BunupPlugin } from '../types'

/**
 * Ensures the `"use client"` directive appears at the very top of output files.
 *
 * `"use client"` directive must appear before any other
 * code, including imports. Currently Bun incorrectly places it after imports during builds.
 * This plugin fixes the directive placement by moving it to the start of affected files.
 *
 * @remarks
 * This is a temporary workaround until Bun fixes the directive placement issue.
 * Track the upstream fix at {@link https://github.com/oven-sh/bun/issues/6854}
 */
export function useClient(): BunupPlugin {
	return {
		type: 'bunup',
		name: 'use-client',
		hooks: {
			onBuildDone: async ({ output }) => {
				for (const file of output.files) {
					let text = await Bun.file(file.fullPath).text()

					const hasUseClient = text
						.split('\n')
						.some((line) => line.trim().startsWith(`"use client";`))
					if (hasUseClient) {
						text = text.replaceAll(`"use client";`, '')
						text = `"use client";\n${text}`
					}

					await Bun.write(file.fullPath, text)
				}
			},
		},
	}
}
