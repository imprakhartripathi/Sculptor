import { devDependenciesFor, devScriptFor, toKebabCase } from "../utils.js";
export const rootPackageJsonTemplate = (appName, version, devServer) => `{
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
export const rootReadmeTemplate = (appName) => `# ${appName}

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
export const sculptorTemplate = (mode, devServer, frameworkLock, testing) => `{
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
export const mainTemplate = `import { paws } from "@sculptor/paws";
import { startApp } from "@sculptor/core";
import { fileURLToPath } from "node:url";
import { registry } from "./registry.js";

const appRoot = fileURLToPath(new URL("..", import.meta.url));

process.env.SCULPTOR_ROOT_DIR = appRoot;
paws.boot();

void startApp({ registry, rootDir: appRoot });
`;
export const registryTemplate = (mode) => {
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
        return `import { health } from "./app/routes/health.route.js";

export const registry = {
  controllers: [],
  routes: [health],
  services: []
};
`;
    }
    return `import { HealthController } from "./app/controllers/health.controller.js";
import { health } from "./app/routes/health.route.js";

export const registry = {
  controllers: [HealthController],
  routes: [health],
  services: []
};
`;
};
export const healthControllerTemplate = `import { Controller, Get } from "@sculptor/core";

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
export const healthRouteHandlerTemplate = `import { normalizeError } from "@sculptor/core";
import type { FrameworkErrorHandler, Nxt, Req, Res, SculptorError } from "@sculptor/core";

export const healthHandler = async (
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

import { healthErrorHandler, healthHandler } from "../handlers/health.route.handler.js";

export const health = FunctionalRouter("/status");

health.get(healthHandler);
health.at("/ping").get(healthHandler);
health.use(healthErrorHandler);
`;
export const healthServiceTemplate = `export class HealthService {
  status() {
    return { status: "ok" };
  }
}
`;
export const healthModuleTemplate = `export class HealthModule {}
`;
export const healthControllerSpecTemplate = `import { describe, expect, it } from "vitest";

import { HealthController } from "../app/controllers/health.controller.js";

describe("HealthController", () => {
  it("returns the expected health payload", () => {
    const controller = new HealthController();

    expect(controller.health()).toEqual({ status: "ok" });
    expect(controller.ping()).toEqual({ message: "pong" });
  });
});
`;
export const healthRouteSpecTemplate = `import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { health } from "../app/routes/health.route.js";

describe("health", () => {
  it("serves the health endpoint", async () => {
    const app = express();
    app.use(health.toRouter());

    await request(app).get("/status").expect(200).expect({ status: "ok" });
    await request(app).get("/status/ping").expect(200).expect({ message: "pong" });
  });
});
`;
export const testRegistryTemplate = (specs) => `export const testRegistry = [
${specs.map((spec) => `  "${spec}"`).join(",\n")}
] as const;
`;
export const testRunnerTemplate = () => `import { testRegistry } from "./registry.js";

for (const spec of testRegistry) {
  await import(spec);
}
`;
export const testHarnessSpecTemplate = () => `import "./runner.js";
`;
//# sourceMappingURL=scaffold.js.map