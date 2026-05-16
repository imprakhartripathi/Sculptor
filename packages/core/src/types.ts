import type express from "express";
import type {
  ControllerClass,
  Err as RouterErr,
  Nxt as RouterNxt,
  Req as RouterReq,
  Res as RouterRes,
  RouterSource
} from "@sculptor/router";

export interface RegistryShape {
  controllers: ControllerClass[];
  routes: RouterSource[];
  services: unknown[];
}

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

export interface BootstrapAppOptions {
  registry: RegistryShape;
  rootDir?: string;
  port?: number;
  listen?: boolean;
  onError?: (error: unknown, context: FrameworkErrorContext) => void | Promise<void>;
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
