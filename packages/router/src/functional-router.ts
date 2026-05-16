import express from "express";
import type { ErrorRequestHandler, RequestHandler } from "express";

import { registerRouterSource } from "./collisions.js";
import type { FunctionalRouterLike, HttpMethod, Req, Res, Nxt, RouterSource } from "./types.js";

type FunctionalHandler = (req: Req, res: Res, next: Nxt) => unknown;

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
  method: string,
  routePath: string,
  handler: FunctionalHandler
): RequestHandler => {
  return (req, res, next) => {
    res.locals.sculptorRoute = {
      controller: undefined,
      method,
      path: routePath,
      propertyKey: handler.name || "handler"
    };

    void Promise.resolve()
      .then(() => handler(req, res, next))
      .then((result) => {
        if (result !== undefined && !res.headersSent) {
          res.json(result);
        }
      })
      .catch(next);
  };
};

class FunctionalRouterScope implements FunctionalRouterLike {
  private readonly router: express.Router;
  private readonly prefix: string;
  private readonly sourceLabel: string;

  constructor(
    prefix = "",
    sourceLabel?: string,
    router: express.Router = express.Router()
  ) {
    this.prefix = prefix;
    this.sourceLabel = sourceLabel ?? `FunctionalRouter(${JSON.stringify(prefix || "/")})`;
    this.router = router;
    registerRouterSource(this.router, this.sourceLabel);
  }

  private register(
    method: HttpMethod,
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    handlers: Array<RequestHandler | FunctionalHandler>
  ): this {
    const localPath =
      typeof pathOrHandler === "string" ? pathOrHandler : "/";
    const routeHandlers =
      typeof pathOrHandler === "string"
        ? handlers
        : [pathOrHandler, ...handlers];

    const [lastHandler, ...middlewares] = [...routeHandlers].reverse();
    if (typeof lastHandler !== "function") {
      throw new TypeError(`FunctionalRouter.${method}() requires a handler.`);
    }

    const routePath = joinPaths(this.prefix, localPath);
    const routeHandler = createRouteHandler(method, routePath, lastHandler as FunctionalHandler);
    const middlewareList = middlewares.reverse().filter(
      (value): value is RequestHandler => typeof value === "function"
    );

    (this.router[method] as (path: string, ...handlers: RequestHandler[]) => unknown)(
      routePath,
      ...middlewareList,
      routeHandler
    );

    return this;
  }

  use(...middlewares: Array<RequestHandler | ErrorRequestHandler>): this;
  use(path: string, ...middlewares: Array<RequestHandler | ErrorRequestHandler>): this;
  use(
    pathOrMiddleware: string | RequestHandler | ErrorRequestHandler,
    ...middlewares: Array<RequestHandler | ErrorRequestHandler>
  ): this {
    if (typeof pathOrMiddleware !== "string") {
      this.router.use(pathOrMiddleware, ...middlewares);
      return this;
    }

    this.router.use(joinPaths(this.prefix, pathOrMiddleware), ...middlewares);
    return this;
  }

  at(path: string): FunctionalRouterScope {
    return new FunctionalRouterScope(
      joinPaths(this.prefix, path),
      this.sourceLabel,
      this.router
    );
  }

  get(
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    ...handlers: Array<RequestHandler | FunctionalHandler>
  ): this {
    return this.register("get", pathOrHandler, handlers);
  }

  post(
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    ...handlers: Array<RequestHandler | FunctionalHandler>
  ): this {
    return this.register("post", pathOrHandler, handlers);
  }

  put(
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    ...handlers: Array<RequestHandler | FunctionalHandler>
  ): this {
    return this.register("put", pathOrHandler, handlers);
  }

  patch(
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    ...handlers: Array<RequestHandler | FunctionalHandler>
  ): this {
    return this.register("patch", pathOrHandler, handlers);
  }

  delete(
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    ...handlers: Array<RequestHandler | FunctionalHandler>
  ): this {
    return this.register("delete", pathOrHandler, handlers);
  }

  toRouter(): express.Router {
    return this.router;
  }
}

export const FunctionalRouter = (prefix = ""): FunctionalRouterScope =>
  new FunctionalRouterScope(prefix);
