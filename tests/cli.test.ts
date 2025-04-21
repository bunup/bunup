import { beforeEach, describe, expect, it } from "bun:test";
import { cleanProjectDir, createProject, findFile, runCli } from "./utils";

describe("CLI Only Options", () => {
    beforeEach(() => {
        cleanProjectDir();
    });

    it("should use custom config file", async () => {
        createProject({
            "src/index.ts": `
                export function hello() {
                    return "Hello, world!";
                }
            `,
            "custom-bunup.config.ts": `
                import { defineConfig } from "bunup";
                export default defineConfig({
                    entry: "src/index.ts",
                    format: ["esm"],
                    banner: "// Hello, world!",
                });
            `,
        });

        const result = await runCli(
            "src/index.ts --config custom-bunup.config.ts",
        );

        console.log(result);

        expect(result.stdout).toContain("Using config file:");
        expect(result.stdout).toContain("custom-bunup.config.ts");
        const file = findFile(result, "index", ".mjs");
        expect(file?.content).toContain("// Hello, world!");
    });

    it("should execute command after successful build", async () => {
        createProject({
            "src/index.ts": `
                export function hello() {
                    return "Hello, world!";
                }
            `,
        });

        const result = await runCli(
            `src/index.ts --onSuccess="echo 'success-message-test'"`,
        );

        console.log(result);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain("Running command:");
        expect(result.stdout).toContain("echo 'success-message-test'");
        expect(result.stdout).toContain("success-message-test");
        const file = findFile(result, "index", ".js");
        expect(file).toBeTruthy();
    });

    it("should not execute command when build fails", async () => {
        createProject({
            "src/index.ts": `
                export function broken(param: string) {
                    const invalidOperation = param + ;
                    return invalidOperation;
                }
            `,
        });

        const result = await runCli(
            `src/index.ts --onSuccess="echo 'should-not-appear'"`,
        );

        expect(result.success).toBe(false);
        expect(result.stdout).not.toContain("Running command:");
        expect(result.stdout).not.toContain("echo 'should-not-appear'");
        expect(result.stdout).not.toContain("should-not-appear");
    });

    it("should log type annotation warnings when generating declaration files", async () => {
        createProject({
            "src/index.ts": `
                export * from './utils/helpers';
            `,
            "src/utils/helpers.ts": `
                export * from '../services/api';

                export const formatData = (data: any): { formatted: any } => {
                    return { formatted: data };
                };
            `,
            "src/services/api.ts": `
                // Function without explicit return type
                export function missingReturnType() {
                    return { name: "test", status: "active" };
                }

                export function fetchData(url: string) {
                    return Promise.resolve({ data: "test data" });
                }
            `,
        });

        const result = await runCli("src/index.ts --dts");

        console.log(result);

        expect(result.success).toBe(true);
        expect(result.stderr).toContain(
            " Function must have an explicit return type annotation.",
        );
        expect(result.stdout).toContain(
            "You may have noticed some TypeScript warnings above",
        );
        expect(result.stdout).toContain("isolatedDeclarations");

        const dtsFile = findFile(result, "index", ".d.ts");
        expect(dtsFile).toBeTruthy();
    });
});
