import { randomUUID } from "node:crypto";

import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { RequestContext } from "./types.js";

declare module "express-serve-static-core" {
  interface Request {
    ctx: RequestContext;
  }
}

export const createRequestContext = (req: Request): RequestContext => ({
  requestId:
    (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"].trim()) ||
    randomUUID(),
  meta: {}
});

export const ensureRequestContext = (req: Request): RequestContext => {
  if (req.ctx) {
    return req.ctx;
  }

  req.ctx = createRequestContext(req);
  return req.ctx;
};

export const requestContextMiddleware = (): RequestHandler => (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  ensureRequestContext(req);
  next();
};
