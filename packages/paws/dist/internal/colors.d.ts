export declare const ansi: {
    readonly reset: "\u001B[0m";
    readonly red: "\u001B[31m";
    readonly green: "\u001B[32m";
    readonly yellow: "\u001B[33m";
    readonly lightBlue: "\u001B[94m";
};
export type AnsiColor = (typeof ansi)[keyof typeof ansi];
export declare const colorText: (text: string, color: AnsiColor) => string;
