import type { ErrorRequestHandler } from "express";
import type { FrameworkErrorContext } from "./types.js";
type ErrorHook = (error: unknown, context: FrameworkErrorContext) => void | Promise<void>;
export declare const createFrameworkErrorMiddleware: (onError?: ErrorHook) => ErrorRequestHandler;
export {};
