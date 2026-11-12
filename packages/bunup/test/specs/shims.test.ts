import { beforeEach, describe, expect, it } from "bun:test";
import { shims } from "../../src/plugins";
import { findShimInsertPosition } from "../../src/plugins/shims";
import { cleanProjectDir, createProject, findFile, runBuild } from "../utils";

describe("shims plugin", () => {
	beforeEach(() => {
		cleanProjectDir();
	});

	it("should add __dirname and __filename shims for ESM format", async () => {
		createProject({
			"src/index.ts": `
                console.log('dirname:', __dirname);
                console.log('filename:', __filename);

                export function getFilePath() {
                    return __filename;
                }

                export function getDirPath() {
                    return __dirname;
                }
            `,
		});

		const result = await runBuild({
			entry: "src/index.ts",
			format: "esm",
			plugins: [shims()],
		});

		expect(result.success).toBe(true);
		const file = findFile(result, "index", ".mjs");
		expect(file).toBeDefined();
		expect(file?.content).toContain("import { fileURLToPath } from");
		expect(file?.content).toContain("import { dirname } from");
		expect(file?.content).toContain("var __filename2 = fileURLToPath(import.meta.url)");
		expect(file?.content).toContain("var __dirname2 = dirname(__filename2)");
	});

	it("should add import.meta.url shim for CJS format", async () => {
		createProject({
			"src/index.ts": `
                console.log('import.meta.url:', import.meta.url);

                export function getMetaUrl() {
                    return import.meta.url;
                }
            `,
		});

		const result = await runBuild({
			entry: "src/index.ts",
			format: "cjs",
			plugins: [shims()],
		});

		expect(result.success).toBe(true);
		const file = findFile(result, "index", ".js");
		expect(file).toBeDefined();
		expect(file?.content).toContain('require("url")');
		expect(file?.content).toContain("pathToFileURL(__filename).href");
	});

	it("should not add shims when variables are not used", async () => {
		createProject({
			"src/index.ts": `
                export function hello() {
                    return 'hello world';
                }
            `,
		});

		const result = await runBuild({
			entry: "src/index.ts",
			format: ["esm", "cjs"],
			plugins: [shims()],
		});

		expect(result.success).toBe(true);

		const esmFile = findFile(result, "index", ".mjs");
		expect(esmFile).toBeDefined();
		expect(esmFile?.content).not.toContain("import { fileURLToPath } from");
		expect(esmFile?.content).not.toContain("import { dirname } from");

		const cjsFile = findFile(result, "index", ".js");
		expect(cjsFile).toBeDefined();
		expect(cjsFile?.content).not.toContain("pathToFileURL");
	});

	it("should only add needed shims when multiple variables are used", async () => {
		createProject({
			"src/esm-file.ts": `
                console.log('dirname:', __dirname);
                // No __filename usage

                export function getDirPath() {
                    return __dirname;
                }
            `,
			"src/cjs-file.ts": `
                // Using import.meta.url only
                console.log('import.meta.url:', import.meta.url);

                export function getMetaUrl() {
                    return import.meta.url;
                }
            `,
		});

		const result = await runBuild({
			entry: ["src/esm-file.ts", "src/cjs-file.ts"],
			format: ["esm", "cjs"],
			plugins: [shims()],
		});

		expect(result.success).toBe(true);

		const esmFile = findFile(result, "esm-file", ".mjs");
		expect(esmFile).toBeDefined();
		expect(esmFile?.content).toContain("import { fileURLToPath } from");
		expect(esmFile?.content).toContain("import { dirname } from");
		expect(esmFile?.content).toContain("var __filename2 = fileURLToPath(import.meta.url)");
		expect(esmFile?.content).toContain("var __dirname2 = dirname(__filename2)");

		const cjsFile = findFile(result, "cjs-file", ".js");
		expect(cjsFile).toBeDefined();
		expect(cjsFile?.content).toContain('require("url")');
		expect(cjsFile?.content).toContain("pathToFileURL(__filename).href");
	});

	it("should properly handle both types of shims in the same file", async () => {
		createProject({
			"src/index.ts": `
                // Using both __dirname and import.meta.url
                console.log('dirname:', __dirname);
                console.log('import.meta.url:', import.meta.url);

                export function getPaths() {
                    return {
                        dir: __dirname,
                        metaUrl: import.meta.url
                    };
                }
            `,
		});

		const esmResult = await runBuild({
			entry: "src/index.ts",
			format: "esm",
			plugins: [shims()],
		});

		expect(esmResult.success).toBe(true);
		const esmFile = findFile(esmResult, "index", ".mjs");
		expect(esmFile).toBeDefined();
		expect(esmFile?.content).toContain("import { fileURLToPath } from");
		expect(esmFile?.content).toContain("import { dirname } from");
		expect(esmFile?.content).toContain("var __filename2 = fileURLToPath(import.meta.url)");
		expect(esmFile?.content).toContain("var __dirname2 = dirname(__filename2)");

		const cjsResult = await runBuild({
			entry: "src/index.ts",
			format: "cjs",
			plugins: [shims()],
		});

		expect(cjsResult.success).toBe(true);
		const cjsFile = findFile(cjsResult, "index", ".js");
		expect(cjsFile).toBeDefined();
		expect(cjsFile?.content).toContain('require("url")');
		expect(cjsFile?.content).toContain("pathToFileURL(__filename).href");
	});

	it("should add ESM shims when the file starts with a multi-line import", async () => {
		createProject({
			"src/index.ts": `import {
  join
} from "node:path";
export const where: string = join(__dirname, "a");
`,
		});

		const result = await runBuild({
			entry: "src/index.ts",
			format: "esm",
			plugins: [shims()],
		});

		expect(result.success).toBe(true);
		const file = findFile(result, "index", ".mjs");
		expect(file?.content).toContain("var __filename2 = fileURLToPath(import.meta.url)");
		expect(file?.content).toContain('join(__dirname2, "a")');
	});

	it("should add ESM shims when the file starts with a block comment", async () => {
		createProject({
			"src/index.ts": `/**
 * My library.
 */
import { join } from "node:path";
export const where: string = join(__dirname, "a");
`,
		});

		const result = await runBuild({
			entry: "src/index.ts",
			format: "esm",
			plugins: [shims()],
		});

		expect(result.success).toBe(true);
		const file = findFile(result, "index", ".mjs");
		expect(file?.content).toContain("var __dirname2 = dirname(__filename2)");
		expect(file?.content).toContain('join(__dirname2, "a")');
		expect(file?.content).not.toMatch(/var __dirname = "/);
	});

	it("should add the CJS shim when the file starts with a multi-line import", async () => {
		createProject({
			"src/index.ts": `import {
  join
} from "node:path";
export const url: string = join(import.meta.url, "a");
`,
		});

		const result = await runBuild({
			entry: "src/index.ts",
			format: "cjs",
			plugins: [shims()],
		});

		expect(result.success).toBe(true);
		const file = findFile(result, "index", ".js");
		expect(file?.content).toContain("pathToFileURL(__filename).href");
	});

	it("should keep a shebang on the first line", async () => {
		createProject({
			"src/index.ts": `#!/usr/bin/env node
console.log(__dirname);
`,
		});

		const result = await runBuild({
			entry: "src/index.ts",
			format: "esm",
			plugins: [shims()],
		});

		expect(result.success).toBe(true);
		const file = findFile(result, "index", ".mjs");
		expect(file?.content.startsWith("#!/usr/bin/env node\n")).toBe(true);
		expect(file?.content).toContain("console.log(__dirname2)");
	});

	it('should keep a "use client" directive', async () => {
		createProject({
			"src/index.ts": `"use client";
export const dir: string = __dirname;
`,
		});

		const result = await runBuild({
			entry: "src/index.ts",
			format: "esm",
			plugins: [shims()],
		});

		expect(result.success).toBe(true);
		const file = findFile(result, "index", ".mjs");
		expect(file?.content.startsWith('"use client";')).toBe(true);
		expect(file?.content).toContain("var __dirname2 = dirname(__filename2)");
	});

	describe("findShimInsertPosition", () => {
		it("inserts at the start of a plain file", () => {
			expect(findShimInsertPosition("import {\n  a\n} from 'a';\n")).toBe(0);
			expect(findShimInsertPosition("/**\n * doc\n */\nimport a from 'a';\n")).toBe(0);
			expect(findShimInsertPosition("// note\nconsole.log(1);\n")).toBe(0);
			expect(findShimInsertPosition("")).toBe(0);
		});

		it("inserts after a shebang line", () => {
			expect(findShimInsertPosition("#!/usr/bin/env node\nconsole.log(1);\n")).toBe(20);
			expect(findShimInsertPosition("#!/usr/bin/env node")).toBe(19);
		});

		it("inserts after the directive prologue", () => {
			const content = `#!/usr/bin/env node\n// c\n"use client";\n'use strict'\n/* c */\nfoo();\n`;
			const pos = findShimInsertPosition(content);
			expect(content.slice(0, pos)).toBe(
				`#!/usr/bin/env node\n// c\n"use client";\n'use strict'`,
			);
		});

		it("does not treat string expressions as directives", () => {
			expect(findShimInsertPosition(`"a b".split(" ");\n`)).toBe(0);
			expect(findShimInsertPosition(`'use client' + x;\n`)).toBe(0);
		});
	});
});
