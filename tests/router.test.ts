import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { Controller, createRouter, Get, Use } from "../packages/router/src/index.js";

describe("router", () => {
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

    const app = express();
    app.use(express.json());
    app.use(
      createRouter({
        controllers: [HealthController],
        prefix: "/api"
      })
    );

    const response = await request(app).get("/api/health/ping");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "pong", hits: ["class", "method"] });
  });

  it("mounts functional routers alongside controllers", async () => {
    const app = express();
    const router = express.Router();
    router.get("/functional", (_req, res) => {
      res.json({ mode: "functional" });
    });

    app.use(
      createRouter({
        routes: [router],
        prefix: "/api"
      })
    );

    const response = await request(app).get("/api/functional");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mode: "functional" });
  });
});
