import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response, Router } from "express";
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export type Req = Request;
export type Res = Response;
export type Nxt = NextFunction;
export type Err = ErrorRequestHandler;
export type FunctionalHandler = (req: Req, res: Res, next: Nxt) => unknown;
export type RouterErrorHandler<TError = unknown> = (error: TError, req: Req, res: Res, next: Nxt) => unknown;
export interface MethodRouteMetadata {
    method: HttpMethod;
    path: string;
}
export interface RouteDefinition extends MethodRouteMetadata {
    propertyKey: string;
    middlewares: RequestHandler[];
    source?: {
        label: string;
    };
}
export interface ControllerMetadata {
    controllerName: string;
    prefix: string;
    middlewares: RequestHandler[];
    routes: RouteDefinition[];
}
export type ControllerClass<TInstance = object> = new (...args: unknown[]) => TInstance;
export interface CreateRouterOptions {
    controllers?: ControllerClass[];
    routes?: RouterSource[];
    prefix?: string;
    controllerFactory?: <TInstance>(controllerClass: ControllerClass<TInstance>) => TInstance;
}
export interface FunctionalRouterScope {
    at(path: string): FunctionalRouterScope;
    delete(pathOrHandler: string | RequestHandler | FunctionalHandler, ...handlers: Array<RequestHandler | FunctionalHandler>): FunctionalRouterScope;
    get(pathOrHandler: string | RequestHandler | FunctionalHandler, ...handlers: Array<RequestHandler | FunctionalHandler>): FunctionalRouterScope;
    patch(pathOrHandler: string | RequestHandler | FunctionalHandler, ...handlers: Array<RequestHandler | FunctionalHandler>): FunctionalRouterScope;
    post(pathOrHandler: string | RequestHandler | FunctionalHandler, ...handlers: Array<RequestHandler | FunctionalHandler>): FunctionalRouterScope;
    put(pathOrHandler: string | RequestHandler | FunctionalHandler, ...handlers: Array<RequestHandler | FunctionalHandler>): FunctionalRouterScope;
    toRouter(): Router;
    use<TError = unknown>(...middlewares: Array<RequestHandler | RouterErrorHandler<TError>>): FunctionalRouterScope;
    use<TError = unknown>(path: string, ...middlewares: Array<RequestHandler | RouterErrorHandler<TError>>): FunctionalRouterScope;
}
export type FunctionalRouterLike = FunctionalRouterScope;
export type RouterSource = Router | FunctionalRouterScope;
export interface RouteRegistrationSource {
    label: string;
}
export interface ParameterResolverContext {
    req: Request;
    res: Response;
    next: NextFunction;
}
