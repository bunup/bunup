import {
    existsSync,
    readFileSync,
    readdirSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { mkdirSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { exec } from "tinyexec";
import { build } from "../src/build";
import type { BuildOptions } from "../src/options";
import { OUTPUT_DIR, PROJECT_DIR } from "./constants";

export interface BuildResult {
    success: boolean;
    files: FileResult[];
    error?: Error;
}

export interface RunCliResult extends BuildResult {
    stdout: string;
    stderr: string;
}

export interface FileResult {
    path: string;
    name: string;
    extension: string;
    size: number;
    content: string;
}

function getFullExtension(fileName: string): string {
    const baseName = basename(fileName);
    const firstDotIndex = baseName.indexOf(".");
    return firstDotIndex === -1 ? "" : baseName.substring(firstDotIndex);
}

export async function runBuild(
    options: Omit<BuildOptions, "outDir">,
): Promise<BuildResult> {
    const result: BuildResult = {
        success: true,
        files: [],
    };

    try {
        const buildOptions = {
            ...options,
            outDir: ".output",
            silent: true,
        };

        await build(buildOptions, PROJECT_DIR);

        if (!existsSync(OUTPUT_DIR)) {
            throw new Error(
                `Output directory "${OUTPUT_DIR}" does not exist after build`,
            );
        }

        const outputFiles = readdirSync(OUTPUT_DIR);

        for (const fileName of outputFiles) {
            const filePath = join(OUTPUT_DIR, fileName);
            const fileContent = readFileSync(filePath, "utf-8");
            const fileStats = Bun.file(filePath);
            const extension = getFullExtension(fileName);
            const name = basename(fileName, extension);

            result.files.push({
                path: filePath,
                name,
                extension,
                size: fileStats.size,
                content: fileContent,
            });
        }
    } catch (error) {
        result.success = false;
        result.error =
            error instanceof Error ? error : new Error(String(error));
    }

    return result;
}

export async function runDtsBuild(
    options: Omit<BuildOptions, "outDir">,
): Promise<BuildResult> {
    return runBuild({ ...options, dtsOnly: true });
}

export function findFile(
    result: BuildResult | RunCliResult,
    name: string,
    extension: string,
): FileResult | undefined {
    return result.files.find(
        (file) => file.name === name && file.extension === extension,
    );
}

export function validateBuildFiles(
    result: BuildResult,
    {
        expectedFiles,
        notExpectedFiles,
    }: {
        expectedFiles: string[];
        notExpectedFiles?: string[];
    },
): boolean {
    if (!result.success) return false;

    const allExpectedFilesExist = expectedFiles.every((fileName) => {
        const { name, extension } = parseFileName(fileName);
        return result.files.some(
            (file) => file.name === name && file.extension === extension,
        );
    });

    const noUnexpectedFilesExist = notExpectedFiles
        ? notExpectedFiles.every((fileName) => {
              const { name, extension } = parseFileName(fileName);
              return !result.files.some(
                  (file) => file.name === name && file.extension === extension,
              );
          })
        : true;

    return allExpectedFilesExist && noUnexpectedFilesExist;
}

function parseFileName(fileName: string): { name: string; extension: string } {
    const extension = getFullExtension(fileName);
    const name = basename(fileName, extension);
    return { name, extension };
}

interface ProjectTree {
    [key: string]: string;
}

export function cleanProjectDir(): void {
    if (existsSync(PROJECT_DIR)) {
        rmSync(PROJECT_DIR, { recursive: true, force: true });
        mkdirSync(PROJECT_DIR, { recursive: true });
    }
}

export function createProject(tree: ProjectTree): void {
    if (!existsSync(PROJECT_DIR)) {
        mkdirSync(PROJECT_DIR, { recursive: true });
    }

    for (const [key, value] of Object.entries(tree)) {
        const path = join(PROJECT_DIR, key);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, value, "utf-8");
    }
}

export async function runCli(options: string): Promise<RunCliResult> {
    const result: RunCliResult = {
        success: true,
        files: [],
        stdout: "",
        stderr: "",
    };

    try {
        const command = `bun run ${join(
            PROJECT_DIR,
            "../../src/cli.ts",
        )} ${options} --out-dir .output`;

        const execResult = await exec(command, [], {
            nodeOptions: {
                cwd: PROJECT_DIR,
                shell: true,
            },
        });

        result.stdout = execResult.stdout;
        result.stderr = execResult.stderr;

        if (execResult.exitCode !== 0) {
            result.success = false;
            result.error = new Error(
                `CLI command failed with exit code ${execResult.exitCode}: ${execResult.stderr}`,
            );
            return result;
        }

        if (!existsSync(OUTPUT_DIR)) {
            throw new Error(
                `Output directory "${OUTPUT_DIR}" does not exist after build`,
            );
        }

        const outputFiles = readdirSync(OUTPUT_DIR);
        for (const fileName of outputFiles) {
            const filePath = join(OUTPUT_DIR, fileName);
            if (statSync(filePath).isFile()) {
                const stats = Bun.file(filePath);
                const fileContent = readFileSync(filePath, "utf-8");
                const extension = getFullExtension(fileName);
                const name = basename(fileName, extension);

                result.files.push({
                    path: filePath,
                    name,
                    extension,
                    size: stats.size,
                    content: fileContent,
                });
            }
        }
    } catch (error) {
        result.success = false;
        result.error =
            error instanceof Error ? error : new Error(String(error));
    }

    return result;
}
