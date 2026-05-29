import path from "node:path";

import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response, Router } from "express";

export type ScaffoldMode = "decorator" | "functional" | "hybrid";
export type DevServer = "tsx" | "nodemon";
export type GenerateKind =
  | "controller"
  | "service"
  | "repository"
  | "dto"
  | "module"
  | "middleware"
  | "type"
  | "route"
  | "pkg";
export type TypeVariant = "type" | "interface" | "class" | "enum";
export type TestingFramework = "vitest";

export interface TestingMetadata {
  generate: boolean;
  framework: TestingFramework;
}

export interface ScaffoldProjectMetadata {
  appName: string;
  version: string;
  mode: ScaffoldMode;
  frameworkLock: boolean;
  devServer: DevServer;
  testing: TestingMetadata;
}

export const toPascalCase = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

export const toCamelCase = (value: string): string => {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

export const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export const normalizeRelativePath = (value: string): string =>
  value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");

export const resolveFileStem = (name: string | undefined, outputDir: string): string => {
  if (name) {
    return name;
  }

  const trimmedDir = normalizeRelativePath(outputDir);
  const parts = trimmedDir.split("/").filter(Boolean);
  const inferred = parts[parts.length - 1];
  return inferred ?? "index";
};

export const controllerFileName = (name: string): string => `${name}.controller.ts`;
export const serviceFileName = (name: string): string => `${name}.service.ts`;
export const moduleFileName = (name: string): string => `${name}.module.ts`;
export const middlewareFileName = (name: string): string => `${name}.middleware.ts`;
export const routeFileName = (name: string): string => `${name}.route.ts`;
export const routeHandlerFileName = (name: string): string => `${name}.route.handler.ts`;
export const typeFileName = (name: string, variant: TypeVariant): string => {
  const suffix = variant === "type" ? "type" : variant;
  return `${name}.${suffix}.ts`;
};

export const specFileName = (name: string, suffix: string): string => `${name}.${suffix}.spec.ts`;

export const toRoutePath = (value: string): string => {
  const kebab = toKebabCase(value);

  if (kebab.endsWith("y") && !/[aeiou]y$/.test(kebab)) {
    return `${kebab.slice(0, -1)}ies`;
  }

  if (/(s|x|z|ch|sh)$/.test(kebab)) {
    return `${kebab}es`;
  }

  return `${kebab}s`;
};

export const specImportPath = (sourcePath: string): string =>
  normalizeRelativePath(path.posix.relative("src/tests", sourcePath)).replace(/\.ts$/, ".js");

export const resolveGeneratorOutputDir = (
  kind: GenerateKind,
  outputDir?: string,
  name?: string
): string => {
  if (outputDir) {
    return normalizeRelativePath(outputDir);
  }

  switch (kind) {
    case "pkg":
      return normalizeRelativePath("src");
    case "controller":
      return "src/app/controllers";
    case "service":
      return "src/app/services";
    case "repository":
      return "src/app/repositories";
    case "dto":
      return "src/app/dtos";
    case "module":
      return "src/app/modules";
    case "middleware":
      return "src/app/middlewares";
    case "type":
      return "src/app/types";
    case "route":
      return "src/app/routes";
  }
};

export const devScriptFor = (devServer: DevServer): string =>
  devServer === "tsx"
    ? "tsx src/main.ts"
    : "nodemon --watch src --ext ts --exec tsx src/main.ts";

export const devDependenciesFor = (devServer: DevServer): string =>
  devServer === "tsx"
    ? ""
    : `    "nodemon": "^3.1.9",\n`;

export type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response, Router };
