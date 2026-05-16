import "reflect-metadata";

import { METADATA_KEYS } from "../metadata.js";
import type { HttpMethod, MethodRouteMetadata } from "../types.js";

const normalizeRoutePath = (path: string): string => {
  if (!path || path === "/") {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const appendRouteMetadata = (
  target: object,
  propertyKey: string | symbol,
  route: MethodRouteMetadata
): void => {
  const existing: MethodRouteMetadata[] =
    Reflect.getOwnMetadata(METADATA_KEYS.methodRoutes, target, propertyKey) ?? [];

  Reflect.defineMetadata(
    METADATA_KEYS.methodRoutes,
    [...existing, route],
    target,
    propertyKey
  );
};

const createMethodDecorator =
  (method: HttpMethod) =>
  (path = "/"): MethodDecorator => {
    return (target, propertyKey) => {
      appendRouteMetadata(target, propertyKey, {
        method,
        path: normalizeRoutePath(path)
      });
    };
  };

export const Get = createMethodDecorator("get");
export const Post = createMethodDecorator("post");
export const Put = createMethodDecorator("put");
export const Patch = createMethodDecorator("patch");
export const Delete = createMethodDecorator("delete");
