import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router
} from "express";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export type Req = Request;
export type Res = Response;
export type Nxt = NextFunction;
export type Err = ErrorRequestHandler;
export type FunctionalHandler = (req: Req, res: Res, next: Nxt) => unknown;

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

export type ControllerClass<TInstance = object> = new (...args: never[]) => TInstance;

export interface CreateRouterOptions {
  controllers?: ControllerClass[];
  routes?: RouterSource[];
  prefix?: string;
}

export interface FunctionalRouterLike {
  at(path: string): FunctionalRouterLike;
  delete(
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    ...handlers: Array<RequestHandler | FunctionalHandler>
  ): FunctionalRouterLike;
  get(
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    ...handlers: Array<RequestHandler | FunctionalHandler>
  ): FunctionalRouterLike;
  patch(
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    ...handlers: Array<RequestHandler | FunctionalHandler>
  ): FunctionalRouterLike;
  post(
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    ...handlers: Array<RequestHandler | FunctionalHandler>
  ): FunctionalRouterLike;
  put(
    pathOrHandler: string | RequestHandler | FunctionalHandler,
    ...handlers: Array<RequestHandler | FunctionalHandler>
  ): FunctionalRouterLike;
  toRouter(): Router;
  use(...middlewares: Array<RequestHandler | ErrorRequestHandler>): FunctionalRouterLike;
  use(
    path: string,
    ...middlewares: Array<RequestHandler | ErrorRequestHandler>
  ): FunctionalRouterLike;
}

export type FunctionalRouterScope = FunctionalRouterLike;
export type RouterSource = Router | FunctionalRouterLike;

export interface RouteRegistrationSource {
  label: string;
}

export interface ParameterResolverContext {
  req: Request;
  res: Response;
  next: NextFunction;
}
