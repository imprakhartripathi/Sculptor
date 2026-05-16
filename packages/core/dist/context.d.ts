import type { Request, RequestHandler } from "express";
import type { RequestContext } from "./types.js";
declare module "express-serve-static-core" {
    interface Request {
        ctx?: RequestContext;
    }
}
export declare const createRequestContext: (req: Request) => RequestContext;
export declare const requestContextMiddleware: () => RequestHandler;
