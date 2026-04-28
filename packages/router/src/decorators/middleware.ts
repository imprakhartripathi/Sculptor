import "reflect-metadata";

import type { RequestHandler } from "express";

import { METADATA_KEYS } from "../metadata.js";

type ClassTarget = abstract new (...args: never[]) => object;
type MiddlewareInput = RequestHandler | RequestHandler[];
type MiddlewareDecoratorTarget = object | ClassTarget;

const flattenMiddlewares = (middlewares: MiddlewareInput[]): RequestHandler[] =>
  middlewares.flatMap((middleware) =>
    Array.isArray(middleware) ? middleware : [middleware]
  );

const appendClassMiddlewares = (
  target: ClassTarget,
  middlewares: RequestHandler[]
): void => {
  const existing: RequestHandler[] =
    Reflect.getOwnMetadata(METADATA_KEYS.controllerMiddlewares, target) ?? [];

  Reflect.defineMetadata(
    METADATA_KEYS.controllerMiddlewares,
    [...existing, ...middlewares],
    target
  );
};

const appendMethodMiddlewares = (
  target: object,
  propertyKey: string | symbol,
  middlewares: RequestHandler[]
): void => {
  const existing: RequestHandler[] =
    Reflect.getOwnMetadata(METADATA_KEYS.methodMiddlewares, target, propertyKey) ?? [];

  Reflect.defineMetadata(
    METADATA_KEYS.methodMiddlewares,
    [...existing, ...middlewares],
    target,
    propertyKey
  );
};

export const Use =
  (...middlewares: MiddlewareInput[]): ClassDecorator & MethodDecorator =>
  (target: MiddlewareDecoratorTarget, propertyKey?: string | symbol): void => {
    const resolvedMiddlewares = flattenMiddlewares(middlewares);

    if (propertyKey === undefined) {
      appendClassMiddlewares(target as ClassTarget, resolvedMiddlewares);
      return;
    }

    appendMethodMiddlewares(target as object, propertyKey, resolvedMiddlewares);
  };
