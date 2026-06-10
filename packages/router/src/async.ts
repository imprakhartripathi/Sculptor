import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" &&
  value !== null &&
  "then" in value &&
  typeof (value as { then?: unknown }).then === "function";

export const wrapRequestHandler = (handler: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = handler(req, res, next);

      if (isPromiseLike(result)) {
        void Promise.resolve(result).catch(next);
      }
    } catch (error) {
      next(error);
    }
  };

export const wrapErrorHandler = (handler: ErrorRequestHandler): ErrorRequestHandler =>
  (error: unknown, req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = handler(error, req, res, next);

      if (isPromiseLike(result)) {
        void Promise.resolve(result).catch(next);
      }
    } catch (caughtError) {
      next(caughtError);
    }
  };
