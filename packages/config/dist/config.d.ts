import { redactConfig } from "./redact.js";
export interface FrameworkConfig {
    project?: {
        srcRoot?: string;
        entryFile?: string;
        devServer?: "tsx" | "nodemon";
    };
    logging?: {
        enabled?: boolean;
        dogMode?: boolean;
    };
    routing?: {
        style?: "decorator" | "functional" | "hybrid";
    };
    testing?: {
        generate?: boolean;
        framework?: "vitest";
    };
    frameworkLock?: boolean;
    plugins?: {
        enabled?: boolean;
        registry?: string[];
    };
}
export interface RuntimeConfig {
    app?: {
        port?: number;
        prefix?: string;
    };
}
export interface LoadedConfig {
    framework: FrameworkConfig;
    runtime: RuntimeConfig;
    merged: FrameworkConfig & RuntimeConfig;
    rootDir: string;
}
export interface ConfigOverrides {
    framework?: Partial<FrameworkConfig>;
    runtime?: Partial<RuntimeConfig>;
}
export declare class ConfigError extends Error {
    name: string;
}
export declare class ConfigInterpolationError extends ConfigError {
    name: string;
}
export declare const loadConfig: (rootDir?: string, overrides?: ConfigOverrides) => LoadedConfig;
export declare const getConfig: (pathExpression: string, rootDir?: string, overrides?: ConfigOverrides) => unknown;
export { redactConfig };
