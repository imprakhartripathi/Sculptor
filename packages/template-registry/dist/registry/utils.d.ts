import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response, Router } from "express";
export type ScaffoldMode = "decorator" | "functional" | "hybrid";
export type DevServer = "tsx" | "nodemon";
export type GenerateKind = "controller" | "service" | "repository" | "dto" | "module" | "middleware" | "type" | "route" | "pkg";
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
export declare const toPascalCase: (value: string) => string;
export declare const toCamelCase: (value: string) => string;
export declare const toKebabCase: (value: string) => string;
export declare const normalizeRelativePath: (value: string) => string;
export declare const resolveFileStem: (name: string | undefined, outputDir: string) => string;
export declare const controllerFileName: (name: string) => string;
export declare const serviceFileName: (name: string) => string;
export declare const moduleFileName: (name: string) => string;
export declare const middlewareFileName: (name: string) => string;
export declare const routeFileName: (name: string) => string;
export declare const routeHandlerFileName: (name: string) => string;
export declare const typeFileName: (name: string, variant: TypeVariant) => string;
export declare const specFileName: (name: string, suffix: string) => string;
export declare const toRoutePath: (value: string) => string;
export declare const specImportPath: (sourcePath: string) => string;
export declare const resolveGeneratorOutputDir: (kind: GenerateKind, outputDir?: string, name?: string) => string;
export declare const devScriptFor: (devServer: DevServer) => string;
export declare const devDependenciesFor: (devServer: DevServer) => string;
export type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response, Router };
