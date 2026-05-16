import express from "express";
import type { ErrorRequestHandler, RequestHandler } from "express";
import type { FunctionalRouterLike, Req, Res, Nxt } from "./types.js";
type FunctionalHandler = (req: Req, res: Res, next: Nxt) => unknown;
declare class FunctionalRouterScope implements FunctionalRouterLike {
    private readonly router;
    private readonly prefix;
    private readonly sourceLabel;
    constructor(prefix?: string, sourceLabel?: string, router?: express.Router);
    private register;
    use(...middlewares: Array<RequestHandler | ErrorRequestHandler>): this;
    use(path: string, ...middlewares: Array<RequestHandler | ErrorRequestHandler>): this;
    at(path: string): FunctionalRouterScope;
    get(pathOrHandler: string | RequestHandler | FunctionalHandler, ...handlers: Array<RequestHandler | FunctionalHandler>): this;
    post(pathOrHandler: string | RequestHandler | FunctionalHandler, ...handlers: Array<RequestHandler | FunctionalHandler>): this;
    put(pathOrHandler: string | RequestHandler | FunctionalHandler, ...handlers: Array<RequestHandler | FunctionalHandler>): this;
    patch(pathOrHandler: string | RequestHandler | FunctionalHandler, ...handlers: Array<RequestHandler | FunctionalHandler>): this;
    delete(pathOrHandler: string | RequestHandler | FunctionalHandler, ...handlers: Array<RequestHandler | FunctionalHandler>): this;
    toRouter(): express.Router;
}
export declare const FunctionalRouter: (prefix?: string) => FunctionalRouterScope;
export {};
