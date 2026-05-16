export declare const getConfigValue: (rootDir: string, pathExpression: string) => unknown;
export declare const listConfigEntries: (rootDir: string) => Array<{
    path: string;
    value: unknown;
}>;
export declare const setConfigValue: (rootDir: string, expression: string) => void;
