import type { Plugin } from "rolldown";

import { resolveTsImportPath } from "ts-import-resolver";
import type { TsConfigData } from "../loaders";
import { generateDtsContent } from "./generator";
import {
    NODE_MODULES_RE,
    TS_DTS_RE,
    addDtsVirtualPrefix,
    getDtsPathFromSourceCodePath,
    isDtsVirtualFile,
    isTypeScriptSourceCodeFile,
    removeDtsVirtualPrefix,
} from "./utils";

export const DTS_VIRTUAL_FILE_PREFIX = "\0dts:";

export const virtualDtsPlugin = (
    entrySourceCodeFile: string,
    tsconfig: TsConfigData,
    rootDir: string,
): Plugin => {
    const dtsToSourceCodeFileMap = new Map<string, string>();

    return {
        name: "bunup:virtual-dts",
        async resolveId(source: string, importer?: string) {
            // entry file
            if (isDtsVirtualFile(source)) {
                dtsToSourceCodeFileMap.set(source, entrySourceCodeFile);
                return source;
            }
            //
            if (!importer || !isDtsVirtualFile(importer)) return null;

            const resolvedPath = tsconfig.tsconfig
                ? resolveTsImportPath({
                      path: source,
                      importer: removeDtsVirtualPrefix(importer),
                      tsconfig: tsconfig.tsconfig,
                      rootDir,
                  })
                : null;

            if (!resolvedPath || !isTypeScriptSourceCodeFile(resolvedPath))
                return null;

            const dtsPath = getDtsPathFromSourceCodePath(resolvedPath);

            if (!dtsPath) return null;

            const dtsPathWithVirtualPrefix = addDtsVirtualPrefix(dtsPath);

            dtsToSourceCodeFileMap.set(dtsPathWithVirtualPrefix, resolvedPath);

            return dtsPathWithVirtualPrefix;
        },
        load: {
            filter: {
                id: {
                    include: [TS_DTS_RE],
                    exclude: [NODE_MODULES_RE],
                },
            },
            async handler(id: string) {
                if (isDtsVirtualFile(id)) {
                    const sourceCodePath = dtsToSourceCodeFileMap.get(id);
                    if (!sourceCodePath) return null;
                    const declaration =
                        await generateDtsContent(sourceCodePath);
                    if (!declaration) return null;
                    return {
                        code: declaration,
                        moduleSideEffects: false,
                    };
                }
                return null;
            },
        },
        buildEnd() {
            dtsToSourceCodeFileMap.clear();
        },
    };
};
