import "reflect-metadata";

import type { RequestHandler } from "express";

import { METADATA_KEYS } from "./metadata.js";
import type {
  ControllerClass,
  ControllerMetadata,
  MethodRouteMetadata,
  RouteDefinition
} from "./types.js";

const listControllerMethods = (prototype: object): string[] => {
  const names = new Set<string>();
  let cursor: object | null = prototype;

  while (cursor && cursor !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(cursor)) {
      if (name === "constructor" || names.has(name)) {
        continue;
      }

      const descriptor = Object.getOwnPropertyDescriptor(cursor, name);

      if (descriptor && typeof descriptor.value === "function") {
        names.add(name);
      }
    }

    cursor = Object.getPrototypeOf(cursor);
  }

  return [...names];
};

const toRouteDefinitions = (prototype: object, methodName: string): RouteDefinition[] => {
  const routeMetadata: MethodRouteMetadata[] =
    Reflect.getMetadata(METADATA_KEYS.methodRoutes, prototype, methodName) ?? [];

  if (routeMetadata.length === 0) {
    return [];
  }

  const methodMiddlewares: RequestHandler[] =
    Reflect.getMetadata(METADATA_KEYS.methodMiddlewares, prototype, methodName) ?? [];

  return routeMetadata.map((route) => ({
    method: route.method,
    path: route.path,
    propertyKey: methodName,
    middlewares: [...methodMiddlewares]
  }));
};

export const scanController = <TInstance>(
  controllerClass: ControllerClass<TInstance>
): ControllerMetadata => {
  const prefix: string | undefined = Reflect.getMetadata(
    METADATA_KEYS.controllerPrefix,
    controllerClass
  );

  if (prefix === undefined) {
    throw new TypeError(
      `Controller "${controllerClass.name}" is missing @Controller() decorator.`
    );
  }

  const controllerMiddlewares: RequestHandler[] =
    Reflect.getMetadata(METADATA_KEYS.controllerMiddlewares, controllerClass) ?? [];

  const methods = listControllerMethods(controllerClass.prototype);
  const routes: RouteDefinition[] = methods.flatMap((methodName) =>
    toRouteDefinitions(controllerClass.prototype, methodName)
  );

  return {
    prefix,
    middlewares: [...controllerMiddlewares],
    routes
  };
};
