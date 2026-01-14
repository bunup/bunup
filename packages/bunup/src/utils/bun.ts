import path from 'node:path'
import type { BuildMetafile } from 'bun'

/*
	This function assumes the `metafile` option is enabled in Bun.build
	and also assumes the path is a entrypoint path.
*/
export function getOriginalEntrypointFromOutputPath(
	metafile: BuildMetafile | undefined,
	outputPath: string,
	rootDir: string,
): string {
	const entryPoint = metafile?.outputs[outputPath]?.entryPoint as string
	return path.relative(rootDir, entryPoint)
}
