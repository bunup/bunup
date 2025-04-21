import { describe, expect, it } from "bun:test";
import { createProject, findFile, runDtsBuild } from "./utils";

describe("dts-resolve", () => {
    it("should respect custom dts.resolve configuration", async () => {
        createProject({
            "package.json": JSON.stringify({
                name: "test-package",
                version: "1.0.0",
                devDependencies: {
                    "external-lib": "^1.0.0",
                },
            }),
            "src/index.ts": `
                        import { SomeType } from 'external-lib';

                        export function process(data: SomeType) {
                            return data;
                        }
                    `,
            "node_modules/external-lib/index.d.ts": `
                        export interface SomeType {
                            id: number;
                            value: string;
                        }
                    `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
            dts: {
                resolve: true,
            },
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("declare function process");
        expect(dtsFile?.content).toContain("interface SomeType");
        expect(dtsFile?.content).toContain("value");
    });

    it("should only resolve specified external packages in dts files", async () => {
        createProject({
            "package.json": JSON.stringify({
                name: "test",
                version: "1.0.0",
                devDependencies: {
                    "date-fns": "^2.0.0",
                    chalk: "^4.0.0",
                    uuid: "^8.0.0",
                },
            }),
            "src/index.ts": `
                    import { format, type DateFormat } from 'date-fns';
                    import chalk, { type ChalkColor } from 'chalk';
                    import { v4, type UUID } from 'uuid';

                    export type { DateFormat, UUID, ChalkColor };

                    export function formatTimestamp() {
                        return format(new Date(), 'yyyy-MM-dd');
                    }

                    export function colorize(text: string) {
                        return chalk.blue(text);
                    }

                    export function generateId() {
                        return v4();
                    }
                `,
            "node_modules/date-fns/index.d.ts": `
                    export type DateFormat = string;
                    export function format(date, formatStr) {
                        return date.toISOString();
                    }
                `,
            "node_modules/chalk/index.d.ts": `
                    export type ChalkColor = string;
                    function blue(text) {
                        return text;
                    }

                    export default {
                        blue
                    };
                `,
            "node_modules/uuid/index.d.mts": `
                    export type UUID = string;
                    export function v4() {
                        return '00000000-0000-0000-0000-000000000000';
                    }
                `,
        });

        const result = await runDtsBuild({
            entry: "src/index.ts",
            format: ["esm"],
            dts: {
                resolve: ["date-fns", "uuid"],
            },
        });

        expect(result.success).toBe(true);

        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();

        expect(dtsFile?.content).not.toContain(`from "date-fns"`);

        expect(dtsFile?.content).not.toContain(`from "uuid"`);

        expect(dtsFile?.content).toContain(`from "chalk"`);

        expect(dtsFile?.content).toContain("type UUID");
        expect(dtsFile?.content).toContain("type DateFormat");
    });

    it("should resolve types that are imported by resolved types", async () => {
        createProject({
            "package.json": JSON.stringify({
                name: "test-package",
                version: "1.0.0",
                devDependencies: {
                    "main-lib": "^1.0.0",
                    "nested-lib": "^1.0.0",
                    "deep-lib": "^1.0.0",
                },
            }),
            "src/index.ts": `
                    import { MainType } from 'main-lib';

                    export function processData(data: MainType): MainType {
                        return data;
                    }

                    export type { MainType };
                `,
            "node_modules/main-lib/index.d.ts": `
                    import { NestedType } from 'nested-lib';

                    export interface MainType {
                        id: number;
                        name: string;
                        nested: NestedType;
                    }
                `,
            "node_modules/nested-lib/index.d.cts": `
                    import { DeepType } from 'deep-lib';

                    export interface NestedType {
                        value: string;
                        priority: number;
                        deep: DeepType;
                    }
                `,
            "node_modules/deep-lib/index.d.ts": `
                    export interface DeepType {
                        name: string;
                        version: string;
                    }
                `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
            dts: {
                resolve: ["main-lib"],
            },
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("declare function processData");
        expect(dtsFile?.content).toContain("interface MainType");
        expect(dtsFile?.content).toContain("interface NestedType");
        expect(dtsFile?.content).toContain("interface DeepType");
        expect(dtsFile?.content).toContain("nested: NestedType");
        expect(dtsFile?.content).toContain("deep: DeepType");
        expect(dtsFile?.content).not.toContain(`from "main-lib"`);
        expect(dtsFile?.content).not.toContain(`from "nested-lib"`);
        expect(dtsFile?.content).not.toContain(`from "deep-lib"`);
    });

    it("should prefer declaration files over source code files", async () => {
        createProject({
            "package.json": JSON.stringify({
                name: "test-package",
                version: "1.0.0",
                devDependencies: {
                    "source-lib": "^1.0.0",
                },
            }),
            "src/index.ts": `
                import { Component } from 'source-lib';

                export function createComponent(): Component {
                    return { id: 1, name: "test" };
                }

                export type { Component };
            `,
            "node_modules/source-lib/index.ts": `
                // This is source code that should not be used
                export interface Component {
                    id: number;
                    name: string;
                    unusedSourceProp: boolean; // This property should not appear in the output
                }
            `,
            "node_modules/source-lib/index.d.ts": `
                // This is declaration file that should be preferred
                export interface Component {
                    id: number;
                    name: string;
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
            dts: {
                resolve: ["source-lib"],
            },
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("declare function createComponent");
        expect(dtsFile?.content).toContain("interface Component");
        expect(dtsFile?.content).toContain("id: number");
        expect(dtsFile?.content).toContain("name: string");
        expect(dtsFile?.content).not.toContain("unusedSourceProp");
        expect(dtsFile?.content).not.toContain(`from "source-lib"`);
    });

    it("should resolve types from dependencies listed in package.json when specified in dts.resolve", async () => {
        createProject({
            "package.json": JSON.stringify({
                name: "test-package",
                version: "1.0.0",
                dependencies: {
                    "dep-lib": "^1.0.0",
                },
                peerDependencies: {
                    "peer-lib": "^2.0.0",
                },
            }),
            "src/index.ts": `
                import { DepType } from 'dep-lib';
                import { PeerType } from 'peer-lib';

                export function useTypes(dep: DepType, peer: PeerType) {
                    return { dep, peer };
                }

                export type { DepType, PeerType };
            `,
            "node_modules/dep-lib/index.d.ts": `
                export interface DepType {
                    id: number;
                    name: string;
                }
            `,
            "node_modules/peer-lib/index.d.ts": `
                export interface PeerType {
                    key: string;
                    value: boolean;
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
            dts: {
                resolve: ["dep-lib"],
            },
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();

        expect(dtsFile?.content).toContain("interface DepType");
        expect(dtsFile?.content).not.toContain(`from "dep-lib"`);

        expect(dtsFile?.content).not.toContain("interface PeerType");
        expect(dtsFile?.content).toContain(`from "peer-lib"`);
    });

    it("should resolve types from packages specified in both external and dts.resolve", async () => {
        createProject({
            "package.json": JSON.stringify({
                name: "test-package",
                version: "1.0.0",
            }),
            "src/index.ts": `
                import { ExternalType } from 'external-pkg';
                import { InternalType } from 'internal-pkg';

                export function processData(ext: ExternalType, int: InternalType) {
                    return { ext, int };
                }

                export type { ExternalType, InternalType };
            `,
            "node_modules/external-pkg/index.d.ts": `
                export interface ExternalType {
                    id: string;
                    timestamp: number;
                }
            `,
            "node_modules/internal-pkg/index.d.ts": `
                export interface InternalType {
                    name: string;
                    active: boolean;
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
            external: ["external-pkg", "internal-pkg"],
            dts: {
                resolve: ["external-pkg"],
            },
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();

        expect(dtsFile?.content).toContain("interface ExternalType");
        expect(dtsFile?.content).not.toContain(`from "external-pkg"`);

        expect(dtsFile?.content).not.toContain("interface InternalType");
        expect(dtsFile?.content).toContain(`from "internal-pkg"`);
    });

    it("should resolve all external types when dts.resolve is true", async () => {
        createProject({
            "package.json": JSON.stringify({
                name: "test-package",
                version: "1.0.0",
                dependencies: {
                    "lib-a": "^1.0.0",
                },
                peerDependencies: {
                    "lib-b": "^2.0.0",
                },
            }),
            "src/index.ts": `
                import { TypeA } from 'lib-a';
                import { TypeB } from 'lib-b';
                import { TypeC } from 'lib-c';

                export function combineTypes(a: TypeA, b: TypeB, c: TypeC) {
                    return { ...a, ...b, ...c };
                }

                export type { TypeA, TypeB, TypeC };
            `,
            "node_modules/lib-a/index.d.ts": `
                export interface TypeA {
                    propA: string;
                }
            `,
            "node_modules/lib-b/index.d.ts": `
                export interface TypeB {
                    propB: number;
                }
            `,
            "node_modules/lib-c/index.d.ts": `
                export interface TypeC {
                    propC: boolean;
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
            external: ["lib-c"],
            dts: {
                resolve: true,
            },
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();

        expect(dtsFile?.content).toContain("interface TypeA");
        expect(dtsFile?.content).toContain("interface TypeB");
        expect(dtsFile?.content).toContain("interface TypeC");

        expect(dtsFile?.content).not.toContain(`from "lib-a"`);
        expect(dtsFile?.content).not.toContain(`from "lib-b"`);
        expect(dtsFile?.content).not.toContain(`from "lib-c"`);
    });

    it("should respect noExternal when resolving types", async () => {
        createProject({
            "package.json": JSON.stringify({
                name: "test-package",
                version: "1.0.0",
                dependencies: {
                    "external-lib": "^1.0.0",
                    "included-lib": "^1.0.0",
                },
            }),
            "src/index.ts": `
                import { ExternalType } from 'external-lib';
                import { IncludedType } from 'included-lib';

                export function process(ext: ExternalType, inc: IncludedType) {
                    return { ext, inc };
                }

                export type { ExternalType, IncludedType };
            `,
            "node_modules/external-lib/index.d.ts": `
                export interface ExternalType {
                    id: number;
                }
            `,
            "node_modules/included-lib/index.d.ts": `
                export interface IncludedType {
                    name: string;
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
            noExternal: ["included-lib"],
            dts: {
                resolve: ["included-lib"],
            },
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();

        expect(dtsFile?.content).toContain("interface IncludedType");
        expect(dtsFile?.content).not.toContain(`from "included-lib"`);

        expect(dtsFile?.content).not.toContain("interface ExternalType");
        expect(dtsFile?.content).toContain(`from "external-lib"`);
    });
});
