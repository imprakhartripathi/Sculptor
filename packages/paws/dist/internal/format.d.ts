export type LogLevel = "log" | "system" | "warn" | "error";
export type LoggerMode = "dog" | "standard";
export declare const formatValue: (value: unknown) => string;
export declare const formatMessage: (values: readonly unknown[]) => string;
