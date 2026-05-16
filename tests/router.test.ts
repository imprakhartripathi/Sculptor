import express from "express";
import { describe, expect, it } from "vitest";

import {
  Controller,
  FunctionalRouter,
  createRouter,
  Get,
  Use
} from "../packages/router/src/index.js";

describe("router", () => {
  const invokeRoute = async (router: express.Router, path: string) => {
    const findRoute = (
      candidatePath: string,
      stack: Array<Record<string, unknown>>
    ):
      | {
          route: {
            stack: Array<{ handle: (req: never, res: never, next: () => void) => unknown }>;
          };
        }
      | undefined => {
      for (const layer of stack) {
        const route = layer.route as { path?: string; methods?: Record<string, boolean> } | undefined;
        if (route?.path === candidatePath) {
          return layer as {
            route: {
              stack: Array<{ handle: (req: never, res: never, next: () => void) => unknown }>;
            };
          };
        }

        const childStack = (layer.handle as unknown as { stack?: Array<Record<string, unknown>> })
          ?.stack;
        if (childStack) {
          const nested = findRoute(candidatePath, childStack);
          if (nested) {
            return nested;
          }
        }
      }

      return undefined;
    };

    const stack = ((router as unknown as { stack?: Array<Record<string, unknown>> }).stack ??
      []) as Array<Record<string, unknown>>;

    const routeLayer =
      findRoute(path, stack) ??
      (path.startsWith("/api/")
        ? findRoute(path.slice("/api".length), stack)
        : undefined);

    if (!routeLayer) {
      throw new Error(`Route not found: ${path}`);
    }

    const req = {
      method: "GET",
      url: path,
      originalUrl: path,
      headers: {},
      ctx: undefined
    } as never;

    const response = {
      statusCode: 200,
      body: undefined as unknown,
      headersSent: false,
      locals: {},
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        this.headersSent = true;
        return this;
      },
      send(payload: unknown) {
        this.body = payload;
        this.headersSent = true;
        return this;
      },
      end(payload?: unknown) {
        if (payload !== undefined) {
          this.body = payload;
        }
        this.headersSent = true;
      },
      setHeader() {
        return;
      },
      getHeader() {
        return undefined;
      }
    };

    await new Promise<void>((resolve, reject) => {
      const handlers = routeLayer.route.stack.map((layer) => layer.handle);
      (async () => {
        for (const handler of handlers) {
          await Promise.resolve(handler(req, response as never, () => undefined));
        }
      })()
        .then(() => resolve())
        .catch(reject);
    });

    return response;
  };

  it("executes decorator controllers and auto-sends json", async () => {
    const hits: string[] = [];

    const classMiddleware = (_req: unknown, _res: unknown, next: () => void) => {
      hits.push("class");
      next();
    };

    const methodMiddleware = (_req: unknown, _res: unknown, next: () => void) => {
      hits.push("method");
      next();
    };

    @Controller("/health")
    @Use(classMiddleware)
    class HealthController {
      @Get("/ping")
    @Use(methodMiddleware)
      async ping() {
        return { message: "pong", hits: [...hits] };
      }
    }

    const router = createRouter({
      controllers: [HealthController],
      prefix: "/api"
    });

    const response = await invokeRoute(router, "/api/health/ping");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: "pong", hits: ["class", "method"] });
  });

  it("mounts functional routers alongside controllers", async () => {
    const users = FunctionalRouter("/users");
    users.use((_req, _res, next) => {
      next();
    });
    users.use("/audit", (_req, _res, next) => {
      next();
    });
    users.get("/", (_req, _res) => {
      return { mode: "functional" };
    });
    users.at("/verify-token").patch((req, res) => {
      return { verified: Boolean(req.headers["x-token"]), path: res.locals.sculptorRoute?.path };
    });

    const assembled = createRouter({
      routes: [users]
    });

    const collectMethods = (router: express.Router): string[] => {
      const methods: string[] = [];
      const stack = ((router as unknown as { stack?: Array<Record<string, unknown>> }).stack ??
        []) as Array<Record<string, unknown>>;

      for (const layer of stack) {
        const route = layer.route as { methods?: Record<string, boolean> } | undefined;
        if (route?.methods) {
          methods.push(...Object.keys(route.methods).filter((key) => route.methods?.[key]));
        }

        const nested = layer.handle as unknown as { stack?: Array<Record<string, unknown>> };
        if (nested?.stack) {
          methods.push(...collectMethods(nested as express.Router));
        }
      }

      return methods;
    };

    const methods = collectMethods(assembled);

    expect(methods).toContain("get");
    expect(methods).toContain("patch");
    expect((users.toRouter() as unknown as { stack?: unknown[] }).stack?.length).toBeGreaterThan(0);
  });
});
