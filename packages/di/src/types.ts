import type { RouterSource } from "@sculptor/router";
import type { ControllerClass, Nxt, Req, Res } from "@sculptor/router";

export type ProviderToken<T = unknown> = new (...args: unknown[]) => T;

export type PackageToken<T = unknown> = Function;

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
  exports?: PackageToken[];
  controllers?: ControllerClass[];
  handlers?: PackageToken[];
  services?: PackageToken[];
  repositories?: PackageToken[];
  middlewares?: ProviderToken[];
  routes?: RouterSource[];
  customLinkedHelper?: {
    class?: PackageToken[];
    function?: PackageToken[];
  };
}

export interface PackageRuntimeDefinition extends Required<Omit<PackageDefinition, "imports">> {
  imports: PackageToken[];
}

export type SculptorFunctionalPackage = () => PackageDefinition;

export type SculptorFunctionalService<T = unknown> = () => T;

export type SculptorFunctionalRepository<T = unknown> = () => T;

export type SculptorFunctionalController<T = unknown> = () => T;

export type SculptorFunctionalHandler<T = unknown> = (
  req: Req,
  res: Res,
  next: Nxt
) => T | Promise<T>;

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
