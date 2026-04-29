import type { LoggerMode } from "./format.js";
export interface LoggingConfig {
    enabled: boolean;
    dogMode: boolean;
}
export declare const resolveLoggingConfig: (rootDir?: string) => LoggingConfig;
export declare const resolveLoggerMode: (rootDir?: string) => LoggerMode;
