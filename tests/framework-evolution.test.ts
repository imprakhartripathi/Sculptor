import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import express from "express";
import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  bootstrapApp,
  createApp,
  findAppRoot,
  HttpError,
  normalizeError,
  resolveRootDir,
  SculptorError
} from "../packages/core/src/index.js";
import { ConfigInterpolationError, loadConfig, redactConfig } from "../packages/config/src/index.js";
import { Controller, FunctionalRouter, createRouter, Get } from "../packages/router/src/index.js";
import { RouteCollisionError } from "../packages/router/src/errors.js";
import { runCli } from "../packages/cli/src/cli.js";
import { loadPluginModule, PluginLoadError } from "../packages/cli/src/plugins.js";
import { loadScaffoldTemplateRegistry } from "../packages/cli/src/scaffold.js";
import { renderTemplate } from "../packages/cli/src/template-engine.js";

const tmpDir = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "sculptor-evo-"));

describe("route collisions", () => {
  it("throws on duplicate fully resolved routes", () => {
    @Controller("/api")
    class UserController {
      @Get("/users")
      getUsers() {
        return [];
      }
    }

    const router = express.Router();
    router.get("/api/users", (_req, res) => {
      res.json([]);
    });

    Object.defineProperty(router, Symbol.for("sculptor:router:source"), {
      configurable: true,
      value: "users.routes.ts"
    });

    expect(() =>
      createRouter({
        controllers: [UserController],
        routes: [router]
      })
    ).toThrowError(RouteCollisionError);

    expect(() =>
      createRouter({
        controllers: [UserController],
        routes: [router]
      })
    ).toThrowError(/GET \/api\/users/);
  });
});

describe("config loading", () => {
  it("loads env values and resolves interpolation recursively", () => {
    const rootDir = tmpDir();

    fs.writeFileSync(
      path.join(rootDir, "sculptor.json"),
      JSON.stringify(
        {
          db: {
            url: "${DATABASE_URL}"
          }
        },
        null,
        2
      )
    );
    fs.writeFileSync(path.join(rootDir, ".env"), "DATABASE_URL=postgres://localhost/dev\n");

    const config = loadConfig(rootDir);

    expect(config.merged.db).toEqual({ url: "postgres://localhost/dev" });
  });

  it("protects against circular interpolation", () => {
    const rootDir = tmpDir();

    fs.writeFileSync(
      path.join(rootDir, "sculptor.json"),
      JSON.stringify(
        {
          a: "${b}",
          b: "${a}"
        },
        null,
        2
      )
    );

    expect(() => loadConfig(rootDir)).toThrowError(ConfigInterpolationError);
  });

  it("redacts nested secrets", () => {
    expect(
      redactConfig({
        db: {
          password: "secret",
          nested: {
            apiKey: "token-value"
          }
        }
      })
    ).toEqual({
      db: {
        password: "***REDACTED***",
        nested: {
          apiKey: "***REDACTED***"
        }
      }
    });
  });
});

describe("bootstrap", () => {
  it("boots without binding a socket when listen is false", async () => {
    const result = await bootstrapApp({
      registry: { controllers: [], routes: [], services: [] },
      rootDir: tmpDir(),
      listen: false
    });

    expect(result.listen).toBe(false);
    expect(result.server).toBeUndefined();
    expect(result.app).toBeDefined();
  });

  it("uses a supplied Express builder when bootstrapping", async () => {
    const rootDir = tmpDir();

    fs.writeFileSync(path.join(rootDir, "sculptor.json"), JSON.stringify({}, null, 2));

    const app = createApp().set("trust proxy", true).disable("x-powered-by").locals({
      appName: "fixture"
    });

    const result = await bootstrapApp({
      registry: { controllers: [], routes: [], services: [] },
      rootDir,
      app,
      listen: false
    });

    expect(result.app.get("trust proxy")).toBe(true);
    expect(result.app.enabled("x-powered-by")).toBe(false);
    expect(result.app.locals.appName).toBe("fixture");
  });
});

describe("root discovery", () => {
  it("finds the nearest Sculptor root", () => {
    const rootDir = tmpDir();
    const nestedDir = path.join(rootDir, "packages", "app", "src");

    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(path.join(rootDir, "sculptor.json"), JSON.stringify({}, null, 2));

    expect(findAppRoot(nestedDir)).toBe(rootDir);
  });

  it("honors an explicit rootDir before env discovery", () => {
    const rootDir = tmpDir();
    const envRoot = tmpDir();
    const previousRootDir = process.env.SCULPTOR_ROOT_DIR;

    process.env.SCULPTOR_ROOT_DIR = envRoot;

    try {
      expect(resolveRootDir(rootDir)).toBe(rootDir);
      expect(resolveRootDir()).toBe(envRoot);
    } finally {
      if (previousRootDir === undefined) {
        delete process.env.SCULPTOR_ROOT_DIR;
      } else {
        process.env.SCULPTOR_ROOT_DIR = previousRootDir;
      }
    }
  });
});

describe("framework errors", () => {
  it("normalizes thrown values into SculptorError instances", () => {
    const normalized = normalizeError("boom");

    expect(normalized).toBeInstanceOf(SculptorError);
    expect(normalized.message).toBe("boom");
    expect(normalized.code).toBe("RUNTIME_ERROR");
    expect(normalized.status).toBe(500);
  });

  it("preserves typed framework errors", () => {
    const error = new HttpError(404, "Not found");

    expect(normalizeError(error)).toBe(error);
  });

  it("returns framework JSON for controller failures", async () => {
    const rootDir = tmpDir();

    fs.writeFileSync(path.join(rootDir, "sculptor.json"), JSON.stringify({}, null, 2));

    @Controller("/boom")
    class BoomController {
      @Get("/")
      explode(): never {
        throw new Error("controller boom");
      }
    }

    const result = await bootstrapApp({
      registry: {
        controllers: [BoomController],
        routes: [],
        services: []
      },
      rootDir,
      listen: false
    });

    const response = await request(result.app).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "Error",
        message: "controller boom",
        status: 500
      }
    });
  });

  it("returns framework JSON for functional handler failures", async () => {
    const rootDir = tmpDir();

    fs.writeFileSync(path.join(rootDir, "sculptor.json"), JSON.stringify({}, null, 2));

    const boom = FunctionalRouter("/boom");
    boom.get(() => {
      throw new Error("functional boom");
    });

    const result = await bootstrapApp({
      registry: {
        controllers: [],
        routes: [boom],
        services: []
      },
      rootDir,
      listen: false
    });

    const response = await request(result.app).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "Error",
        message: "functional boom",
        status: 500
      }
    });
  });

  it("returns framework JSON for async middleware failures", async () => {
    const rootDir = tmpDir();

    fs.writeFileSync(path.join(rootDir, "sculptor.json"), JSON.stringify({}, null, 2));

    @Controller("/boom")
    class BoomController {
      @Get("/")
      explode() {
        return { ok: true };
      }
    }

    const asyncMiddleware: RequestHandler = async () => {
      throw new Error("middleware boom");
    };

    const result = await bootstrapApp({
      registry: {
        controllers: [BoomController],
        routes: [],
        services: [],
        middlewares: [asyncMiddleware]
      },
      rootDir,
      listen: false
    });

    const response = await request(result.app).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "Error",
        message: "middleware boom",
        status: 500
      }
    });
  });
});

describe("templates", () => {
  it("renders interpolation, casing, and conditionals", () => {
    expect(
      renderTemplate(
        "Hello {{name}} {{camel}} {{pascal}} {{kebab}} {{if hybrid}}",
        {
          name: "user profile",
          hybrid: true
        }
      )
    ).toContain("Hello user profile userProfile UserProfile user-profile true");
  });
});

describe("plugins", () => {
  it("loads a plugin module dynamically", async () => {
    const rootDir = tmpDir();
    const pluginFile = path.join(rootDir, "plugin.mjs");
    fs.writeFileSync(
      pluginFile,
      `export const manifest = { name: "demo", templates: ["auth"] };`
    );

    const module = await loadPluginModule(pathToFileURL(pluginFile).href);

    expect(module.manifest?.name).toBe("demo");
  });

  it("surfaces a friendly error when a plugin is missing", async () => {
    await expect(loadPluginModule("@sculptor/__missing_plugin__")).rejects.toBeInstanceOf(
      PluginLoadError
    );
  });
});

describe("template registry recovery", () => {
  it("installs and retries when the template registry is missing", async () => {
    const rootDir = tmpDir();
    const spawnCalls: Array<{ command: string; args: string[] }> = [];
    const prompt = vi.fn().mockResolvedValue("y");
    const importer = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("Cannot find package '@sculptor/template-registry'"), {
        code: "ERR_MODULE_NOT_FOUND"
      }))
      .mockResolvedValueOnce({
        scaffoldProject: vi.fn(),
        generateResourceFiles: vi.fn(),
        writeGeneratedFiles: vi.fn(),
        syncTestHarness: vi.fn(),
        controllerHelp: "",
        generateHelp: ""
      });

    const module = await loadScaffoldTemplateRegistry(
      {
        cwd: rootDir,
        prompt,
        spawn: vi.fn((command: string, args: string[]) => {
          spawnCalls.push({ command, args });
          return { status: 0 } as const;
        }) as never,
        log: () => undefined,
        error: () => undefined
      },
      importer
    );

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(spawnCalls).toEqual([
      {
        command: "npm",
        args: ["install", "-g", "@sculptor/template-registry"]
      }
    ]);
    expect(module).not.toBeNull();
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it("exits cleanly when the user declines installation", async () => {
    const rootDir = tmpDir();
    const originalExitCode = process.exitCode;
    process.exitCode = undefined;
    const prompt = vi.fn().mockResolvedValue("n");
    const importer = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("Cannot find package '@sculptor/template-registry'"), {
        code: "ERR_MODULE_NOT_FOUND"
      }));

    const module = await loadScaffoldTemplateRegistry(
      {
        cwd: rootDir,
        prompt,
        spawn: vi.fn(() => ({ status: 0 })) as never,
        log: () => undefined,
        error: () => undefined
      },
      importer
    );

    expect(module).toBeNull();
    expect(process.exitCode).toBe(1);
    process.exitCode = originalExitCode;
  });
});

describe("cli config", () => {
  it("gets, sets, and lists config values", async () => {
    const rootDir = tmpDir();
    fs.writeFileSync(
      path.join(rootDir, "sculptor.json"),
      JSON.stringify(
        {
          logging: {
            enabled: true,
            dogMode: true
          }
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(rootDir, "props.json"),
      JSON.stringify(
        {
          app: {
            port: 3000,
            prefix: "/api"
          }
        },
        null,
        2
      )
    );

    const logs: string[] = [];

    await runCli(["node", "sc", "config", "get", "logging.dogMode"], {
      cwd: rootDir,
      log: (value) => logs.push(String(value))
    });

    await runCli(["node", "sc", "config", "set", "logging.dogMode=false"], {
      cwd: rootDir,
      log: (value) => logs.push(String(value))
    });

    await runCli(["node", "sc", "config", "list"], {
      cwd: rootDir,
      log: (value) => logs.push(String(value))
    });

    expect(logs.join("\n")).toContain("true");
    expect(logs.join("\n")).toContain("Updated config: logging.dogMode");
    expect(logs.join("\n")).toContain("logging.dogMode = false");
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "sculptor.json"), "utf8")).logging.dogMode).toBe(false);
  });
});
