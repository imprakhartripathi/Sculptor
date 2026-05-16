import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { Controller, Get, Patch, Use } from "../packages/router/src/index.js";
import { scanController } from "../packages/router/src/scanner.js";

describe("decorators", () => {
  it("stores controller and route metadata", () => {
    const classMiddleware = () => undefined;

    @Controller("/health")
    @Use(classMiddleware)
    class HealthController {
      @Get("/ping")
      @Use(classMiddleware)
      ping() {
        return { message: "pong" };
      }
    }

    const metadata = scanController(HealthController);

    expect(metadata.prefix).toBe("/health");
    expect(metadata.routes).toHaveLength(1);
    expect(metadata.routes[0]?.path).toBe("/ping");
    expect(metadata.middlewares).toHaveLength(1);
    expect(metadata.routes[0]?.middlewares).toHaveLength(1);
  });

  it("stores patch route metadata", () => {
    @Controller("/users")
    class UsersController {
      @Patch("/profile")
      updateProfile() {
        return { ok: true };
      }
    }

    const metadata = scanController(UsersController);

    expect(metadata.routes[0]?.method).toBe("patch");
    expect(metadata.routes[0]?.path).toBe("/profile");
  });
});
