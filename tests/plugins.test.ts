import { beforeEach, describe, expect, it } from "bun:test";
import type { BunPlugin } from "bun";
import {
    cleanProjectDir,
    createProject,
    runBuild,
    validateBuildFiles,
} from "./utils";

describe("Plugins", () => {
    beforeEach(() => {
        cleanProjectDir();
    });

    it("should apply custom Bun.build plugins when plugins.type is bun", async () => {
        createProject({ "src/index.ts": "export const x = 1;" });

        const testMarker = "/* TEST PLUGIN WAS HERE */";
        const testPlugin: BunPlugin = {
            name: "test-plugin",
            setup(build) {
                build.onLoad({ filter: /\.ts$/ }, async (args) => {
                    const source = await Bun.file(args.path).text();
                    return {
                        contents: `${source}\n// This comment was added by the test plugin`,
                        loader: "ts",
                    };
                });
            },
        };

        const result = await runBuild({
            entry: "src/index.ts",
            format: ["esm"],
            banner: testMarker,
            plugins: [{ type: "bun", plugin: testPlugin }],
        });

        expect(result.success).toBe(true);
        expect(
            validateBuildFiles(result, {
                expectedFiles: ["index.mjs"],
            }),
        ).toBe(true);

        expect(result.files[0].content).toContain(testMarker);
    });
});
