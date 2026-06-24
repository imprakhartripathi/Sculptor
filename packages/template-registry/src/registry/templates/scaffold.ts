import type { DevServer, ScaffoldMode, ScaffoldProjectMetadata, TestingMetadata } from "../utils.js";
import { devDependenciesFor, devScriptFor, toKebabCase } from "../utils.js";

export const rootPackageJsonTemplate = (
  appName: string,
  version: string,
  devServer: DevServer
): string => `{
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

export const rootReadmeTemplate = (appName: string): string => `# ${appName}

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

export const rootGitignoreTemplate = `node_modules/
dist/
coverage/
.env
.env.*
.DS_Store
.vscode/
.idea/
.cache/
.nyc_output/
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*
*.tsbuildinfo
`;

export const rootTsconfigTemplate = `{
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
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}`;

export const sculptorTemplate = (
  mode: ScaffoldMode,
  devServer: DevServer,
  frameworkLock: boolean,
  testing: TestingMetadata
): string => `{
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

export const eslintConfigTemplate = `import parser from "@typescript-eslint/parser";
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

export const vitestConfigTemplate = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true
  }
});
`;

export const mainSpecTemplate = `import type { Server } from "node:http";
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

export const appTsconfigTemplate = `{
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
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}`;

export const propsTemplate = `{
  "app": {
    "port": 3000,
    "prefix": "/api"
  }
}`;

export const legacyMainTemplate = `/**
 * Legacy startup template.
 *
 * Kept for backwards compatibility.
 *
 * New applications should prefer
 * the Express builder startup style.
 */
import { paws } from "@sculptor/paws";
import { startApp } from "@sculptor/core";
import { fileURLToPath } from "node:url";
import { registry } from "./registry.js";

const appRoot = fileURLToPath(new URL("..", import.meta.url));

process.env.SCULPTOR_ROOT_DIR = appRoot;
paws.boot();

void startApp({ registry, rootDir: appRoot });
`;

export const mainTemplate = `import { createApp, startApp } from "@sculptor/core";
import { paws } from "@sculptor/paws";

import { registry } from "./registry.js";

const app = createApp();

/**
 * Sculptor Express Builder
 *
 * Configure native Express features.
 *
 * Examples:
 *
 * app
 *   .use(compression())
 *   .disable("x-powered-by")
 *   .set("trust proxy", true);
 *
 *
 * Warning
 *
 * This configures the underlying
 * Express application.
 *
 * If you are unsure what a setting
 * does it is recommended to leave
 * it unchanged.
 *
 * Sculptor defaults are production safe.
 */
app.disable("x-powered-by");

paws.boot();

void startApp({
  registry,
  app
});
`;

export const registryTemplate = (mode: ScaffoldMode): string => {
  if (mode === "decorator") {
    return `import { HealthPackage } from "./app/health/index.js";

export const registry = {
  packages: [HealthPackage],
  controllers: [],
  routes: [],
  services: [],
  repositories: [],
  middlewares: []
};
`;
  }

  if (mode === "functional") {
    return `import { HealthPackage } from "./app/health/index.js";

export const registry = {
  packages: [HealthPackage],
  controllers: [],
  routes: [],
  services: [],
  repositories: [],
  middlewares: []
};
`;
  }

  return `import { HealthPackage } from "./app/health/index.js";

export const registry = {
  packages: [HealthPackage],
  controllers: [],
  routes: [],
  services: [],
  repositories: [],
  middlewares: []
};
`;
};

export const healthControllerTemplate = `import { AutoInject, Controller, Get } from "@sculptor/core";

import { HealthService } from "./health.service.js";

@Controller("/health")
export class HealthController {
  @AutoInject(HealthService)
  private readonly healthService!: HealthService;

  @Get("/")
  health() {
    return this.healthService.status();
  }

  @Get("/ping")
  ping() {
    return { message: "pong" };
  }
}
`;

export const healthServiceTemplate = `import { AutoInject, Service } from "@sculptor/core";

import { HealthRepository } from "./health.repository.js";

@Service()
export class HealthService {
  @AutoInject(HealthRepository)
  private readonly healthRepository!: HealthRepository;

  status() {
    return this.healthRepository.status();
  }
}
`;

export const healthRepositoryTemplate = `import { Repository } from "@sculptor/core";

@Repository()
export class HealthRepository {
  status() {
    return { status: "ok" };
  }
}
`;

export const healthDtoTemplate = `export class HealthDto {
  status = "ok";
}
`;

export const healthTypesTemplate = `export type HealthTypes = {
  status: string;
};
`;

export const healthFunctionalServiceTemplate = `import type { SculptorFunctionalService } from "@sculptor/core";

export const HealthService: SculptorFunctionalService<{ status: string }> = () => ({
  status: "ok"
});
`;

export const healthFunctionalRepositoryTemplate = `import type { SculptorFunctionalRepository } from "@sculptor/core";

export const HealthRepository: SculptorFunctionalRepository<{ status: string }> = () => ({
  status: "ok"
});
`;

export const healthFunctionalRouteHandlerTemplate = `import { normalizeError } from "@sculptor/core";
import type { FrameworkErrorHandler, Nxt, Req, Res, SculptorError, SculptorFunctionalHandler } from "@sculptor/core";

import { HealthService } from "./health.service.js";

export const healthHandler: SculptorFunctionalHandler<void> = async (
  req: Req,
  res: Res,
  next: Nxt
): Promise<void> => {
  try {
    if (req.path.endsWith("/ping")) {
      res.json({ message: "pong" });
      return;
    }

    res.json(HealthService());
  } catch (error) {
    next(normalizeError(error));
  }
};

export const healthErrorHandler: FrameworkErrorHandler = (
  error: SculptorError,
  _req: Req,
  res: Res,
  next: Nxt
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    message: error.message,
    code: error.code,
    status: error.status
  });
};
`;

export const healthFunctionalRouteTemplate = `import { FunctionalRouter } from "@sculptor/router";

import { healthErrorHandler, healthHandler } from "./health.route.handler.js";

export const health = FunctionalRouter("/health");

health.get(healthHandler);
health.at("/ping").get(healthHandler);
health.use(healthErrorHandler);
`;

export const healthFunctionalPackageIndexTemplate = (): string => `/**
 * @generated true
 */
import { Package, type SculptorFunctionalPackage } from "@sculptor/core";

// [sculptor:imports:start]
import { HealthService } from "./health.service.js";
import { HealthRepository } from "./health.repository.js";
import { health } from "./health.route.js";
import { healthHandler } from "./health.route.handler.js";
// [sculptor:imports:end]

// [sculptor:exports:start]
export * from "./health.route.js";
export * from "./health.route.handler.js";
export * from "./health.service.js";
export * from "./health.repository.js";
export type { HealthTypes } from "./health.types.js";
// [sculptor:exports:end]

// [sculptor:package:start]
const HealthPackageDefinition = {
  name: "health",
  path: "src/app/health",
  imports: [],
  exports: [HealthService, HealthRepository],
  controllers: [],
  handlers: [healthHandler],
  services: [HealthService],
  repositories: [HealthRepository],
  middlewares: [],
  routes: [health],
  customLinkedHelper: {
    class: [],
    function: []
  }
};

export const HealthPackage: SculptorFunctionalPackage = Package(HealthPackageDefinition)(() => HealthPackageDefinition);
// [sculptor:package:end]
`;

export const healthPackageIndexTemplate = (mode: ScaffoldMode): string => `/**
 * @generated true
 */
${mode === "functional"
  ? 'import { Package, type SculptorFunctionalPackage } from "@sculptor/core";'
  : 'import { Package } from "@sculptor/core";'}

// [sculptor:imports:start]
${mode !== "functional" ? 'import { HealthController } from "./health.controller.js";\n' : ""}
${mode !== "functional" ? 'import { HealthService } from "./health.service.js";\n' : ""}
${mode !== "functional" ? 'import { HealthRepository } from "./health.repository.js";\n' : ""}
${mode !== "functional" ? 'import { HealthDto } from "./health.dto.js";\n' : ""}
${mode === "functional" || mode === "hybrid" ? 'import { health } from "./health.route.js";\nimport { healthHandler } from "./health.route.handler.js";\n' : ""}// [sculptor:imports:end]

// [sculptor:exports:start]
${mode !== "functional" ? 'export * from "./health.controller.js";\n' : ""}
${mode !== "functional" ? 'export * from "./health.service.js";\n' : ""}
${mode !== "functional" ? 'export * from "./health.repository.js";\n' : ""}
${mode !== "functional" ? 'export * from "./health.dto.js";\n' : ""}
${mode === "functional" || mode === "hybrid" ? 'export * from "./health.route.js";\nexport * from "./health.route.handler.js";\n' : ""}
export type { HealthTypes } from "./health.types.js";
// [sculptor:exports:end]

// [sculptor:package:start]
${mode === "functional"
  ? `const HealthPackageDefinition = {
  name: "health",
  path: "src/app/health",
  imports: [],
  exports: [],
  controllers: [],
  handlers: [healthHandler],
  services: [],
  repositories: [],
  middlewares: [],
  routes: [health],
  customLinkedHelper: {
    class: [],
    function: []
  }
};

export const HealthPackage: SculptorFunctionalPackage = Package(HealthPackageDefinition)(() => HealthPackageDefinition);`
  : `@Package({
  name: "health",
  path: "src/app/health",
  imports: [],
  exports: [HealthService, HealthRepository, HealthDto],
  controllers: [HealthController],
  handlers: [${mode === "hybrid" ? "healthHandler" : ""}],
  services: [HealthService],
  repositories: [HealthRepository],
  middlewares: [],
  routes: [${mode === "hybrid" ? "health" : ""}],
  customLinkedHelper: {
    class: [],
    function: []
  }
})
export class HealthPackage {}`}
// [sculptor:package:end]
`;

export const healthRouteHandlerTemplate = `import { normalizeError } from "@sculptor/core";
import type { FrameworkErrorHandler, Nxt, Req, Res, SculptorError, SculptorFunctionalHandler } from "@sculptor/core";

export const healthHandler: SculptorFunctionalHandler<void> = async (
  req: Req,
  res: Res,
  next: Nxt
): Promise<void> => {
  try {
    if (req.path.endsWith("/ping")) {
      res.json({ message: "pong" });
      return;
    }

    res.json({ status: "ok" });
  } catch (error) {
    next(normalizeError(error));
  }
};

export const healthErrorHandler: FrameworkErrorHandler = (
  error: SculptorError,
  _req: Req,
  res: Res,
  next: Nxt
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    message: error.message,
    code: error.code,
    status: error.status
  });
};
`;

export const healthRouteTemplate = `import { FunctionalRouter } from "@sculptor/router";

import { healthErrorHandler, healthHandler } from "./health.route.handler.js";

// In hybrid packages, the /r prefix keeps this generated route separate from the controller route.
// You can change it later if your app wants a different layout.
export const health = FunctionalRouter("/r/health");

health.get(healthHandler);
health.at("/ping").get(healthHandler);
health.use(healthErrorHandler);
`;

export const healthControllerSpecTemplate = `import { describe, expect, it } from "vitest";

import { HealthController } from "../app/health/index.js";

describe("HealthController", () => {
  it("returns the expected health payload", () => {
    const controller = new HealthController();
    (controller as any).healthService = {
      status: () => ({ status: "ok" })
    } as never;

    expect(controller.health()).toEqual({ status: "ok" });
    expect(controller.ping()).toEqual({ message: "pong" });
  });
});
`;

export const healthRouteSpecTemplate = (mode: ScaffoldMode): string => `import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { health } from "../app/health/health.route.js";

describe("health", () => {
  it("serves the health endpoint", async () => {
    const app = express();
    app.use(health.toRouter());

    await request(app)
      .get("${mode === "hybrid" ? "/r/health" : "/health"}")
      .expect(200)
      .expect({ status: "ok" });
    await request(app)
      .get("${mode === "hybrid" ? "/r/health/ping" : "/health/ping"}")
      .expect(200)
      .expect({ message: "pong" });
  });
});
`;

export const testRegistryTemplate = (specs: string[]): string => `export const testRegistry = [
${specs.map((spec) => `  "${spec}"`).join(",\n")}
] as const;
`;

export const testRunnerTemplate = (): string => `import { testRegistry } from "./registry.js";

for (const spec of testRegistry) {
  await import(spec);
}
`;

export const testHarnessSpecTemplate = (): string => `import "./runner.js";
`;
