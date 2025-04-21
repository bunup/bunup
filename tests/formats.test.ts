import { beforeEach, describe, expect, it } from "bun:test";
import {
    cleanProjectDir,
    createProject,
    findFile,
    runBuild,
    validateBuildFiles,
} from "./utils";

describe("Format Types and Output Extensions", () => {
    beforeEach(() => {
        cleanProjectDir();
        createProject({ "src/index.ts": "export const x = 1;" });
    });

    describe("Basic Format Options", () => {
        it("should generate .mjs for ESM format by default", async () => {
            const result = await runBuild({
                entry: "src/index.ts",
                format: ["esm"],
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: ["index.mjs"],
                }),
            ).toBe(true);
        });

        it("should generate .js for CJS format by default", async () => {
            const result = await runBuild({
                entry: "src/index.ts",
                format: ["cjs"],
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: ["index.js"],
                }),
            ).toBe(true);
        });

        it("should generate .global.js for IIFE format", async () => {
            const result = await runBuild({
                entry: "src/index.ts",
                format: ["iife"],
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: ["index.global.js"],
                }),
            ).toBe(true);
        });

        it("should correctly generate files for all formats simultaneously", async () => {
            const result = await runBuild({
                entry: "src/index.ts",
                format: ["esm", "cjs", "iife"],
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: ["index.mjs", "index.js", "index.global.js"],
                }),
            ).toBe(true);
        });
    });

    describe("Package Type Impact on Extensions", () => {
        it("should generate .js for ESM format with 'type: module' in package.json", async () => {
            createProject({
                "src/index.ts": "export const x = 1;",
                "package.json": `{"type": "module"}`,
            });

            const result = await runBuild({
                entry: "src/index.ts",
                format: ["esm"],
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: ["index.js"],
                }),
            ).toBe(true);
        });

        it("should generate .cjs for CJS format with 'type: module' in package.json", async () => {
            createProject({
                "src/index.ts": "export const x = 1;",
                "package.json": `{"type": "module"}`,
            });

            const result = await runBuild({
                entry: "src/index.ts",
                format: ["cjs"],
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: ["index.cjs"],
                }),
            ).toBe(true);
        });

        it("should generate correct extensions for all formats with 'type: module'", async () => {
            createProject({
                "src/index.ts": "export const x = 1;",
                "package.json": `{"type": "module"}`,
            });

            const result = await runBuild({
                entry: "src/index.ts",
                format: ["esm", "cjs", "iife"],
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: ["index.js", "index.cjs", "index.global.js"],
                }),
            ).toBe(true);
        });

        it("should generate correct extensions for IIFE format without package type", async () => {
            createProject({
                "src/index.ts": "export const x = 1;",
                "package.json": `{"name": "test-package"}`,
            });

            const result = await runBuild({
                entry: "src/index.ts",
                format: ["iife"],
                dts: true,
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: ["index.global.js", "index.d.ts"],
                }),
            ).toBe(true);
        });

        it("should generate correct extensions for IIFE format with package type module", async () => {
            createProject({
                "src/index.ts": "export const x = 1;",
                "package.json": `{"type": "module"}`,
            });

            const result = await runBuild({
                entry: "src/index.ts",
                format: ["iife"],
                dts: true,
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: ["index.global.js", "index.d.ts"],
                }),
            ).toBe(true);
        });
    });

    describe("TypeScript Declaration Extensions", () => {
        it("should generate correct declaration files for each format by default", async () => {
            const result = await runBuild({
                entry: "src/index.ts",
                format: ["esm", "cjs", "iife"],
                dts: true,
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: [
                        "index.mjs",
                        "index.d.mts",
                        "index.js",
                        "index.d.ts",
                        "index.global.js",
                    ],
                }),
            ).toBe(true);
        });

        it("should generate correct declaration files with 'type: module' in package.json", async () => {
            createProject({
                "src/index.ts": "export const x = 1;",
                "package.json": `{"type": "module"}`,
            });

            const result = await runBuild({
                entry: "src/index.ts",
                format: ["esm", "cjs", "iife"],
                dts: true,
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: [
                        "index.js",
                        "index.d.ts",
                        "index.cjs",
                        "index.d.cts",
                        "index.global.js",
                    ],
                }),
            ).toBe(true);
        });
    });

    describe("Custom Output Extensions", () => {
        it("should respect custom output extensions for JS files", async () => {
            const result = await runBuild({
                entry: "src/index.ts",
                format: ["esm", "cjs"],
                outputExtension: ({ format }) => ({
                    js: `.custom.${format}.js`,
                    dts: `.d.${format}`,
                }),
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: [
                        "index.custom.esm.js",
                        "index.custom.cjs.js",
                    ],
                }),
            ).toBe(true);
        });

        it("should respect custom output extensions for DTS files", async () => {
            const result = await runBuild({
                entry: "src/index.ts",
                format: ["esm", "cjs"],
                dts: true,
                outputExtension: ({ format }) => ({
                    js: `.${format}.js`,
                    dts: `.types.${format}.ts`,
                }),
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: [
                        "index.esm.js",
                        "index.types.esm.ts",
                        "index.cjs.js",
                        "index.types.cjs.ts",
                    ],
                }),
            ).toBe(true);
        });

        it("should support entry-specific output extensions", async () => {
            createProject({
                "src/index.ts": "export const x = 1;",
                "src/utils.ts": "export const util = () => 'utility';",
            });

            const result = await runBuild({
                entry: {
                    main: "src/index.ts",
                    utils: "src/utils.ts",
                },
                format: ["esm"],
                dts: true,
                outputExtension: ({ entry }) => ({
                    js: entry.name === "main" ? ".bundle.js" : ".module.mjs",
                    dts:
                        entry.name === "main" ? ".bundle.d.ts" : ".module.d.ts",
                }),
            });

            expect(result.success).toBe(true);
            expect(
                validateBuildFiles(result, {
                    expectedFiles: [
                        "main.bundle.js",
                        "main.bundle.d.ts",
                        "utils.module.mjs",
                        "utils.module.d.ts",
                    ],
                }),
            ).toBe(true);
        });
    });
});

describe("Complex Format Scenarios", () => {
    beforeEach(() => {
        cleanProjectDir();
    });

    it("should handle all file extensions with correct output formats", async () => {
        createProject({
            "package.json": `{"dependencies": {"react": "19.0.0"}}`,
            "src/js-file.js": "export const jsVar = 1;",
            "src/jsx-file.jsx": "export const jsxVar = () => <div>JSX</div>;",
            "src/ts-file.ts": "export const tsVar = 2;",
            "src/tsx-file.tsx":
                "export const tsxComponent = () => <div>TSX</div>;",
            "src/mjs-file.mjs": "export const mjsVar = 3;",
            "src/cjs-file.cjs": "exports.cjsVar = 4;",
            "src/mts-file.mts": "export const mtsVar = 5;",
            "src/cts-file.cts": "export const ctsVar = 6;",
        });

        const result = await runBuild({
            entry: [
                "src/js-file.js",
                "src/jsx-file.jsx",
                "src/ts-file.ts",
                "src/tsx-file.tsx",
                "src/mjs-file.mjs",
                "src/cjs-file.cjs",
                "src/mts-file.mts",
                "src/cts-file.cts",
            ],
            format: ["esm", "cjs"],
            dts: true,
        });

        expect(result.success).toBe(true);
        expect(
            validateBuildFiles(result, {
                expectedFiles: [
                    "js-file.mjs",
                    "jsx-file.mjs",
                    "ts-file.mjs",
                    "tsx-file.mjs",
                    "mjs-file.mjs",
                    "cjs-file.mjs",
                    "mts-file.mjs",
                    "cts-file.mjs",

                    "js-file.js",
                    "jsx-file.js",
                    "ts-file.js",
                    "tsx-file.js",
                    "mjs-file.js",
                    "cjs-file.js",
                    "mts-file.js",
                    "cts-file.js",

                    "ts-file.d.ts",
                    "tsx-file.d.ts",
                    "mts-file.d.ts",
                    "cts-file.d.ts",
                    "ts-file.d.mts",
                    "tsx-file.d.mts",
                    "mts-file.d.mts",
                    "cts-file.d.mts",
                ],
            }),
        ).toBe(true);
    });

    it("should allow format-specific configurations through multiple build configs", async () => {
        createProject({
            "src/index.ts": "export const x = 1;",
            "src/lib.ts": "export const lib = 'library';",
        });

        const esmResult = await runBuild({
            entry: "src/index.ts",
            format: ["esm"],
            dts: true,
            banner: "// ESM Build",
        });

        const cjsResult = await runBuild({
            entry: { library: "src/lib.ts" },
            format: ["cjs"],
            dts: true,
            banner: "// CJS Build",
            clean: false,
        });

        expect(esmResult.success).toBe(true);
        expect(
            validateBuildFiles(esmResult, {
                expectedFiles: ["index.mjs", "index.d.mts"],
            }),
        ).toBe(true);

        const esmFile = findFile(esmResult, "index", ".mjs");
        expect(esmFile?.content).toContain("// ESM Build");

        expect(cjsResult.success).toBe(true);
        expect(
            validateBuildFiles(cjsResult, {
                expectedFiles: [
                    "library.js",
                    "library.d.ts",
                    "index.mjs",
                    "index.d.mts",
                ],
            }),
        ).toBe(true);

        const cjsFile = findFile(cjsResult, "library", ".js");
        expect(cjsFile?.content).toContain("// CJS Build");
    });

    it("should support environment-specific extensions with custom output extensions", async () => {
        createProject({
            "src/index.ts": "export const x = 1;",
            "package.json": JSON.stringify({
                name: "test-package",
                type: "module",
            }),
        });

        const result = await runBuild({
            entry: "src/index.ts",
            format: ["esm", "cjs"],
            dts: true,
            outputExtension: ({ format, packageType }) => ({
                js:
                    packageType === "module"
                        ? format === "esm"
                            ? ".js"
                            : `.${format}`
                        : format === "esm"
                          ? ".mjs"
                          : ".js",
                dts:
                    packageType === "module"
                        ? format === "esm"
                            ? ".d.ts"
                            : `.d.${format}`
                        : format === "esm"
                          ? ".d.mts"
                          : ".d.ts",
            }),
        });

        expect(result.success).toBe(true);
        expect(
            validateBuildFiles(result, {
                expectedFiles: [
                    "index.js",
                    "index.d.ts",
                    "index.cjs",
                    "index.d.cjs",
                ],
            }),
        ).toBe(true);
    });

    it("should reject paths with slashes in outputExtension", async () => {
        createProject({
            "src/index.ts": "export const x = 1;",
        });

        const result = await runBuild({
            entry: "src/index.ts",
            format: ["esm", "cjs"],
            dts: true,
            outputExtension: ({ format }) => ({
                js:
                    format === "esm"
                        ? "/dist/bundle.js"
                        : "/dist/legacy/bundle.js",
                dts:
                    format === "esm"
                        ? "/types/index.d.ts"
                        : "/types/legacy/index.d.ts",
            }),
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });
});
