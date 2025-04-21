import { basename, extname } from "node:path";
import { logger } from "../logger";
import type { Entry } from "../options";
import { generateRandomSuffix, isTypeScriptFile } from "../utils";

export type ProcessableEntry = {
    name: string;
    path: string;
};

export function getEntryNameOnly(entry: string): string {
    const filename = basename(entry);
    const extension = extname(filename);
    return extension ? filename.slice(0, -extension.length) : filename;
}

export function normalizeEntryToProcessableEntries(
    entry: Entry,
    {
        warnOnConflict = true,
    }: {
        warnOnConflict?: boolean;
    } = {},
): ProcessableEntry[] {
    const result: ProcessableEntry[] = [];
    const usedNames = new Set<string>();
    const nameToPath: Record<string, string> = {};

    function addEntry(name: string, path: string) {
        if (usedNames.has(name)) {
            const randomSuffix = generateRandomSuffix();
            const newName = `${name}_${randomSuffix}`;
            if (warnOnConflict) {
                logger.warn(
                    `Output name conflict: "${name}" is used by multiple files.\nBunup uses filenames without extensions as output names by default.\n\n${nameToPath[name]} -> ${name}.js\n${path} -> ${newName}.js (auto-renamed to avoid conflict)\n\nTo fix this, use named entries in your configuration:\n{\n  entry: {\n    custom_name: "${nameToPath[name]}",\n    another_name: "${path}"\n  }\n}\n\nSee: https://bunup.dev/documentation/#named-entries`,
                    {
                        muted: true,
                        verticalSpace: true,
                    },
                );
            }
            result.push({ name: newName, path });
        } else {
            result.push({ name, path });
            usedNames.add(name);
            nameToPath[name] = path;
        }
    }

    if (Array.isArray(entry)) {
        for (const item of entry) {
            const name = getEntryNameOnly(item);
            addEntry(name, item);
        }
    } else if (typeof entry === "object") {
        for (const [name, path] of Object.entries(entry)) {
            addEntry(name, path as string);
        }
    } else {
        const name = getEntryNameOnly(entry);
        addEntry(name, entry);
    }

    return result;
}

export function filterTypeScriptEntries(
    entries: ProcessableEntry[],
): ProcessableEntry[] {
    return entries.filter((entry) => isTypeScriptFile(entry.path));
}

export function getEntryNamingFormat(name: string, extension: string) {
    return `[dir]/${name}${extension}`;
}
