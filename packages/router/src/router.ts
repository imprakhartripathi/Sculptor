import "reflect-metadata";

import express from "express";

import { registerControllerRoutes } from "./route-registry.js";
import { scanController } from "./scanner.js";
import type { ControllerClass, CreateRouterOptions } from "./types.js";

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
  prefix
}: CreateRouterOptions): express.Router => {
  const coreRouter = express.Router();

  for (const controllerClass of controllers) {
    const metadata = scanController(controllerClass);
    const instance = instantiateController(controllerClass);
    registerControllerRoutes(coreRouter as unknown as Record<string, unknown>, metadata, instance);
  }

  for (const routeRouter of routes) {
    coreRouter.use(routeRouter);
  }

  const normalizedPrefix = normalizePrefix(prefix);

  if (!normalizedPrefix) {
    return coreRouter;
  }

  const wrapper = express.Router();
  wrapper.use(normalizedPrefix, coreRouter);
  return wrapper;
};
