import type { Router } from "express";

import type { ControllerMetadata, FunctionalRouterLike, RouteDefinition } from "./types.js";
import type { RouterSource } from "./types.js";
import { RouteCollisionError } from "./errors.js";

export interface RegisteredRouteEntry {
  method: string;
  path: string;
  source: string;
}

const SCULPTOR_SOURCE_KEY = Symbol.for("sculptor:router:source");

const normalizePath = (segment: string): string => {
  if (!segment) {
    return "/";
  }

  const withLeadingSlash = segment.startsWith("/") ? segment : `/${segment}`;
  return withLeadingSlash === "/" ? "/" : withLeadingSlash.replace(/\/+$/, "");
};

const joinPaths = (prefix: string, path: string): string => {
  const normalizedPrefix = normalizePath(prefix);
  const normalizedPath = normalizePath(path);

  if (normalizedPath === "/") {
    return normalizedPrefix;
  }

  if (normalizedPrefix === "/") {
    return normalizedPath;
  }

  return `${normalizedPrefix}${normalizedPath}`;
};

const toRouteLabel = (
  controllerName: string,
  route: RouteDefinition
): string => route.source?.label ?? `${controllerName}.${route.propertyKey}()`;

const toRouterLabel = (router: Router): string => {
  const source = (router as unknown as Record<PropertyKey, unknown>)[SCULPTOR_SOURCE_KEY];
  if (typeof source === "string" && source.trim()) {
    return source;
  }

  return "functional router";
};

const isFunctionalRouterLike = (value: RouterSource): value is FunctionalRouterLike =>
  typeof (value as { toRouter?: unknown }).toRouter === "function" &&
  typeof (value as { use?: unknown }).use === "function";

const collectRouterRoutes = (router: Router, label: string): RegisteredRouteEntry[] => {
  const stack = ((router as unknown as { stack?: Array<Record<string, unknown>> }).stack ?? []) as Array<
    Record<string, unknown>
  >;
  const entries: RegisteredRouteEntry[] = [];

  for (const layer of stack) {
    const route = layer.route as
      | { path?: string | string[]; methods?: Record<string, boolean> }
      | undefined;

    if (route) {
      const paths = Array.isArray(route.path)
        ? route.path
        : [route.path ?? "/"];
      const methods = Object.keys(route.methods ?? {}).filter((method) => route.methods?.[method]);

      for (const method of methods) {
        for (const path of paths) {
          entries.push({
            method,
            path: normalizePath(String(path ?? "/")),
            source: label
          });
        }
      }
      continue;
    }

    const childRouter = layer.handle as Router | undefined;

    if (
      childRouter &&
      typeof (childRouter as unknown as Record<string, unknown>).stack !== "undefined"
    ) {
      entries.push(...collectRouterRoutes(childRouter, label));
    }
  }

  return entries;
};

export const createRegisteredRouteEntries = (
  controllerMetadata: ControllerMetadata[],
  routeRouters: RouterSource[],
  appPrefix = ""
): RegisteredRouteEntry[] => {
  const entries: RegisteredRouteEntry[] = [];

  for (const metadata of controllerMetadata) {
    for (const route of metadata.routes) {
      entries.push({
        method: route.method,
        path: joinPaths(appPrefix, joinPaths(metadata.prefix, route.path)),
        source: toRouteLabel(metadata.controllerName, route)
      });
    }
  }

  for (const router of routeRouters) {
    const expressRouter = isFunctionalRouterLike(router) ? router.toRouter() : router;
    entries.push(
      ...collectRouterRoutes(expressRouter, toRouterLabel(expressRouter)).map((entry) => ({
        ...entry,
        path: joinPaths(appPrefix, entry.path)
      }))
    );
  }

  return entries;
};

export const detectRouteCollisions = (
  controllerMetadata: ControllerMetadata[],
  routeRouters: RouterSource[],
  appPrefix = ""
): void => {
  const seen = new Map<string, RegisteredRouteEntry>();

  for (const entry of createRegisteredRouteEntries(controllerMetadata, routeRouters, appPrefix)) {
    const key = `${entry.method.toLowerCase()} ${entry.path}`;
    const previous = seen.get(key);

    if (!previous) {
      seen.set(key, entry);
      continue;
    }

    throw new RouteCollisionError({
      method: entry.method,
      path: entry.path,
      registrations: [{ label: previous.source }, { label: entry.source }]
    });
  }
};

export const registerRouterSource = (router: Router, source: string): void => {
  if (!source) {
    return;
  }

  Object.defineProperty(router as unknown as Record<PropertyKey, unknown>, SCULPTOR_SOURCE_KEY, {
    configurable: true,
    enumerable: false,
    value: source,
    writable: false
  });
};
