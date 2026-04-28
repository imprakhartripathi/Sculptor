import type { NextFunction, Request, RequestHandler, Response, Router } from "express";
export type HttpMethod = "get" | "post" | "put" | "delete";
export interface MethodRouteMetadata {
    method: HttpMethod;
    path: string;
}
export interface RouteDefinition extends MethodRouteMetadata {
    propertyKey: string;
    middlewares: RequestHandler[];
}
export interface ControllerMetadata {
    prefix: string;
    middlewares: RequestHandler[];
    routes: RouteDefinition[];
}
export type ControllerClass<TInstance = object> = new (...args: never[]) => TInstance;
export interface CreateRouterOptions {
    controllers?: ControllerClass[];
    routes?: Router[];
    prefix?: string;
}
export interface ParameterResolverContext {
    req: Request;
    res: Response;
    next: NextFunction;
}
