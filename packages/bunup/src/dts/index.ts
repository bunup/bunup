import path from "node:path";

import type { TsConfigData } from "../loaders";
import type { BuildOptions } from "../options";
import { bundleDts } from "./bundler";

export async function generateDts(
    rootDir: string,
    entry: string,
    options: BuildOptions,
    tsconfig: TsConfigData,
    packageJson: Record<string, unknown> | null,
): Promise<string> {
    const absoluteEntry = path.resolve(path.resolve(rootDir), entry);
    return bundleDts(absoluteEntry, options, packageJson, tsconfig, rootDir);
}
