import type { Router } from "express";
import type { ControllerMetadata } from "./types.js";
import type { RouterSource } from "./types.js";
export interface RegisteredRouteEntry {
    method: string;
    path: string;
    source: string;
}
export declare const createRegisteredRouteEntries: (controllerMetadata: ControllerMetadata[], routeRouters: RouterSource[], appPrefix?: string) => RegisteredRouteEntry[];
export declare const detectRouteCollisions: (controllerMetadata: ControllerMetadata[], routeRouters: RouterSource[], appPrefix?: string) => void;
export declare const registerRouterSource: (router: Router, source: string) => void;
