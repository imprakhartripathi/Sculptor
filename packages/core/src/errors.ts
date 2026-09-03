import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";

import type { FrameworkErrorContext, FrameworkErrorHook } from "./types.js";

export interface SculptorErrorOptions {
  cause?: unknown;
  code?: string;
  details?: Record<string, unknown>;
  status?: number;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class SculptorError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, options: SculptorErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = options.code ?? "SCULPTOR_ERROR";
    this.status = options.status ?? 500;
    this.details = options.details;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export class HttpError extends SculptorError {
  constructor(status: number, message: string, options: Omit<SculptorErrorOptions, "status"> = {}) {
    super(message, { ...options, status, code: options.code ?? "HTTP_ERROR" });
    this.name = "HttpError";
  }
}

export class RuntimeError extends SculptorError {
  constructor(message = "Unhandled application error", options: Omit<SculptorErrorOptions, "status"> = {}) {
    super(message, { ...options, status: 500, code: options.code ?? "RUNTIME_ERROR" });
    this.name = "RuntimeError";
  }
}

export const normalizeError = (error: unknown): SculptorError => {
  if (error instanceof SculptorError) {
    return error;
  }

  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof Error) {
    return new RuntimeError(error.message, {
      cause: error,
      code: error.name || "ERROR",
      details: {
        name: error.name,
        stack: error.stack
      }
    });
  }

  if (typeof error === "string") {
    return new RuntimeError(error, {
      cause: error,
      details: { value: error }
    });
  }

  if (typeof error === "number" || typeof error === "boolean" || typeof error === "bigint") {
    return new RuntimeError(String(error), {
      cause: error,
      details: { value: String(error) }
    });
  }

  if (typeof error === "symbol") {
    return new RuntimeError(error.description ?? "Unknown symbol error", {
      cause: error,
      details: { value: error.toString() }
    });
  }

  if (isPlainObject(error)) {
    const message =
      typeof error.message === "string" && error.message.trim()
        ? error.message
        : "Unhandled application error";

    return new RuntimeError(message, {
      cause: error,
      details: error
    });
  }

  return new RuntimeError("Unhandled application error", {
    cause: error
  });
};

const readRouteContext = (res: Response): FrameworkErrorContext["route"] | undefined => {
  const route = res.locals.sculptorRoute as
    | { controller?: string; method?: string; path?: string; propertyKey?: string }
    | undefined;

  if (!route) {
    return undefined;
  }

  return {
    controller: route.controller,
    method: route.method,
    path: route.path,
    propertyKey: route.propertyKey
  };
};

export const toFrameworkErrorResponse = (error: SculptorError): {
  error: {
    code: string;
    message: string;
    status: number;
  };
} => ({
  error: {
    code: error.code,
    message: error.message,
    status: error.status
  }
});

export const createFrameworkErrorMiddleware = (
  onError?: FrameworkErrorHook
): ErrorRequestHandler => (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const normalized = normalizeError(error);

  const context: FrameworkErrorContext = {
    request: req,
    response: res,
    route: readRouteContext(res),
    timestamp: new Date(),
    controller: res.locals.sculptorRoute
      ? {
          name: res.locals.sculptorRoute.controller,
          propertyKey: res.locals.sculptorRoute.propertyKey
        }
      : undefined,
    context: req.ctx
  };

  void Promise.resolve(onError?.(normalized, context))
    .catch(() => undefined)
    .then(() => {
      if (res.headersSent) {
        return;
      }

      res
        .status(normalized.status >= 400 ? normalized.status : 500)
        .json(toFrameworkErrorResponse(normalized));
    });
};
