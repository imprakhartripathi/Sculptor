export interface FrameworkConfig {
    project?: {
        srcRoot?: string;
        entryFile?: string;
        devServer?: "tsnode" | "nodemon";
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
export declare const loadConfig: (rootDir?: string) => LoadedConfig;
export declare const getConfig: (pathExpression: string, rootDir?: string) => unknown;
