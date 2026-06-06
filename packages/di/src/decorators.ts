import "reflect-metadata";

import type { RouterSource } from "@sculptor/router";

import { DI_METADATA_KEYS } from "./metadata.js";
import type {
  AutoInjectMetadata,
  AutoInjectParameterMetadata,
  AutoInjectPropertyMetadata,
  PackageDefinition,
  PackageToken,
  ProviderToken
} from "./types.js";

const appendMetadata = <T>(
  key: string,
  target: object,
  value: T,
  propertyKey?: string | symbol
): void => {
  const existing: T[] = propertyKey === undefined
    ? (Reflect.getOwnMetadata(key, target) ?? [])
    : (Reflect.getOwnMetadata(key, target, propertyKey) ?? []);

  if (propertyKey === undefined) {
    Reflect.defineMetadata(key, [...existing, value], target);
    return;
  }

  Reflect.defineMetadata(key, [...existing, value], target, propertyKey);
};

const markProvider = (target: ProviderToken, key: string): void => {
  Reflect.defineMetadata(key, true, target);
};

export const Service = (): ClassDecorator => (target) => {
  markProvider(target as unknown as ProviderToken, DI_METADATA_KEYS.service);
};

export const Repository = (): ClassDecorator => (target) => {
  markProvider(target as unknown as ProviderToken, DI_METADATA_KEYS.repository);
};

export const Middleware = (): ClassDecorator => (target) => {
  markProvider(target as unknown as ProviderToken, DI_METADATA_KEYS.middleware);
};

export const AutoInject =
  (token: ProviderToken): ParameterDecorator & PropertyDecorator =>
  (target: object, propertyKeyOrIndex: string | symbol | undefined, parameterIndex?: number): void => {
    if (typeof parameterIndex === "number") {
      appendMetadata<AutoInjectParameterMetadata>(
        DI_METADATA_KEYS.autoInjectConstructor,
        target,
        { token, index: parameterIndex }
      );
      return;
    }

    if (typeof propertyKeyOrIndex === "string" || typeof propertyKeyOrIndex === "symbol") {
      appendMetadata<AutoInjectPropertyMetadata>(
        DI_METADATA_KEYS.autoInjectProperty,
        target,
        { token, propertyKey: propertyKeyOrIndex }
      );
    }
  };

export const Package =
  (definition: PackageDefinition) =>
  <T extends PackageToken>(target: T): T => {
    Reflect.defineMetadata(DI_METADATA_KEYS.package, definition, target);
    return target;
  };

export const getPackageDefinition = (token: PackageToken): PackageDefinition | undefined =>
  Reflect.getMetadata(DI_METADATA_KEYS.package, token) as PackageDefinition | undefined;

export const getProviderKind = (
  token: ProviderToken
): "service" | "repository" | "middleware" | undefined => {
  if (Reflect.getMetadata(DI_METADATA_KEYS.service, token)) {
    return "service";
  }

  if (Reflect.getMetadata(DI_METADATA_KEYS.repository, token)) {
    return "repository";
  }

  if (Reflect.getMetadata(DI_METADATA_KEYS.middleware, token)) {
    return "middleware";
  }

  return undefined;
};

export const getAutoInjectMetadata = (
  target: object,
  propertyKey?: string | symbol
): AutoInjectMetadata[] =>
  propertyKey === undefined
    ? (Reflect.getOwnMetadata(DI_METADATA_KEYS.autoInjectConstructor, target) ?? [])
    : (Reflect.getOwnMetadata(DI_METADATA_KEYS.autoInjectProperty, target, propertyKey) ?? []);

export const getPackageImports = (definition: PackageDefinition): PackageToken[] =>
  definition.imports ?? [];

export const getPackageRoutes = (definition: PackageDefinition): RouterSource[] =>
  definition.routes ?? [];
