import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeTextFile } from "./fs.js";
const toPascalCase = (value) => value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
const toCamelCase = (value) => {
    const pascal = toPascalCase(value);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};
const toKebabCase = (value) => value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
const normalizeRelativePath = (value) => value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
const resolveFileStem = (name, outputDir) => {
    if (name) {
        return name;
    }
    const trimmedDir = normalizeRelativePath(outputDir);
    const parts = trimmedDir.split("/").filter(Boolean);
    const inferred = parts[parts.length - 1];
    return inferred ?? "index";
};
const controllerFileName = (name) => `${name}.controller.ts`;
const serviceFileName = (name) => `${name}.service.ts`;
const moduleFileName = (name) => `${name}.module.ts`;
const middlewareFileName = (name) => `${name}.middleware.ts`;
const routeFileName = (name) => `${name}.routes.ts`;
const typeFileName = (name, variant) => {
    const suffix = variant === "type" ? "type" : variant;
    return `${name}.${suffix}.ts`;
};
const specFileName = (name, suffix) => `${name}.${suffix}.spec.ts`;
const specImportPath = (sourcePath) => normalizeRelativePath(path.posix.relative("src/tests", sourcePath)).replace(/\.ts$/, ".js");
const resolveGeneratorOutputDir = (kind, outputDir) => {
    if (outputDir) {
        return normalizeRelativePath(outputDir);
    }
    switch (kind) {
        case "controller":
            return "src/app/controllers";
        case "service":
            return "src/app/services";
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
const devScriptFor = (devServer) => devServer === "tsx"
    ? "tsx src/main.ts"
    : "nodemon --watch src --ext ts --exec tsx src/main.ts";
const devDependenciesFor = (devServer) => devServer === "tsx"
    ? ""
    : `    "nodemon": "^3.1.9",\n`;
const rootPackageJsonTemplate = (appName, version, devServer) => `{
  "name": "${toKebabCase(appName)}",
  "version": "${version}",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/main.ts",
    "dev": "${devScriptFor(devServer)}",
    "build": "tsc -p tsconfig.json",
    "lint": "eslint . --ext .ts",
    "test": "sc test"
  },
  "dependencies": {
    "express": "^4.21.2",
    "reflect-metadata": "^0.2.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.23",
    "@types/node": "^22.15.3",
    "@types/supertest": "^6.0.3",
    "@typescript-eslint/eslint-plugin": "^8.30.1",
    "@typescript-eslint/parser": "^8.30.1",
    "eslint": "^9.20.0",
${devDependenciesFor(devServer)}
    "supertest": "^7.1.0",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3",
    "vitest": "^2.1.8"
  }
}`;
const rootReadmeTemplate = (appName) => `# ${appName}

## Scripts

- \`npm run start\` - start the app
- \`npm run dev\` - start the app in development mode
- \`npm run build\` - compile the app
- \`npm run lint\` - lint the source
- \`npm run test\` - run the test suite through \`sc test\`

## Logging

The scaffold includes \`@sculptor/paws\` and turns logging on by default.

- \`logging.enabled\` controls whether anything prints
- \`logging.dogMode\` toggles dog personalities vs standard labels

The default scaffold boots in dog mode so the logger is visible immediately.

## Test Harness

The scaffold generates a Vitest registry under \`src/tests\`:

- \`src/tests/registry.ts\` collects generated spec entrypoints
- \`src/tests/runner.ts\` imports the registry entries
- \`src/tests/runner.spec.ts\` is the Vitest entrypoint used by \`sc test\`

When you add new specs under \`src/tests\`, rerun \`sc test\` and the harness will pick them up.
`;
const rootTsconfigTemplate = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2020"],
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}`;
const sculptorTemplate = (mode, devServer, frameworkLock, testing) => `{
  "project": {
    "srcRoot": "src",
    "entryFile": "main.ts",
    "devServer": "${devServer}"
  },
  "logging": {
    "enabled": true,
    "dogMode": true
  },
  "routing": {
    "style": "${mode}"
  },
  "testing": {
    "generate": ${testing.generate ? "true" : "false"},
    "framework": "${testing.framework}"
  },
  "frameworkLock": ${frameworkLock ? "true" : "false"}
}`;
const eslintConfigTemplate = `import parser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    ignores: ["dist/**", "node_modules/**"]
  }
];
`;
const vitestConfigTemplate = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true
  }
});
`;
const mainSpecTemplate = `import type { Server } from "node:http";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { startApp } from "@sculptor/core";
import { registry } from "../registry.js";

describe("app bootstrap", () => {
  let server: Server | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();

    if (!server) {
      return;
    }

    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    server = undefined;
  });

  it("starts the application", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    server = await startApp({
      registry,
      rootDir: fileURLToPath(new URL("../..", import.meta.url)),
      port: 0
    });

    expect(logs.join("\\n")).toContain("Local: http://localhost:");
  });
});
`;
const appTsconfigTemplate = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2020"],
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}`;
const propsTemplate = `{
  "app": {
    "port": 3000,
    "prefix": "/api"
  }
}`;
const mainTemplate = `import { paws } from "@sculptor/paws";
import { startApp } from "@sculptor/core";
import { fileURLToPath } from "node:url";
import { registry } from "./registry.js";

const appRoot = fileURLToPath(new URL("..", import.meta.url));

process.env.SCULPTOR_ROOT_DIR = appRoot;
paws.boot();

void startApp({ registry, rootDir: appRoot });
`;
const registryTemplate = (mode) => {
    if (mode === "decorator") {
        return `import { HealthController } from "./app/controllers/health.controller.js";

export const registry = {
  controllers: [HealthController],
  routes: [],
  services: []
};
`;
    }
    if (mode === "functional") {
        return `import { healthRoutes } from "./app/routes/health.routes.js";

export const registry = {
  controllers: [],
  routes: [healthRoutes],
  services: []
};
`;
    }
    return `import { HealthController } from "./app/controllers/health.controller.js";
import { healthRoutes } from "./app/routes/health.routes.js";

export const registry = {
  controllers: [HealthController],
  routes: [healthRoutes],
  services: []
};
`;
};
const healthControllerTemplate = `import { Controller, Get } from "@sculptor/core";

@Controller("/health")
export class HealthController {
  @Get("/")
  health() {
    return { status: "ok" };
  }

  @Get("/ping")
  ping() {
    return { message: "pong" };
  }
}
`;
const healthRoutesTemplate = `import { Router } from "express";

const sculptorSource = Symbol.for("sculptor:router:source");

export const healthRoutes = Router();

Object.defineProperty(healthRoutes, sculptorSource, {
  value: "health.routes.ts"
});

healthRoutes.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

healthRoutes.get("/ping", (_req, res) => {
  res.json({ message: "pong" });
});
`;
const healthServiceTemplate = `export class HealthService {
  status() {
    return { status: "ok" };
  }
}
`;
const healthModuleTemplate = `export class HealthModule {}
`;
const healthControllerSpecTemplate = `import { describe, expect, it } from "vitest";

import { HealthController } from "../app/controllers/health.controller.js";

describe("HealthController", () => {
  it("returns the expected health payload", () => {
    const controller = new HealthController();

    expect(controller.health()).toEqual({ status: "ok" });
    expect(controller.ping()).toEqual({ message: "pong" });
  });
});
`;
const healthRoutesSpecTemplate = `import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { healthRoutes } from "../app/routes/health.routes.js";

describe("healthRoutes", () => {
  it("serves the health endpoint", async () => {
    const app = express();
    app.use(healthRoutes);

    await request(app).get("/health").expect(200).expect({ status: "ok" });
    await request(app).get("/ping").expect(200).expect({ message: "pong" });
  });
});
`;
const testRegistryTemplate = (specs) => `export const testRegistry = [
${specs.map((spec) => `  "${spec}"`).join(",\n")}
] as const;
`;
const testRunnerTemplate = () => `import { testRegistry } from "./registry.js";

for (const spec of testRegistry) {
  await import(spec);
}
`;
const testHarnessSpecTemplate = () => `import "./runner.js";
`;
const collectSpecPaths = (dir, rootDir = dir) => {
    if (!fs.existsSync(dir)) {
        return [];
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const specs = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            specs.push(...collectSpecPaths(fullPath, rootDir));
            continue;
        }
        if (!entry.isFile()) {
            continue;
        }
        if (!entry.name.endsWith(".spec.ts")) {
            continue;
        }
        const relativePath = normalizeRelativePath(path.relative(rootDir, fullPath));
        if (relativePath === "registry.ts" ||
            relativePath === "runner.ts" ||
            relativePath === "runner.spec.ts") {
            continue;
        }
        specs.push(`./${relativePath.replace(/\.ts$/, ".js")}`);
    }
    return specs.sort();
};
export const syncTestHarness = (targetDir) => {
    const testsDir = path.join(targetDir, "src", "tests");
    ensureDir(testsDir);
    const specs = collectSpecPaths(testsDir);
    writeTextFile(path.join(testsDir, "registry.ts"), testRegistryTemplate(specs));
    writeTextFile(path.join(testsDir, "runner.ts"), testRunnerTemplate());
    writeTextFile(path.join(testsDir, "runner.spec.ts"), testHarnessSpecTemplate());
};
const controllerSpecTemplate = (name, sourcePath) => {
    const importPath = specImportPath(sourcePath);
    return `import { describe, expect, it } from "vitest";

import { ${toPascalCase(name)}Controller } from "${importPath}";

describe("${toPascalCase(name)}Controller", () => {
  it("returns the expected payload", () => {
    const controller = new ${toPascalCase(name)}Controller();

    expect(controller.findAll()).toEqual({ resource: "${name}" });
  });
});
`;
};
const serviceSpecTemplate = (name, sourcePath) => {
    const importPath = specImportPath(sourcePath);
    return `import { describe, expect, it } from "vitest";

import { ${toPascalCase(name)}Service } from "${importPath}";

describe("${toPascalCase(name)}Service", () => {
  it("can be instantiated", () => {
    expect(new ${toPascalCase(name)}Service()).toBeInstanceOf(${toPascalCase(name)}Service);
  });
});
`;
};
const routeSpecTemplate = (name, sourcePath) => {
    const importPath = specImportPath(sourcePath);
    return `import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { ${toCamelCase(name)}Routes } from "${importPath}";

describe("${toCamelCase(name)}Routes", () => {
  it("serves the resource endpoint", async () => {
    const app = express();
    app.use(${toCamelCase(name)}Routes);

    await request(app).get("/${name}").expect(200).expect({ resource: "${name}" });
  });
});
`;
};
const middlewareSpecTemplate = (name, sourcePath) => {
    const importPath = specImportPath(sourcePath);
    return `import { describe, expect, it, vi } from "vitest";

import { ${toCamelCase(name)}Middleware } from "${importPath}";

describe("${toCamelCase(name)}Middleware", () => {
  it("calls next", () => {
    const next = vi.fn();

    ${toCamelCase(name)}Middleware({} as never, {} as never, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
`;
};
const createDecoratorController = (name, outputDir = "src/app/controllers") => ({
    [`${normalizeRelativePath(outputDir)}/${controllerFileName(name)}`]: `import { Controller, Get } from "@sculptor/core";

@Controller("/${name}")
export class ${toPascalCase(name)}Controller {
  @Get("/")
  findAll() {
    return { resource: "${name}" };
  }
  }
`
});
const createFunctionalArtifacts = (name) => ({
    [`src/app/routes/${routeFileName(name)}`]: `import { Router } from "express";

const sculptorSource = Symbol.for("sculptor:router:source");

export const ${toCamelCase(name)}Routes = Router();

Object.defineProperty(${toCamelCase(name)}Routes, sculptorSource, {
  value: "${name}.routes.ts"
});

${toCamelCase(name)}Routes.get("/${name}", (_req, res) => {
  res.json({ resource: "${name}" });
});
`,
    [`src/app/handlers/${name}.handler.ts`]: `export const ${toPascalCase(name)}Handler = (
  _req: unknown,
  res: { json: (value: unknown) => void }
) => {
  res.json({ resource: "${name}" });
};
`
});
const createServiceResource = (name) => ({
    [`src/app/services/${serviceFileName(name)}`]: `export class ${toPascalCase(name)}Service {}
`
});
const createModuleResource = (name) => ({
    [`src/app/modules/${moduleFileName(name)}`]: `export class ${toPascalCase(name)}Module {}
`
});
const createMiddlewareResource = (name) => ({
    [`src/app/middlewares/${middlewareFileName(name)}`]: `import type { NextFunction, Request, Response } from "express";

export const ${toCamelCase(name)}Middleware = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  next();
};
`
});
const createRouteResource = (name) => ({
    [`src/app/routes/${routeFileName(name)}`]: `import { Router } from "express";

const sculptorSource = Symbol.for("sculptor:router:source");

export const ${toCamelCase(name)}Routes = Router();

Object.defineProperty(${toCamelCase(name)}Routes, sculptorSource, {
  value: "${name}.routes.ts"
});

${toCamelCase(name)}Routes.get("/${name}", (_req, res) => {
  res.json({ resource: "${name}" });
});
`
});
const createHandlerResource = (name) => ({
    [`src/app/handlers/${name}.handler.ts`]: `export const ${toPascalCase(name)}Handler = (
  _req: unknown,
  res: { json: (value: unknown) => void }
) => {
  res.json({ resource: "${name}" });
};
`
});
const createTypeResource = (name, variant, outputDir) => {
    const fileName = typeFileName(name, variant);
    const targetDir = normalizeRelativePath(outputDir);
    if (variant === "interface") {
        return {
            [`${targetDir}/${fileName}`]: `export interface ${toPascalCase(name)} {
  id?: string;
}
`
        };
    }
    if (variant === "class") {
        return {
            [`${targetDir}/${fileName}`]: `export class ${toPascalCase(name)} {}
`
        };
    }
    if (variant === "enum") {
        return {
            [`${targetDir}/${fileName}`]: `export enum ${toPascalCase(name)} {
  Default = "default"
}
`
        };
    }
    return {
        [`${targetDir}/${fileName}`]: `export type ${toPascalCase(name)} = Record<string, unknown>;
`
    };
};
const appShellFiles = (metadata) => ({
    "package.json": rootPackageJsonTemplate(metadata.appName, metadata.version, metadata.devServer),
    "README.md": rootReadmeTemplate(metadata.appName),
    "tsconfig.json": rootTsconfigTemplate,
    "sculptor.json": sculptorTemplate(metadata.mode, metadata.devServer, metadata.frameworkLock, metadata.testing),
    "props.json": propsTemplate,
    "src/main.ts": mainTemplate,
    "src/registry.ts": registryTemplate(metadata.mode)
});
export const scaffoldProject = (metadata, targetDir) => {
    ensureDir(targetDir);
    const rootFiles = {
        ...appShellFiles(metadata),
        "eslint.config.js": eslintConfigTemplate,
        "vitest.config.ts": vitestConfigTemplate,
        "src/app/services/health.service.ts": healthServiceTemplate,
        "src/app/modules/health.module.ts": healthModuleTemplate
    };
    if (metadata.mode === "decorator" || metadata.mode === "hybrid") {
        rootFiles["src/app/controllers/health.controller.ts"] =
            healthControllerTemplate;
    }
    if (metadata.mode === "functional" || metadata.mode === "hybrid") {
        rootFiles["src/app/routes/health.routes.ts"] = healthRoutesTemplate;
    }
    if (metadata.testing.generate) {
        rootFiles["src/tests/main.spec.ts"] = mainSpecTemplate;
        if (metadata.mode === "decorator" || metadata.mode === "hybrid") {
            rootFiles["src/tests/health.controller.spec.ts"] = healthControllerSpecTemplate;
        }
        if (metadata.mode === "functional" || metadata.mode === "hybrid") {
            rootFiles["src/tests/health.routes.spec.ts"] = healthRoutesSpecTemplate;
        }
    }
    for (const [relativePath, content] of Object.entries(rootFiles)) {
        writeTextFile(path.join(targetDir, relativePath), content);
    }
    for (const dir of [
        "src/app/controllers",
        "src/app/routes",
        "src/app/services",
        "src/app/modules",
        "src/app/middlewares",
        "src/app/handlers",
        "src/tests"
    ]) {
        ensureDir(path.join(targetDir, dir));
    }
    if (metadata.testing.generate) {
        syncTestHarness(targetDir);
    }
};
export const generateResourceFiles = (kind, name, mode, devServer = "tsx", outputDir, typeVariant = "type", functionalRoutes = false, testingGenerate = false) => {
    const resolvedOutputDir = resolveGeneratorOutputDir(kind, outputDir);
    const resolvedName = resolveFileStem(name, resolvedOutputDir);
    const functionalRouteDir = normalizeRelativePath(outputDir ?? "src/app/routes");
    const functionalHandlerDir = normalizeRelativePath(outputDir ?? "src/app/handlers");
    const sourceFiles = {};
    switch (kind) {
        case "controller":
            Object.assign(sourceFiles, createDecoratorController(resolvedName, resolvedOutputDir));
            if (functionalRoutes) {
                Object.assign(sourceFiles, {
                    [`${functionalRouteDir}/${routeFileName(resolvedName)}`]: createFunctionalArtifacts(resolvedName)[`src/app/routes/${routeFileName(resolvedName)}`],
                    [`${functionalHandlerDir}/${resolvedName}.handler.ts`]: createFunctionalArtifacts(resolvedName)[`src/app/handlers/${resolvedName}.handler.ts`]
                });
            }
            break;
        case "service":
            Object.assign(sourceFiles, {
                [`${resolvedOutputDir}/${serviceFileName(resolvedName)}`]: createServiceResource(resolvedName)[`src/app/services/${serviceFileName(resolvedName)}`]
            });
            break;
        case "module":
            Object.assign(sourceFiles, {
                [`${resolvedOutputDir}/${moduleFileName(resolvedName)}`]: createModuleResource(resolvedName)[`src/app/modules/${moduleFileName(resolvedName)}`]
            });
            break;
        case "middleware":
            Object.assign(sourceFiles, {
                [`${resolvedOutputDir}/${middlewareFileName(resolvedName)}`]: createMiddlewareResource(resolvedName)[`src/app/middlewares/${middlewareFileName(resolvedName)}`]
            });
            break;
        case "type":
            Object.assign(sourceFiles, createTypeResource(resolvedName, typeVariant, resolvedOutputDir));
            break;
        case "route":
            if (mode === "functional" || mode === "hybrid") {
                Object.assign(sourceFiles, {
                    [`${resolvedOutputDir}/${routeFileName(resolvedName)}`]: createRouteResource(resolvedName)[`src/app/routes/${routeFileName(resolvedName)}`]
                });
            }
            break;
    }
    if (!testingGenerate) {
        return sourceFiles;
    }
    const testFiles = {};
    for (const [filePath] of Object.entries(sourceFiles)) {
        const normalizedPath = normalizeRelativePath(filePath);
        const baseName = path.posix.basename(normalizedPath, ".ts");
        if (normalizedPath.endsWith(".controller.ts")) {
            const resourceName = baseName.replace(/\.controller$/, "");
            testFiles[`src/tests/${specFileName(resourceName, "controller")}`] =
                controllerSpecTemplate(resourceName, normalizedPath);
            continue;
        }
        if (normalizedPath.endsWith(".service.ts")) {
            const resourceName = baseName.replace(/\.service$/, "");
            testFiles[`src/tests/${specFileName(resourceName, "service")}`] =
                serviceSpecTemplate(resourceName, normalizedPath);
            continue;
        }
        if (normalizedPath.endsWith(".routes.ts")) {
            const resourceName = baseName.replace(/\.routes$/, "");
            testFiles[`src/tests/${specFileName(resourceName, "routes")}`] =
                routeSpecTemplate(resourceName, normalizedPath);
            continue;
        }
        if (normalizedPath.endsWith(".middleware.ts")) {
            const resourceName = baseName.replace(/\.middleware$/, "");
            testFiles[`src/tests/${specFileName(resourceName, "middleware")}`] =
                middlewareSpecTemplate(resourceName, normalizedPath);
        }
    }
    return {
        ...sourceFiles,
        ...testFiles
    };
};
export const writeGeneratedFiles = (targetDir, files) => {
    for (const [relativePath, content] of Object.entries(files)) {
        writeTextFile(path.join(targetDir, relativePath), content);
    }
};
export const readModeFromFlags = (flags, fallback) => {
    if (flags.includes("--functional")) {
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
export const parseGenerateMode = (mode, fallback) => mode === "functional" || mode === "decorator" || mode === "hybrid" ? mode : fallback;
export const controllerHelp = `# Controller Generator

## Usage

\`\`\`bash
sc generate controller user
sc g c user
\nsc generate controller user in src/app/controllers
\nsc g c user --functional
\`\`\`

## Output

- \`controllers/*.controller.ts\`
- controller-first by default
- pass \`--functional\` to opt into paired functional route and handler files
`;
export const moduleHelp = `# Module Generator

## Usage

\`\`\`bash
sc generate module user
sc g mo user
\`\`\`
`;
export const middlewareHelp = `# Middleware Generator

## Usage

\`\`\`bash
sc generate middleware auth
sc g mw auth
\`\`\`
`;
export const typeHelp = `# Type Generator

## Usage

\`\`\`bash
sc generate type user
sc g t user
sc g t user -i
sc g t user -c
sc g t user -e
\`\`\`

## Flags

- \`-i\`, \`-interface\` => \`*.interface.ts\`
- \`-c\`, \`-class\` => \`*.class.ts\`
- \`-e\`, \`-enum\` => \`*.enum.ts\`
- default => \`*.type.ts\`
`;
export const routeHelp = `# Route Generator

## Usage

\`\`\`bash
sc generate route user
sc g r user
\`\`\`

## Mode Guard

- routers can only be scaffolded in functional or hybrid mode
`;
export const generateHelp = `# Generate

## Usage

\`\`\`bash
sc generate controller user
sc generate service user
sc generate module user
sc generate middleware auth
sc generate type user
sc generate route user
\`\`\`

## Aliases

- \`sc g\`
- \`controller\` -> \`c\`
- \`service\` -> \`s\`
- \`module\` -> \`m\` / \`mo\`
- \`middleware\` -> \`mw\`
- \`type\` -> \`t\`
- \`route\` -> \`r\`

## Path

- append \`in <path>\` to write into a custom directory
- default output for types is \`src/app/types\`
- controller generators are controller-first by default; pass \`--functional\` only when you want the paired functional route files
`;
//# sourceMappingURL=index.js.map