import type { PackageToken, ProviderToken } from "@sculptor/di";
import { createContainer, resolvePackageGraph, type Container } from "@sculptor/di";
import type { RequestHandler } from "express";
import type { ControllerClass, RouterSource } from "@sculptor/router";
import type { RegistryShape } from "./types.js";

export interface FlattenedRegistry {
  packages: PackageToken[];
  controllers: ControllerClass[];
  services: ProviderToken[];
  repositories: ProviderToken[];
  packageMiddlewares: ProviderToken[];
  middlewares: RequestHandler[];
  routes: RouterSource[];
  exports: ProviderToken[];
}

const dedupe = <T>(values: T[]): T[] => [...new Set(values)];

const normalizeRegistry = (registry: RegistryShape): Required<RegistryShape> => ({
  packages: registry.packages ?? [],
  controllers: registry.controllers ?? [],
  routes: registry.routes ?? [],
  services: registry.services ?? [],
  repositories: registry.repositories ?? [],
  middlewares: registry.middlewares ?? []
});

export const flattenRegistry = (registry: RegistryShape): FlattenedRegistry => {
  const normalized = normalizeRegistry(registry);
  const packageGraph =
    normalized.packages.length > 0
      ? resolvePackageGraph(normalized.packages)
      : { ordered: [], packagesByName: new Map<string, never>() };

  const controllers = [...normalized.controllers];
  const services = [...normalized.services];
  const repositories = [...normalized.repositories];
  const packageMiddlewares: ProviderToken[] = [];
  const middlewares = [...normalized.middlewares];
  const routes = [...normalized.routes];
  const exportsList: ProviderToken[] = [];

  for (const node of packageGraph.ordered) {
    const definition = node.definition;
    controllers.push(...(definition.controllers ?? []));
    services.push(...(definition.services ?? []));
    repositories.push(...(definition.repositories ?? []));
    packageMiddlewares.push(...(definition.middlewares ?? []));
    routes.push(...(definition.routes ?? []));
    exportsList.push(...(definition.exports ?? []));
  }

  return {
    packages: normalized.packages,
    controllers: dedupe(controllers),
    services: dedupe([...services, ...exportsList]),
    repositories: dedupe(repositories),
    middlewares: dedupe(middlewares),
    packageMiddlewares: dedupe(packageMiddlewares),
    routes,
    exports: dedupe(exportsList)
  };
};

export const createRuntimeContainer = (registry: RegistryShape): Container => {
  const flattened = flattenRegistry(registry);
  return createContainer([
    ...flattened.controllers.map((token) => ({ token, kind: "controller" as const })),
    ...flattened.services.map((token) => ({ token, kind: "service" as const })),
    ...flattened.repositories.map((token) => ({ token, kind: "repository" as const })),
    ...flattened.packageMiddlewares.map((token) => ({ token, kind: "middleware" as const })),
    ...flattened.exports.map((token) => ({ token, kind: "export" as const }))
  ]);
};

export const validateRuntimePackages = (registry: RegistryShape): void => {
  const normalized = normalizeRegistry(registry);
  if (normalized.packages.length === 0) {
    return;
  }

  resolvePackageGraph(normalized.packages);
};
