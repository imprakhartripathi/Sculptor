import type express from "express";
import type { RequestHandler } from "express";
import type { PackageToken, ProviderToken, SculptorFunctionalHandler, SculptorFunctionalController, SculptorFunctionalPackage, SculptorFunctionalRepository, SculptorFunctionalService } from "@sculptor/di";
import type { SculptorExpressBuilder } from "./app.js";
import type { ControllerClass, Err as RouterErr, Nxt as RouterNxt, Req as RouterReq, Res as RouterRes, RouterSource, RouterErrorHandler } from "@sculptor/router";
import type { SculptorError } from "./errors.js";
export interface RegistryShape {
    packages?: PackageToken[];
    controllers: ControllerClass[];
    routes: RouterSource[];
    services: ProviderToken[];
    repositories?: ProviderToken[];
    middlewares?: RequestHandler[];
}
export type { SculptorExpressBuilder, SculptorFunctionalController, SculptorFunctionalHandler, SculptorFunctionalPackage, SculptorFunctionalRepository, SculptorFunctionalService };
export type Req = RouterReq;
export type Res = RouterRes;
export type Nxt = RouterNxt;
export type Err = RouterErr;
export interface RequestContext {
    requestId: string;
    meta: Record<string, unknown>;
    user?: unknown;
}
export interface RouteRuntimeContext {
    controller?: string;
    method?: string;
    path?: string;
    propertyKey?: string;
}
export interface FrameworkErrorContext {
    request: express.Request;
    response: express.Response;
    route?: RouteRuntimeContext;
    timestamp: Date;
    controller?: {
        name?: string;
        propertyKey?: string;
    };
    context?: RequestContext;
}
export type FrameworkErrorHandler = RouterErrorHandler<SculptorError>;
export type FrameworkErrorHook = (error: SculptorError, context: FrameworkErrorContext) => void | Promise<void>;
export interface BootstrapAppOptions {
    registry: RegistryShape;
    rootDir?: string;
    app?: SculptorExpressBuilder;
    port?: number;
    listen?: boolean;
    onError?: FrameworkErrorHook;
}
export interface BootstrapAppResult {
    app: express.Express;
    router: express.Router;
    rootDir: string;
    port: number;
    listen: boolean;
    server?: import("node:http").Server;
}
export interface StartAppOptions extends BootstrapAppOptions {
    listen?: true;
}
export interface StartAppBootstrapOptions extends BootstrapAppOptions {
    listen: false;
}
