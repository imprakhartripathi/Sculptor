import "reflect-metadata";

import { DI_METADATA_KEYS } from "./metadata.js";
import type {
  AutoInjectPropertyMetadata,
  AutoInjectParameterMetadata,
  ContainerValidationIssue,
  PackageRuntimeDefinition,
  ProviderDescriptor,
  ProviderToken
} from "./types.js";

const getOwnArrayMetadata = <T>(key: string, target: object, propertyKey?: string | symbol): T[] =>
  (propertyKey === undefined
    ? Reflect.getOwnMetadata(key, target)
    : Reflect.getOwnMetadata(key, target, propertyKey)) ?? [];

const getClassName = (token: ProviderToken): string => token.name || "AnonymousProvider";

const isProviderToken = (value: unknown): value is ProviderToken =>
  typeof value === "function";

const normalizeMetadataList = (
  metadata: Array<AutoInjectParameterMetadata | AutoInjectPropertyMetadata>
): Array<AutoInjectParameterMetadata | AutoInjectPropertyMetadata> =>
  [...metadata].sort((left, right) => {
    const leftIndex = "index" in left ? left.index : Number.MAX_SAFE_INTEGER;
    const rightIndex = "index" in right ? right.index : Number.MAX_SAFE_INTEGER;

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    const leftKey = "propertyKey" in left ? String(left.propertyKey) : "";
    const rightKey = "propertyKey" in right ? String(right.propertyKey) : "";
    return leftKey.localeCompare(rightKey);
  });

export class CircularDependencyError extends Error {
  override name = "CircularDependencyError";
}

export class MissingDependencyError extends Error {
  override name = "MissingDependencyError";
}

export interface ContainerOptions {
  validateOnBootstrap?: boolean;
}

export class Container {
  private readonly providers = new Map<ProviderToken, ProviderDescriptor>();
  private readonly cache = new Map<ProviderToken, unknown>();
  private readonly validationIssues: ContainerValidationIssue[] = [];

  register<T>(token: ProviderToken<T>, kind: ProviderDescriptor["kind"] = "service"): void {
    this.providers.set(token, { token, kind });
  }

  registerMany(tokens: ProviderToken[], kind: ProviderDescriptor["kind"]): void {
    for (const token of tokens) {
      this.register(token, kind);
    }
  }

  has(token: ProviderToken): boolean {
    return this.providers.has(token);
  }

  list(): ProviderDescriptor[] {
    return [...this.providers.values()];
  }

  resolve<T>(token: ProviderToken<T>): T {
    if (this.cache.has(token)) {
      return this.cache.get(token) as T;
    }

    const provider = this.providers.get(token);

    if (!provider) {
      throw new MissingDependencyError(`Missing dependency: ${getClassName(token)}`);
    }

    return this.instantiate(provider.token) as T;
  }

  validate(): ContainerValidationIssue[] {
    this.validationIssues.length = 0;
    const visited = new Set<ProviderToken>();

    for (const provider of this.providers.values()) {
      this.validateProvider(provider.token, [], visited);
    }

    return [...this.validationIssues];
  }

  private validateProvider(
    token: ProviderToken,
    stack: ProviderToken[],
    visited: Set<ProviderToken>
  ): void {
    if (visited.has(token)) {
      return;
    }

    if (stack.includes(token)) {
      this.validationIssues.push({
        token,
        reason: `Circular dependency detected: ${[...stack, token].map(getClassName).join(" -> ")}`
      });
      return;
    }

    const provider = this.providers.get(token);

    if (!provider) {
      this.validationIssues.push({
        token,
        reason: `Missing dependency: ${getClassName(token)}`
      });
      return;
    }

    const dependencies = this.getDependencyTokens(token);
    for (const dependency of dependencies) {
      if (!this.providers.has(dependency)) {
        this.validationIssues.push({
          token: dependency,
          reason: `Missing dependency: ${getClassName(dependency)}`
        });
        continue;
      }

      this.validateProvider(dependency, [...stack, token], visited);
    }

    visited.add(token);
  }

  private getDependencyTokens(token: ProviderToken): ProviderToken[] {
    const constructorParams = normalizeMetadataList(
      getOwnArrayMetadata<AutoInjectParameterMetadata>(DI_METADATA_KEYS.autoInjectConstructor, token)
    ) as AutoInjectParameterMetadata[];

    const propertyParams = normalizeMetadataList(
      getOwnArrayMetadata<AutoInjectPropertyMetadata>(DI_METADATA_KEYS.autoInjectProperty, token.prototype)
    ) as AutoInjectPropertyMetadata[];

    return [...constructorParams.map((entry) => entry.token), ...propertyParams.map((entry) => entry.token)];
  }

  private instantiate<T>(token: ProviderToken<T>): T {
    if (this.cache.has(token)) {
      return this.cache.get(token) as T;
    }

    const stack: ProviderToken[] = [];
    return this.instantiateWithStack(token, stack);
  }

  private instantiateWithStack<T>(token: ProviderToken<T>, stack: ProviderToken[]): T {
    if (this.cache.has(token)) {
      return this.cache.get(token) as T;
    }

    if (stack.includes(token)) {
      throw new CircularDependencyError(
        `Circular dependency detected: ${[...stack, token].map(getClassName).join(" -> ")}`
      );
    }

    const provider = this.providers.get(token);

    if (!provider) {
      throw new MissingDependencyError(`Missing dependency: ${getClassName(token)}`);
    }

    const constructorMetadata = getOwnArrayMetadata<AutoInjectParameterMetadata>(
      DI_METADATA_KEYS.autoInjectConstructor,
      token
    );
    const constructorLength = Math.max(
      0,
      ...constructorMetadata.map((entry) => entry.index + 1)
    );
    const args = Array.from({ length: constructorLength }, () => undefined) as unknown[];

    for (const entry of constructorMetadata) {
      args[entry.index] = this.instantiateWithStack(entry.token, [...stack, token]);
    }

    const instance = new token(...args);

    const propertyMetadata = getOwnArrayMetadata<AutoInjectPropertyMetadata>(
      DI_METADATA_KEYS.autoInjectProperty,
      token.prototype
    );

    for (const entry of propertyMetadata) {
      const dependency = this.instantiateWithStack(entry.token, [...stack, token]);
      Object.defineProperty(instance, entry.propertyKey, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: dependency
      });
    }

    this.cache.set(token, instance);
    return instance;
  }
}

export const createContainer = (
  providers: Array<{ token: ProviderToken; kind?: ProviderDescriptor["kind"] }>,
  options: ContainerOptions = {}
): Container => {
  const container = new Container();

  for (const provider of providers) {
    container.register(provider.token, provider.kind ?? "service");
  }

  if (options.validateOnBootstrap) {
    container.validate();
  }

  return container;
};

export const isRegisteredProvider = (value: unknown): value is ProviderToken =>
  isProviderToken(value);
