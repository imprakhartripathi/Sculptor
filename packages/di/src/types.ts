import type { RouterSource } from "@sculptor/router";
import type { ControllerClass } from "@sculptor/router";

export type ProviderToken<T = unknown> = new (...args: unknown[]) => T;

export type PackageToken<T = unknown> = new (...args: unknown[]) => T;

export interface AutoInjectMetadata {
  token: ProviderToken;
}

export interface AutoInjectPropertyMetadata extends AutoInjectMetadata {
  propertyKey: string | symbol;
}

export interface AutoInjectParameterMetadata extends AutoInjectMetadata {
  index: number;
}

export interface PackageDefinition {
  name: string;
  path: string;
  imports?: PackageToken[];
  exports?: ProviderToken[];
  controllers?: ControllerClass[];
  services?: ProviderToken[];
  repositories?: ProviderToken[];
  middlewares?: ProviderToken[];
  routes?: RouterSource[];
}

export interface PackageRuntimeDefinition extends Required<Omit<PackageDefinition, "imports">> {
  imports: PackageToken[];
}

export interface ProviderRegistration<T = unknown> {
  token: ProviderToken<T>;
  kind: "service" | "repository" | "middleware" | "controller" | "export";
}

export interface ProviderDescriptor<T = unknown> {
  token: ProviderToken<T>;
  kind: ProviderRegistration["kind"];
}

export interface ContainerValidationIssue {
  token: ProviderToken;
  reason: string;
}
