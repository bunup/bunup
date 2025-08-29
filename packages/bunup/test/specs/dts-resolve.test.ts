import { beforeEach, describe, expect, it } from 'bun:test'
import { cleanProjectDir, createProject, findFile, runDtsBuild } from '../utils'

describe('dts-resolve', () => {
	beforeEach(() => {
		cleanProjectDir()
	})

	it('should respect custom dts.resolve configuration', async () => {
		createProject({
			'package.json': JSON.stringify({
				name: 'test-package',
				version: '1.0.0',
				devDependencies: {
					'external-lib': '^1.0.0',
				},
			}),
			'src/index.ts': `
                        import { SomeType } from 'external-lib';

                        export function process(data: SomeType): SomeType {
                            return data;
                        }
                    `,
			'node_modules/external-lib/index.d.ts': `
                        export interface SomeType {
                            id: number;
                            value: string;
                        }
                    `,
		})

		const result = await runDtsBuild({
			entry: 'src/index.ts',
			format: 'esm',
			dts: {
				resolve: true,
			},
		})

		expect(result.success).toBe(true)
		const dtsFile = findFile(result, 'index', '.d.mts')
		expect(dtsFile).toBeDefined()
		expect(dtsFile?.content).toMatchSnapshot()
	})

	it('should only resolve specified external packages in dts files', async () => {
		createProject({
			'package.json': JSON.stringify({
				name: 'test',
				version: '1.0.0',
				devDependencies: {
					'date-fns': '^2.0.0',
					chalk: '^4.0.0',
					uuid: '^8.0.0',
				},
			}),
			'src/index.ts': `
                    import { format, type DateFormat } from 'date-fns';
                    import chalk, { type ChalkColor } from 'chalk';
                    import { v4, type UUID } from 'uuid';

                    export type { DateFormat, UUID, ChalkColor };

                    export declare function formatTimestamp(): string;

                    export declare function colorize(text: string): string;

                    export declare function generateId(): string;
                `,
			'node_modules/date-fns/index.d.ts': `
                    export type DateFormat = string;
                    export declare function format(date: Date, formatStr: string): string;
                `,
			'node_modules/chalk/index.d.ts': `
                    export type ChalkColor = string;
                    export declare function blue(text: string): string;
                `,
			'node_modules/uuid/index.d.mts': `
                    export type UUID = string;
                    export declare function v4(): UUID;
                `,
		})

		const result = await runDtsBuild({
			entry: 'src/index.ts',
			format: 'esm',
			dts: {
				resolve: ['date-fns', 'uuid'],
			},
		})

		expect(result.success).toBe(true)

		const dtsFile = findFile(result, 'index', '.d.mts')
		expect(dtsFile).toBeDefined()
		expect(dtsFile?.content).toMatchSnapshot()
	})

	it('should prefer declaration files over source code files', async () => {
		createProject({
			'package.json': JSON.stringify({
				name: 'test-package',
				version: '1.0.0',
				devDependencies: {
					'source-lib': '^1.0.0',
				},
			}),
			'src/index.ts': `
                import { Component } from 'source-lib';

                export function createComponent(): Component {
                    return { id: 1, name: "test" };
                }

                export type { Component };
            `,
			'node_modules/source-lib/index.ts': `
                // This is source code that should not be used
                export interface Component {
                    id: number;
                    name: string;
                    unusedSourceProp: boolean; // This property should not appear in the output
                }
            `,
			'node_modules/source-lib/index.d.ts': `
                // This is declaration file that should be preferred
                export interface Component {
                    id: number;
                    name: string;
                }
            `,
		})

		const result = await runDtsBuild({
			entry: 'src/index.ts',
			format: 'esm',
			dts: {
				resolve: ['source-lib'],
			},
		})

		expect(result.success).toBe(true)
		const dtsFile = findFile(result, 'index', '.d.mts')
		expect(dtsFile).toBeDefined()
		expect(dtsFile?.content).toMatchSnapshot()
	})

	it('should resolve types from dependencies listed in package.json when specified in dts.resolve', async () => {
		createProject({
			'package.json': JSON.stringify({
				name: 'test-package',
				version: '1.0.0',
				dependencies: {
					'dep-lib': '^1.0.0',
				},
				peerDependencies: {
					'peer-lib': '^2.0.0',
				},
			}),
			'src/index.ts': `
                import { DepType } from 'dep-lib';
                import { PeerType } from 'peer-lib';

                export function useTypes(dep: DepType, peer: PeerType): {
                    dep: DepType;
                    peer: PeerType;
                } {
                    return { dep, peer };
                }

                export type { DepType, PeerType };
            `,
			'node_modules/dep-lib/index.d.ts': `
                export interface DepType {
                    id: number;
                    name: string;
                }
            `,
			'node_modules/peer-lib/index.d.ts': `
                export interface PeerType {
                    key: string;
                    value: boolean;
                }
            `,
		})

		const result = await runDtsBuild({
			entry: 'src/index.ts',
			format: 'esm',
			dts: {
				resolve: ['dep-lib'],
			},
		})

		expect(result.success).toBe(true)
		const dtsFile = findFile(result, 'index', '.d.mts')
		expect(dtsFile).toBeDefined()
		expect(dtsFile?.content).toMatchSnapshot()
	})

	it('should resolve types from packages specified in both external and dts.resolve', async () => {
		createProject({
			'package.json': JSON.stringify({
				name: 'test-package',
				version: '1.0.0',
			}),
			'src/index.ts': `
                import { ExternalType } from 'external-pkg';
                import { InternalType } from 'internal-pkg';

                export function processData(ext: ExternalType, int: InternalType): {
                    ext: ExternalType;
                    int: InternalType;
                } {
                    return { ext, int };
                }

                export type { ExternalType, InternalType };
            `,
			'node_modules/external-pkg/index.d.ts': `
                export interface ExternalType {
                    id: string;
                    timestamp: number;
                }
            `,
			'node_modules/internal-pkg/index.d.ts': `
                export interface InternalType {
                    name: string;
                    active: boolean;
                }
            `,
		})

		const result = await runDtsBuild({
			entry: 'src/index.ts',
			format: 'esm',
			external: ['external-pkg', 'internal-pkg'],
			dts: {
				resolve: ['external-pkg'],
			},
		})

		expect(result.success).toBe(true)
		const dtsFile = findFile(result, 'index', '.d.mts')
		expect(dtsFile).toBeDefined()
		expect(dtsFile?.content).toMatchSnapshot()
	})

	it('should resolve all external types when dts.resolve is true', async () => {
		createProject({
			'package.json': JSON.stringify({
				name: 'test-package',
				version: '1.0.0',
				dependencies: {
					'lib-a': '^1.0.0',
				},
				peerDependencies: {
					'lib-b': '^2.0.0',
				},
			}),
			'src/index.ts': `
                import { TypeA } from 'lib-a';
                import { TypeB } from 'lib-b';
                import { TypeC } from 'lib-c';

                export function combineTypes(a: TypeA, b: TypeB, c: TypeC): {
                    a: TypeA;
                    b: TypeB;
                    c: TypeC;
                } {
                    return { a, b, c };
                }

                export type { TypeA, TypeB, TypeC };
            `,
			'node_modules/lib-a/index.d.ts': `
                export interface TypeA {
                    propA: string;
                }
            `,
			'node_modules/lib-b/index.d.ts': `
                export interface TypeB {
                    propB: number;
                }
            `,
			'node_modules/lib-c/index.d.ts': `
                export interface TypeC {
                    propC: boolean;
                }
            `,
		})

		const result = await runDtsBuild({
			entry: 'src/index.ts',
			format: 'esm',
			external: ['lib-c'],
			dts: {
				resolve: true,
			},
		})

		expect(result.success).toBe(true)
		const dtsFile = findFile(result, 'index', '.d.mts')
		expect(dtsFile).toBeDefined()
		expect(dtsFile?.content).toMatchSnapshot()
	})

	it('should respect noExternal when resolving types', async () => {
		createProject({
			'package.json': JSON.stringify({
				name: 'test-package',
				version: '1.0.0',
				dependencies: {
					'external-lib': '^1.0.0',
					'included-lib': '^1.0.0',
				},
			}),
			'src/index.ts': `
                import { ExternalType } from 'external-lib';
                import { IncludedType } from 'included-lib';

                export function process(ext: ExternalType, inc: IncludedType): {
                    ext: ExternalType;
                    inc: IncludedType;
                } {
                    return { ext, inc };
                }

                export type { ExternalType, IncludedType };
            `,
			'node_modules/external-lib/index.d.ts': `
                export interface ExternalType {
                    id: number;
                }
            `,
			'node_modules/included-lib/index.d.ts': `
                export interface IncludedType {
                    name: string;
                }
            `,
		})

		const result = await runDtsBuild({
			entry: 'src/index.ts',
			format: 'esm',
			noExternal: ['included-lib'],
			dts: {
				resolve: ['included-lib'],
			},
		})

		expect(result.success).toBe(true)
		const dtsFile = findFile(result, 'index', '.d.mts')
		expect(dtsFile).toBeDefined()
		expect(dtsFile?.content).toMatchSnapshot()
	})
})
