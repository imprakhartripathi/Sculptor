import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";

import type { FrameworkErrorContext } from "./types.js";

type ErrorHook = (error: unknown, context: FrameworkErrorContext) => void | Promise<void>;

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

export const createFrameworkErrorMiddleware = (onError?: ErrorHook): ErrorRequestHandler => (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!onError) {
    next(error);
    return;
  }

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

  void Promise.resolve(onError(error, context))
    .then(() => {
      if (res.headersSent) {
        return;
      }

      const message = error instanceof Error ? error.message : "Unhandled application error";
      res.status(res.statusCode >= 400 ? res.statusCode : 500).json({
        error: message
      });
    })
    .catch((hookError: unknown) => {
      if (!res.headersSent) {
        next(hookError);
        return;
      }

      next(hookError);
    });
};
