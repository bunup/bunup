import { beforeEach, describe, expect, it } from "bun:test";
import { cleanProjectDir, createProject, findFile, runDtsBuild } from "./utils";

describe("dts", () => {
    beforeEach(() => {
        cleanProjectDir();
    });

    it("should generate basic dts files", async () => {
        createProject({
            "src/index.ts": `
                export interface User {
                    id: number;
                    name: string;
                }

                export function getUserName(user: User): string {
                    return user.name;
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("interface User");
        expect(dtsFile?.content).toContain("function getUserName");
    });

    it("should handle imports and exports between multiple files", async () => {
        createProject({
            "src/index.ts": `
                    export * from './user';
                    export * from './utils';
                `,
            "src/user.ts": `
                    export interface User {
                        id: number;
                        name: string;
                        email: string;
                    }

                    export class UserService {
                        getUser(id: number): User {
                            return { id, name: 'Test', email: 'test@example.com' };
                        }
                    }
                `,
            "src/utils.ts": `
                    export function formatId(id: number): string {
                        return \`ID-\${id.toString().padStart(5, '0')}\`;
                    }
                `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm", "cjs"],
        });

        expect(result.success).toBe(true);

        const esmDtsFile = findFile(result, "index", ".d.mts");
        expect(esmDtsFile).toBeDefined();
        expect(esmDtsFile?.content).toContain("interface User");
        expect(esmDtsFile?.content).toContain("class UserService");
        expect(esmDtsFile?.content).toContain("function formatId");

        const cjsDtsFile = findFile(result, "index", ".d.ts");
        expect(cjsDtsFile).toBeDefined();
        expect(cjsDtsFile?.content).toContain("interface User");
        expect(cjsDtsFile?.content).toContain("class UserService");
        expect(cjsDtsFile?.content).toContain("function formatId");
    });

    it("should handle path aliases in tsconfig", async () => {
        createProject({
            "tsconfig.json": JSON.stringify({
                compilerOptions: {
                    baseUrl: ".",
                    paths: {
                        "@models/*": ["src/models/*"],
                        "@utils/*": ["src/utils/*"],
                    },
                },
            }),
            "src/index.ts": `
                    import { Product } from '@models/product';
                    import { formatPrice } from '@utils/formatter';

                    export function displayProduct(product: Product): string {
                        return \`\${product.name}: \${formatPrice(product.price)}\`;
                    }

                    export type { Product } from '@models/product';
                    export { formatPrice } from '@utils/formatter';
                `,
            "src/models/product.ts": `
                    export interface Product {
                        id: number;
                        name: string;
                        price: number;
                    }
                `,
            "src/utils/formatter.ts": `
                    export function formatPrice(price: number): string {
                        return \`$\${price.toFixed(2)}\`;
                    }
                `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("interface Product");
        expect(dtsFile?.content).toContain("declare function displayProduct");
        expect(dtsFile?.content).toContain(
            "export { Product, displayProduct, formatPrice }",
        );
    });

    it("should handle circular dependencies", async () => {
        createProject({
            "src/index.ts": `
                    export * from './a';
                    export * from './b';
                `,
            "src/a.ts": `
                    import { B } from './b';

                    export interface A {
                        id: number;
                        name: string;
                        b?: B;
                    }

                    export function createA(name: string): A {
                        return { id: 1, name };
                    }
                `,
            "src/b.ts": `
                    import { A } from './a';

                    export interface B {
                        id: number;
                        code: string;
                        a?: A;
                    }

                    export function createB(code: string): B {
                        return { id: 1, code };
                    }
                `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("interface A");
        expect(dtsFile?.content).toContain("interface B");
        expect(dtsFile?.content).toContain("function createA");
        expect(dtsFile?.content).toContain("function createB");
    });

    it("should handle type-only imports and exports", async () => {
        createProject({
            "src/index.ts": `
                    import type { Config } from './types';

                    export function initialize(config: Config): void {
                        console.log(config);
                    }

                    export type { ConfigKey } from './types';
                `,
            "src/types.ts": `
                    export interface Config {
                        apiKey: string;
                        timeout: number;
                        debug?: boolean;
                    }

                    export type ConfigKey = keyof Config;
                `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain(
            "declare function initialize(config: Config)",
        );
        expect(dtsFile?.content).toContain("type ConfigKey = keyof Config");
        expect(dtsFile?.content).toContain("interface Config");
        expect(dtsFile?.content).not.toContain(
            "export type { Config, ConfigKey }",
        );
    });

    it("should handle triple-slash directives", async () => {
        createProject({
            "package.json": JSON.stringify({
                name: "test-package",
                version: "1.0.0",
                type: "module",
                dependencies: {
                    fs: "^1.0.0",
                },
            }),
            "src/index.ts": `
                    /// <reference path="./types.d.ts" />

                    import { readFileSync } from 'fs';

                    export function loadConfig(path: string): Config {
                        return JSON.parse(readFileSync(path, 'utf-8'));
                    }
                `,
            "src/types.d.ts": `
                    interface Config {
                        appName: string;
                        version: string;
                        features: string[];
                    }
                `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["cjs"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.cts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("declare function loadConfig");
        // TODO: uncomment these expectations after rolldown-plugin-dts solves this issue: https://github.com/sxzz/rolldown-plugin-dts/issues/5
        // expect(dtsFile?.content).toContain("interface Config");
        // expect(dtsFile?.content).toContain("appName");
    });

    it("should handle dynamic imports", async () => {
        createProject({
            "src/index.ts": `
                    export async function loadFeature(name: string): Promise<typeof Dashboard | typeof Settings> {
                        if (name === 'dashboard') {
                            const { Dashboard } = await import('./features/dashboard');
                            return Dashboard
                        } else {
                            const { Settings } = await import('./features/settings');
                            return Settings;
                        }
                    }
                `,
            "src/features/dashboard.ts": `
                    export class Dashboard {
                        title = 'Main Dashboard';
                        render() {
                            return this.title;
                        }
                    }
                `,
            "src/features/settings.ts": `
                    export class Settings {
                        title = 'User Settings';
                        render() {
                            return this.title;
                        }
                    }
                `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["cjs"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.ts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("declare function loadFeature");
    });

    it("should handle export = syntax", async () => {
        createProject({
            "src/index.ts": `
                    import Logger = require('./logger');

                    export function createLogger(name: string) {
                        return new Logger(name);
                    }

                    export { Logger };
                `,
            "src/logger.ts": `
                    class Logger {
                        constructor(private name: string) {}

                        log(message: string) {
                            console.log(\`[\${this.name}] \${message}\`);
                        }
                    }

                    export = Logger;
                `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["iife"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.ts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("declare function createLogger");
        expect(dtsFile?.content).toContain("export { Logger, createLogger };");
    });

    it("should handle import statements with relative paths properly", async () => {
        createProject({
            "src/index.ts": `
                    export * from './deep/nested/module';
                `,
            "src/deep/nested/module.ts": `
                    import { helper } from '../../utils/helper';

                    export function processData(data: string): string {
                        return helper(data);
                    }

                    export { Helper } from '../../utils/helper';
                `,
            "src/utils/helper.ts": `
                    export function helper(data: string): string {
                        return data.toUpperCase();
                    }

                    export interface Helper {
                        helper: (data: string) => string;
                    }
                `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("declare function processData");
        expect(dtsFile?.content).toContain("interface Helper");
        expect(dtsFile?.content).toContain("helper: (data: string) => string");
    });

    it("should handle project with nested barrel files", async () => {
        createProject({
            "src/index.ts": `
                export * from './features';
            `,
            "src/features/index.ts": `
                export * from './auth';
                export * from './user';
            `,
            "src/features/auth/index.ts": `
                export * from './models';
                export * from './services';
            `,
            "src/features/auth/models.ts": `
                export interface Credentials {
                    username: string;
                    password: string;
                }
            `,
            "src/features/auth/services.ts": `
                import { Credentials } from './models';

                export class AuthService {
                    login(credentials: Credentials): boolean {
                        return true;
                    }
                }
            `,
            "src/features/user/index.ts": `
                export * from './user.model';
                export * from './user.service';
            `,
            "src/features/user/user.model.ts": `
                export interface User {
                    id: string;
                    name: string;
                    email: string;
                }
            `,
            "src/features/user/user.service.ts": `
                import { User } from './user.model';

                export class UserService {
                    getUser(id: string): User | null {
                        return null;
                    }
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("interface Credentials");
        expect(dtsFile?.content).toContain("class AuthService");
        expect(dtsFile?.content).toContain("interface User");
        expect(dtsFile?.content).toContain("class UserService");
    });

    it("should handle project with custom baseUrl and multiple path mappings", async () => {
        createProject({
            "tsconfig.json": JSON.stringify({
                compilerOptions: {
                    baseUrl: "src",
                    paths: {
                        "@app/*": ["*"],
                        "@core/*": ["core/*"],
                        "@shared/*": ["shared/*"],
                        "@features/*": ["features/*"],
                        "@types": ["types/index.ts"],
                        "~/*": ["../lib/*"],
                    },
                },
            }),
            "src/index.ts": `
                import { AppConfig } from '@app/core/config';
                import { Logger } from '@core/logger';
                import { formatDate } from '@shared/utils';
                import { UserProfile } from '@features/user/profile';
                import { AppTypes } from '@types';
                import { HelperFunction } from '~/helpers';

                export function initApp(config: AppConfig): void {
                    const logger = new Logger();
                    logger.log(\`App initialized at \${formatDate(new Date())}\`);
                }

                export type { AppConfig, UserProfile, AppTypes };
                export { HelperFunction };
            `,
            "src/core/config.ts": `
                export interface AppConfig {
                    apiUrl: string;
                    debug: boolean;
                }
            `,
            "src/core/logger.ts": `
                export class Logger {
                    log(message: string): void {
                        console.log(message);
                    }
                }
            `,
            "src/shared/utils.ts": `
                export function formatDate(date: Date): string {
                    return date.toISOString();
                }
            `,
            "src/features/user/profile.ts": `
                export interface UserProfile {
                    id: string;
                    displayName: string;
                    avatar?: string;
                }
            `,
            "src/types/index.ts": `
                export type AppTypes = 'web' | 'mobile' | 'desktop';
            `,
            "lib/helpers.ts": `
                export function HelperFunction(value: string): string {
                    return value.trim();
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("interface AppConfig");
        expect(dtsFile?.content).toContain("type AppTypes");
        expect(dtsFile?.content).toContain("interface UserProfile");
        expect(dtsFile?.content).toContain("declare function HelperFunction");
    });

    it("should handle project with monorepo structure", async () => {
        createProject({
            "tsconfig.json": JSON.stringify({
                compilerOptions: {
                    baseUrl: ".",
                    paths: {
                        "@packages/*": ["packages/*"],
                    },
                },
            }),
            "src/index.ts": `
                export * from '@packages/core';
                export * from '@packages/utils';
                export * from './local';
            `,
            "src/local.ts": `
                import { CoreFeature } from '@packages/core';
                import { formatText } from '@packages/utils';

                export function enhancedFeature(): string {
                    const core = new CoreFeature();
                    return formatText(core.getData());
                }
            `,
            "packages/core/index.ts": `
                export * from './feature';
            `,
            "packages/core/feature.ts": `
                export class CoreFeature {
                    getData(): string {
                        return 'core data';
                    }
                }
            `,
            "packages/utils/index.ts": `
                export * from './formatters';
            `,
            "packages/utils/formatters.ts": `
                export function formatText(text: string): string {
                    return text.toUpperCase();
                }

                export function formatNumber(num: number): string {
                    return num.toFixed(2);
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("declare function enhancedFeature");
        expect(dtsFile?.content).toContain("class CoreFeature");
        expect(dtsFile?.content).toContain("declare function formatText");
        expect(dtsFile?.content).toContain("declare function formatNumber");
    });

    it("should handle project with multiple entry points", async () => {
        createProject({
            "src/main.ts": `
                import { initApp } from './app';
                import { ApiClient } from './api';

                export function bootstrap() {
                    initApp();
                    new ApiClient().connect();
                }

                export * from './app';
                export * from './api';
            `,
            "src/cli.ts": `
                import { Command } from './command';

                export function run(args: string[]) {
                    new Command().execute(args);
                }

                export * from './command';
            `,
            "src/app.ts": `
                export interface AppConfig {
                    name: string;
                    version: string;
                }

                export function initApp() {
                    console.log('App initialized');
                }
            `,
            "src/api.ts": `
                export class ApiClient {
                    connect() {
                        return true;
                    }

                    request<T>(endpoint: string): Promise<T> {
                        return Promise.resolve({} as T);
                    }
                }
            `,
            "src/command.ts": `
                export class Command {
                    execute(args: string[]) {
                        console.log('Executing command with args:', args);
                    }
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/main.ts", "src/cli.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);

        const mainDtsFile = findFile(result, "main", ".d.mts");
        expect(mainDtsFile).toBeDefined();
        expect(mainDtsFile?.content).toContain("declare function bootstrap");
        expect(mainDtsFile?.content).toContain("interface AppConfig");
        expect(mainDtsFile?.content).toContain("class ApiClient");

        const cliDtsFile = findFile(result, "cli", ".d.mts");
        expect(cliDtsFile).toBeDefined();
        expect(cliDtsFile?.content).toContain("declare function run");
        expect(cliDtsFile?.content).toContain("declare class Command");
        expect(cliDtsFile?.content).toContain("execute(args: string[])");
    });

    it("should handle projects with nested tsconfig files", async () => {
        createProject({
            "tsconfig.json": JSON.stringify({
                compilerOptions: {
                    baseUrl: ".",
                    paths: {
                        "@root/*": ["src/*"],
                    },
                },
            }),
            "src/index.ts": `
                export * from './feature';
                export * from './packages/ui';
            `,
            "src/feature.ts": `
                export interface RootFeature {
                    name: string;
                }
            `,
            "src/packages/tsconfig.json": JSON.stringify({
                extends: "../../tsconfig.json",
                compilerOptions: {
                    baseUrl: ".",
                    paths: {
                        "@ui/*": ["ui/*"],
                    },
                },
            }),
            "src/packages/ui/index.ts": `
                export * from './button';
                export * from './input';
            `,
            "src/packages/ui/button.ts": `
                export interface Button {
                    label: string;
                    onClick: () => void;
                }
            `,
            "src/packages/ui/input.ts": `
                export interface Input {
                    value: string;
                    onChange: (value: string) => void;
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("interface RootFeature");
        expect(dtsFile?.content).toContain("interface Button");
        expect(dtsFile?.content).toContain("interface Input");
    });

    it("should handle project references", async () => {
        createProject({
            "tsconfig.json": JSON.stringify({
                compilerOptions: {
                    composite: true,
                    declaration: true,
                    baseUrl: ".",
                },
                references: [
                    { path: "./packages/core" },
                    { path: "./packages/utils" },
                ],
            }),
            "src/index.ts": `
                export * from '../packages/core';
                export * from '../packages/utils';

                export interface AppConfig {
                    version: string;
                    environment: string;
                }
            `,
            "packages/core/tsconfig.json": JSON.stringify({
                compilerOptions: {
                    composite: true,
                    declaration: true,
                    outDir: "../../dist/core",
                },
            }),
            "packages/core/index.ts": `
                export interface CoreModule {
                    init(): void;
                }

                export class Core implements CoreModule {
                    init() {
                        console.log('Core initialized');
                    }
                }
            `,
            "packages/utils/tsconfig.json": JSON.stringify({
                compilerOptions: {
                    composite: true,
                    declaration: true,
                    outDir: "../../dist/utils",
                },
                references: [{ path: "../core" }],
            }),
            "packages/utils/index.ts": `
                import { CoreModule } from '../core';

                export interface Logger {
                    log(message: string): void;
                }

                export class ConsoleLogger implements Logger {
                    constructor(private core: CoreModule) {}

                    log(message: string) {
                        console.log(message);
                    }
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("interface CoreModule");
        expect(dtsFile?.content).toContain("class Core");
        expect(dtsFile?.content).toContain("interface Logger");
        expect(dtsFile?.content).toContain("class ConsoleLogger");
        expect(dtsFile?.content).toContain("interface AppConfig");
    });

    it("should handle tsconfig paths with complex wildcards", async () => {
        createProject({
            "tsconfig.json": JSON.stringify({
                compilerOptions: {
                    baseUrl: ".",
                    paths: {
                        "@/*": ["src/*"],
                        "components/*": ["src/components/*"],
                        utils: ["src/utils/index.ts"],
                        "models/*": ["src/models/*"],
                        "@api/v*": ["src/api/v*/index.ts"],
                    },
                },
            }),
            "src/index.ts": `
                import { Button } from 'components/button';
                import { formatDate } from 'utils';
                import { User } from 'models/user';
                import { fetchUsers } from '@api/v1';
                import { getAnalytics } from 'services/@analytics/v2';

                export { Button, formatDate, User, fetchUsers, getAnalytics };

                export function initApp(): void {
                    console.log('App initialized');
                }
            `,
            "src/components/button.ts": `
                export interface ButtonProps {
                    label: string;
                    onClick: () => void;
                    className?: string;
                }

                export function Button(props: ButtonProps) {
                    return null; // Mock component
                }
            `,
            "src/utils/index.ts": `
                export function formatDate(date: Date): string {
                    return date.toISOString();
                }
            `,
            "src/models/user.ts": `
                export interface User {
                    id: string;
                    name: string;
                }
            `,
            "src/api/v1/index.ts": `
                export function fetchUsers(): Promise<any[]> {
                    return Promise.resolve([]);
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("interface Button");
        expect(dtsFile?.content).toContain("declare function formatDate");
        expect(dtsFile?.content).toContain("interface User");
        expect(dtsFile?.content).toContain("declare function fetchUsers");
        expect(dtsFile?.content).toContain("declare function initApp(): void");
    });

    it("should handle non-standard file extensions (.tsx)", async () => {
        createProject({
            "src/index.ts": `
                export * from './components/Button';
                export * from './components/Input';
            `,
            "src/components/Button.tsx": `
                export interface ButtonProps {
                    label: string;
                    onClick: () => void;
                    className?: string;
                }

                export function Button(props: ButtonProps) {
                    return null; // Mock component
                }
            `,
            "src/components/Input.tsx": `
                export interface InputProps {
                    value: string;
                    onChange: (value: string) => void;
                    placeholder?: string;
                }

                export function Input(props: InputProps) {
                    return null; // Mock component
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("interface ButtonProps");
        expect(dtsFile?.content).toContain("declare function Button");
        expect(dtsFile?.content).toContain("interface InputProps");
        expect(dtsFile?.content).toContain("declare function Input");
    });

    it("should resolve index.ts files when importing directories", async () => {
        createProject({
            "src/index.ts": `
                // Import a folder that contains an index.ts file
                import { ServiceA } from './services';
                import { UtilA } from './utils';
                import { ComponentA } from './components/ui';

                export function appInit(): void {
                    const service = new ServiceA();
                    const util = new UtilA();
                    const component = new ComponentA();
                    return { service, util, component };
                }

                export * from './services';
                export * from './utils';
                export * from './components/ui';
            `,
            "src/services/index.ts": `
                export class ServiceA {
                    name = 'Service A';

                    doSomething(): void {
                        console.log('Service A doing something');
                    }
                }

                export class ServiceB {
                    name = 'Service B';

                    doSomethingElse(): string {
                        return 'Service B result';
                    }
                }
            `,
            "src/utils/index.ts": `
                export class UtilA {
                    static formatString(str: string): string {
                        return str.toUpperCase();
                    }
                }

                export function helperFunction(value: number): number {
                    return value * 2;
                }
            `,
            "src/components/ui/index.d.ts": `
                export * from './component-a';
                export * from './component-b';
            `,
            "src/components/ui/component-a.ts": `
                export interface ComponentAProps {
                    title: string;
                    subtitle?: string;
                }

                export class ComponentA {
                    render(props: ComponentAProps) {
                        return props.title;
                    }
                }
            `,
            "src/components/ui/component-b.ts": `
                export interface ComponentBProps {
                    items: string[];
                    onSelect: (item: string) => void;
                }

                export class ComponentB {
                    render(props: ComponentBProps) {
                        return props.items.join(', ');
                    }
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("class ServiceA");
        expect(dtsFile?.content).toContain("class ServiceB");
        expect(dtsFile?.content).toContain("class UtilA");
        expect(dtsFile?.content).toContain("declare function helperFunction");
        expect(dtsFile?.content).toContain("interface ComponentAProps");
        expect(dtsFile?.content).toContain("class ComponentA");
        expect(dtsFile?.content).toContain("interface ComponentBProps");
        expect(dtsFile?.content).toContain("class ComponentB");
        expect(dtsFile?.content).toContain("declare function appInit(): void");
    });

    it("should handle index resolution in deep nested structures", async () => {
        createProject({
            "src/index.ts": `
                // Import deeply nested modules through index files
                import { Feature } from './features';
                import { SubFeature } from './features/a/b/c/index';

                export function initializeApp() {
                    const feature = new Feature();
                    const subFeature = new SubFeature();
                    return { feature, subFeature };
                }

                export * from './features';
                export * from './features/a/b/c';
            `,
            "src/features/index.ts": `
                export * from './feature';
                export * from './a/index';
            `,
            "src/features/feature.ts": `
                export class Feature {
                    name = 'Main Feature';
                    enable(): boolean {
                        return true;
                    }
                }
            `,
            "src/features/a/index.ts": `
                export * from './feature-a';
                export * from './b';
            `,
            "src/features/a/feature-a.ts": `
                export class FeatureA {
                    name = 'Feature A';
                    execute(): string {
                        return 'Feature A executed';
                    }
                }
            `,
            "src/features/a/b/index.ts": `
                export * from './feature-b';
                export * from './c';
            `,
            "src/features/a/b/feature-b.ts": `
                export class FeatureB {
                    name = 'Feature B';
                    process(data: string): string {
                        return data.toLowerCase();
                    }
                }
            `,
            "src/features/a/b/c/index.ts": `
                export * from './sub-feature';
            `,
            "src/features/a/b/c/sub-feature.ts": `
                export interface SubFeatureOptions {
                    timeout: number;
                    retries?: number;
                }

                export class SubFeature {
                    name = 'Sub Feature';
                    configure(options: SubFeatureOptions): void {
                        console.log('Configured with', options);
                    }
                }
            `,
        });

        const result = await runDtsBuild({
            entry: ["src/index.ts"],
            format: ["esm"],
        });

        expect(result.success).toBe(true);
        const dtsFile = findFile(result, "index", ".d.mts");
        expect(dtsFile).toBeDefined();
        expect(dtsFile?.content).toContain("class Feature");
        expect(dtsFile?.content).toContain("class FeatureA");
        expect(dtsFile?.content).toContain("class FeatureB");
        expect(dtsFile?.content).toContain("interface SubFeatureOptions");
        expect(dtsFile?.content).toContain("class SubFeature");
        expect(dtsFile?.content).toContain("declare function initializeApp()");
    });
});
