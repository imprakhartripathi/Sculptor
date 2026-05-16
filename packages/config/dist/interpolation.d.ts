export declare const getValueAtPath: (input: unknown, pathExpression: string) => unknown;
export declare const resolveInterpolations: <T>(input: T, resolver: (token: string, stack: string[]) => string | undefined) => T;
