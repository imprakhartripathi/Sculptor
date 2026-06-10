import type { ErrorRequestHandler } from "express";
import type { FrameworkErrorHook } from "./types.js";
export interface SculptorErrorOptions {
    cause?: unknown;
    code?: string;
    details?: Record<string, unknown>;
    status?: number;
}
export declare class SculptorError extends Error {
    readonly code: string;
    readonly status: number;
    readonly details?: Record<string, unknown>;
    constructor(message: string, options?: SculptorErrorOptions);
}
export declare class HttpError extends SculptorError {
    constructor(status: number, message: string, options?: Omit<SculptorErrorOptions, "status">);
}
export declare class RuntimeError extends SculptorError {
    constructor(message?: string, options?: Omit<SculptorErrorOptions, "status">);
}
export declare const normalizeError: (error: unknown) => SculptorError;
export declare const toFrameworkErrorResponse: (error: SculptorError) => {
    error: {
        code: string;
        message: string;
        status: number;
    };
};
export declare const createFrameworkErrorMiddleware: (onError?: FrameworkErrorHook) => ErrorRequestHandler;
