import type { NextFunction, Request, RequestHandler, Response } from "express";

import { wrapRequestHandler } from "./async.js";
import type { ControllerMetadata, RouteDefinition } from "./types.js";

type RouteHandler = (...args: unknown[]) => unknown;

const normalizePathSegment = (segment: string): string => {
  if (!segment) {
    return "/";
  }

  const withLeadingSlash = segment.startsWith("/") ? segment : `/${segment}`;
  return withLeadingSlash === "/" ? "/" : withLeadingSlash.replace(/\/+$/, "");
};

const joinPaths = (prefix: string, path: string): string => {
  const normalizedPrefix = normalizePathSegment(prefix);
  const normalizedPath = normalizePathSegment(path);

  if (normalizedPath === "/") {
    return normalizedPrefix;
  }

  if (normalizedPrefix === "/") {
    return normalizedPath;
  }

  return `${normalizedPrefix}${normalizedPath}`;
};

const createRouteHandler = (
  instance: object,
  controllerMetadata: ControllerMetadata,
  route: RouteDefinition
): RequestHandler => {
  const handler = (instance as Record<string, unknown>)[route.propertyKey];

  if (typeof handler !== "function") {
    throw new TypeError(
      `Route handler "${route.propertyKey}" is not a function on controller instance.`
    );
  }

  return (req: Request, res: Response, next: NextFunction) => {
    res.locals.sculptorRoute = {
      controller: controllerMetadata.controllerName,
      method: route.method,
      path: joinPaths(controllerMetadata.prefix, route.path),
      propertyKey: route.propertyKey
    };

    void Promise.resolve()
      .then(() => (handler as RouteHandler).call(instance, req, res, next))
      .then((result) => {
        if (result !== undefined && !res.headersSent) {
          res.json(result);
        }
      })
      .catch(next);
  };
};

export const registerControllerRoutes = (
  app: Record<string, unknown>,
  controllerMetadata: ControllerMetadata,
  controllerInstance: object
): void => {
  for (const route of controllerMetadata.routes) {
    const registrar = app[route.method] as
      | ((path: string, ...handlers: RequestHandler[]) => unknown)
      | undefined;

    if (!registrar) {
      throw new TypeError(
        `Express router does not support "${route.method.toUpperCase()}" method.`
      );
    }

    const fullPath = joinPaths(controllerMetadata.prefix, route.path);
    const middlewares: RequestHandler[] = [
      ...controllerMetadata.middlewares,
      ...route.middlewares
    ].map((middleware) => wrapRequestHandler(middleware));

    registrar.call(
      app,
      fullPath,
      ...middlewares,
      createRouteHandler(controllerInstance, controllerMetadata, route)
    );
  }
};
