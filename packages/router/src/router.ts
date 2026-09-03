import "reflect-metadata";

import express from "express";

import { detectRouteCollisions } from "./collisions.js";
import { registerControllerRoutes } from "./route-registry.js";
import { scanController } from "./scanner.js";
import type { ControllerClass, CreateRouterOptions, RouterSource } from "./types.js";

const routeParameterNames = (path: string): Set<string> => {
  const names = new Set<string>();
  const pattern = /:([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(path)) !== null) {
    names.add(match[1] as string);
  }

  return names;
};

const verifyRouteParameters = (controllerMetadata: ReturnType<typeof scanController>): void => {
  for (const route of controllerMetadata.routes) {
    const available = routeParameterNames(route.path);

    for (const parameter of route.parameters) {
      if (parameter.source !== "params" || parameter.key === undefined) {
        continue;
      }

      if (!available.has(parameter.key)) {
        throw new TypeError(
          `Parameter "${parameter.key}" is not defined in route "${route.path}".`
        );
      }
    }
  }
};

const normalizePrefix = (prefix?: string): string | undefined => {
  if (!prefix) {
    return undefined;
  }

  const withLeadingSlash = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
};

const instantiateController = <TInstance>(
  controllerClass: ControllerClass<TInstance>
): TInstance => new controllerClass();

export const createRouter = ({
  controllers = [],
  routes = [],
  prefix,
  controllerFactory
}: CreateRouterOptions): express.Router => {
  const scannedControllers = controllers.map((controllerClass) => scanController(controllerClass));
  scannedControllers.forEach(verifyRouteParameters);
  const normalizedPrefix = normalizePrefix(prefix);
  detectRouteCollisions(scannedControllers, routes, normalizedPrefix ?? "");

  const coreRouter = express.Router();

  for (const [index, controllerClass] of controllers.entries()) {
    const metadata = scannedControllers[index];
    if (!metadata) {
      continue;
    }

    const instance = controllerFactory
      ? controllerFactory(controllerClass)
      : instantiateController(controllerClass);
    registerControllerRoutes(coreRouter as unknown as Record<string, unknown>, metadata, instance);
  }

  for (const routeRouter of routes) {
    const expressRouter = "toRouter" in routeRouter ? routeRouter.toRouter() : routeRouter;
    coreRouter.use(expressRouter as express.Router);
  }

  if (!normalizedPrefix) {
    return coreRouter;
  }

  const wrapper = express.Router();
  wrapper.use(normalizedPrefix, coreRouter);
  return wrapper;
};
