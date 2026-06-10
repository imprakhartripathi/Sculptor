import fs from "node:fs";
import path from "node:path";

import { ensureDir, writeTextFile } from "../fs.js";
import {
  normalizeRelativePath,
  resolveFileStem,
  resolveGeneratorOutputDir,
  ScaffoldMode,
  DevServer,
  GenerateKind,
  ScaffoldProjectMetadata,
  TestingMetadata,
  TypeVariant
} from "./utils.js";
import {
  appTsconfigTemplate,
  eslintConfigTemplate,
  healthControllerTemplate,
  healthControllerSpecTemplate,
  healthDtoTemplate,
  healthPackageIndexTemplate,
  healthFunctionalRepositoryTemplate,
  healthFunctionalRouteHandlerTemplate,
  healthFunctionalRouteTemplate,
  healthFunctionalServiceTemplate,
  healthRepositoryTemplate,
  healthRouteSpecTemplate,
  healthRouteTemplate,
  healthRouteHandlerTemplate,
  healthServiceTemplate,
  healthTypesTemplate,
  mainSpecTemplate,
  mainTemplate,
  rootGitignoreTemplate,
  propsTemplate,
  registryTemplate,
  rootPackageJsonTemplate,
  rootReadmeTemplate,
  rootTsconfigTemplate,
  sculptorTemplate,
  testHarnessSpecTemplate,
  testRegistryTemplate,
  testRunnerTemplate,
  vitestConfigTemplate
} from "./templates/scaffold.js";
import {
  controllerSpecTemplate,
  createDecoratorController,
  createPackageResource,
  createFunctionalArtifacts,
  createFunctionalRepositoryResource,
  createFunctionalServiceResource,
  createMiddlewareResource,
  createModuleResource,
  createRepositoryResource,
  createDtoResource,
  createRouteResource,
  createServiceResource,
  createTypeResource,
  middlewareSpecTemplate,
  routeSpecTemplate,
  serviceSpecTemplate
} from "./templates/resources.js";
import {
  controllerHelp,
  generateHelp,
  middlewareHelp,
  moduleHelp,
  routeHelp,
  typeHelp
} from "./templates/help.js";

export type { ScaffoldMode, DevServer, GenerateKind, TypeVariant } from "./utils.js";
export type { TestingMetadata, ScaffoldProjectMetadata } from "./utils.js";
export { controllerHelp, generateHelp, middlewareHelp, moduleHelp, routeHelp, typeHelp };

const collectSpecPaths = (dir: string, rootDir: string = dir): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const specs: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      specs.push(...collectSpecPaths(fullPath, rootDir));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".spec.ts")) {
      continue;
    }

    const relativePath = normalizeRelativePath(path.relative(rootDir, fullPath));
    if (["registry.ts", "runner.ts", "runner.spec.ts"].includes(relativePath)) {
      continue;
    }

    specs.push(`./${relativePath.replace(/\.ts$/, ".js")}`);
  }

  return specs.sort();
};

export const syncTestHarness = (targetDir: string): void => {
  const testsDir = path.join(targetDir, "src", "tests");
  ensureDir(testsDir);
  const specs = collectSpecPaths(testsDir);

  writeTextFile(path.join(testsDir, "registry.ts"), testRegistryTemplate(specs));
  writeTextFile(path.join(testsDir, "runner.ts"), testRunnerTemplate());
  writeTextFile(path.join(testsDir, "runner.spec.ts"), testHarnessSpecTemplate());
};

const appShellFiles = (metadata: ScaffoldProjectMetadata): Record<string, string> => ({
  "package.json": rootPackageJsonTemplate(metadata.appName, metadata.version, metadata.devServer),
  "README.md": rootReadmeTemplate(metadata.appName),
  "tsconfig.json": rootTsconfigTemplate,
  "sculptor.json": sculptorTemplate(
    metadata.mode,
    metadata.devServer,
    metadata.frameworkLock,
    metadata.testing
  ),
  "props.json": propsTemplate,
  "src/main.ts": mainTemplate,
  "src/registry.ts": registryTemplate(metadata.mode)
});

export const scaffoldProject = (
  metadata: ScaffoldProjectMetadata,
  targetDir: string
): void => {
  ensureDir(targetDir);

  const rootFiles: Record<string, string> = {
    ...appShellFiles(metadata),
    "eslint.config.js": eslintConfigTemplate,
    "vitest.config.ts": vitestConfigTemplate,
    ".gitignore": rootGitignoreTemplate,
    "src/app/health/health.types.ts": healthTypesTemplate
  };

  rootFiles["src/app/health/index.ts"] = healthPackageIndexTemplate(metadata.mode);

  if (metadata.mode === "decorator" || metadata.mode === "hybrid") {
    rootFiles["src/app/health/health.controller.ts"] = healthControllerTemplate;
    rootFiles["src/app/health/health.service.ts"] = healthServiceTemplate;
    rootFiles["src/app/health/health.repository.ts"] = healthRepositoryTemplate;
    rootFiles["src/app/health/health.dto.ts"] = healthDtoTemplate;
  }

  if (metadata.mode === "functional" || metadata.mode === "hybrid") {
    rootFiles["src/app/health/health.service.ts"] =
      metadata.mode === "functional" ? healthFunctionalServiceTemplate : healthServiceTemplate;
    rootFiles["src/app/health/health.repository.ts"] =
      metadata.mode === "functional" ? healthFunctionalRepositoryTemplate : healthRepositoryTemplate;
    rootFiles["src/app/health/health.route.ts"] =
      metadata.mode === "functional" ? healthFunctionalRouteTemplate : healthRouteTemplate;
    rootFiles["src/app/health/health.route.handler.ts"] =
      metadata.mode === "functional" ? healthFunctionalRouteHandlerTemplate : healthRouteHandlerTemplate;
  }

  if (metadata.testing.generate) {
    rootFiles["src/tests/main.spec.ts"] = mainSpecTemplate;

    if (metadata.mode === "decorator" || metadata.mode === "hybrid") {
      rootFiles["src/tests/health.controller.spec.ts"] = healthControllerSpecTemplate;
    }

    if (metadata.mode === "functional" || metadata.mode === "hybrid") {
      rootFiles["src/tests/health.route.spec.ts"] = healthRouteSpecTemplate(metadata.mode);
    }
  }

  for (const [relativePath, content] of Object.entries(rootFiles)) {
    writeTextFile(path.join(targetDir, relativePath), content);
  }

  if (metadata.testing.generate) {
    syncTestHarness(targetDir);
  }
};

export const generateResourceFiles = (
  kind: GenerateKind,
  name: string,
  mode: ScaffoldMode,
  _devServer: DevServer = "tsx",
  outputDir?: string,
  typeVariant: TypeVariant = "type",
  functionalRoutes = false,
  testingGenerate = false
): Record<string, string> => {
  const resolvedOutputDir = resolveGeneratorOutputDir(kind, outputDir, name);
  const resolvedName = resolveFileStem(name, resolvedOutputDir);
  const sourceFiles: Record<string, string> = {};
  const functionalMode = mode === "functional" || functionalRoutes;

  switch (kind) {
    case "pkg":
      Object.assign(sourceFiles, createPackageResource(resolvedName, resolvedOutputDir, functionalMode ? "functional" : mode));
      break;
    case "controller":
      if (functionalMode) {
        Object.assign(sourceFiles, createFunctionalArtifacts(resolvedName));
      } else {
        Object.assign(sourceFiles, createDecoratorController(resolvedName, resolvedOutputDir));
      }
      if (functionalRoutes && !functionalMode) {
        Object.assign(sourceFiles, createFunctionalArtifacts(resolvedName));
      }
      break;
    case "service":
      Object.assign(
        sourceFiles,
        functionalMode ? createFunctionalServiceResource(resolvedName) : {
          [`${resolvedOutputDir}/${
            resolvedName
          }.service.ts`]: createServiceResource(resolvedName)[`src/app/services/${resolvedName}.service.ts`]
        }
      );
      break;
    case "repository":
      Object.assign(
        sourceFiles,
        functionalMode ? createFunctionalRepositoryResource(resolvedName) : {
          [`${resolvedOutputDir}/${
            resolvedName
          }.repository.ts`]: createRepositoryResource(resolvedName)[
            `src/app/repositories/${resolvedName}.repository.ts`
          ]
        }
      );
      break;
    case "dto":
      Object.assign(sourceFiles, {
        [`${resolvedOutputDir}/${resolvedName}.dto.ts`]: createDtoResource(resolvedName)[
          `src/app/dtos/${resolvedName}.dto.ts`
        ]
      });
      break;
    case "module":
      Object.assign(sourceFiles, {
        [`${resolvedOutputDir}/${
          resolvedName
        }.module.ts`]: createModuleResource(resolvedName)[`src/app/modules/${resolvedName}.module.ts`]
      });
      break;
    case "middleware":
      Object.assign(sourceFiles, {
        [`${resolvedOutputDir}/${
          resolvedName
        }.middleware.ts`]: createMiddlewareResource(resolvedName)[
          `src/app/middlewares/${resolvedName}.middleware.ts`
        ]
      });
      break;
    case "type":
      Object.assign(sourceFiles, createTypeResource(resolvedName, typeVariant, resolvedOutputDir));
      break;
    case "route":
      Object.assign(sourceFiles, createRouteResource(resolvedName, resolvedOutputDir));
      break;
  }

  if (!testingGenerate) {
    return sourceFiles;
  }

  const testFiles: Record<string, string> = {};
  for (const [filePath] of Object.entries(sourceFiles)) {
    const normalizedPath = normalizeRelativePath(filePath);
    const baseName = path.posix.basename(normalizedPath, ".ts");

    if (normalizedPath.endsWith(".controller.ts")) {
      const resourceName = baseName.replace(/\.controller$/, "");
      testFiles[`src/tests/${resourceName}.controller.spec.ts`] =
        controllerSpecTemplate(resourceName, normalizedPath);
      continue;
    }

    if (normalizedPath.endsWith(".service.ts")) {
      const resourceName = baseName.replace(/\.service$/, "");
      testFiles[`src/tests/${resourceName}.service.spec.ts`] =
        serviceSpecTemplate(resourceName, normalizedPath);
      continue;
    }

    if (normalizedPath.endsWith(".route.ts")) {
      const resourceName = baseName.replace(/\.route$/, "");
      testFiles[`src/tests/${resourceName}.route.spec.ts`] =
        routeSpecTemplate(resourceName, normalizedPath);
      continue;
    }

    if (normalizedPath.endsWith(".middleware.ts")) {
      const resourceName = baseName.replace(/\.middleware$/, "");
      testFiles[`src/tests/${resourceName}.middleware.spec.ts`] =
        middlewareSpecTemplate(resourceName, normalizedPath);
    }
  }

  return { ...sourceFiles, ...testFiles };
};

export const writeGeneratedFiles = (
  targetDir: string,
  files: Record<string, string>
): void => {
  for (const [relativePath, content] of Object.entries(files)) {
    writeTextFile(path.join(targetDir, relativePath), content);
  }
};

export const readModeFromFlags = (
  flags: string[],
  fallback: ScaffoldMode
): ScaffoldMode => {
  if (flags.some((flag) => ["--functional", "-f", "-fun", "--fun"].includes(flag))) {
    return "functional";
  }

  if (flags.includes("--decorator")) {
    return "decorator";
  }

  if (flags.includes("--hybrid")) {
    return "hybrid";
  }

  return fallback;
};

export const parseGenerateMode = (mode: string | undefined, fallback: ScaffoldMode): ScaffoldMode =>
  mode === "functional" || mode === "decorator" || mode === "hybrid" ? mode : fallback;
