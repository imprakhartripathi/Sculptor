import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { bootstrapApp } from "../packages/core/src/index.js";
import {
  CodecError,
  Controller,
  Get,
  MissingParameterError,
  Next,
  Req,
  ReqBody,
  ReqContext,
  ReqCookie,
  ReqHeader,
  ReqIp,
  ReqParam,
  ReqQuery,
  Res,
  ValidationError,
  UUID,
  createRouter
} from "../packages/router/src/index.js";
import { resolveControllerArguments } from "../packages/router/src/parameters.js";

const createTestApp = (router: express.Router): express.Express => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { ctx?: unknown }).ctx = { requestId: "test", meta: {} };
    (req as express.Request & { cookies?: unknown }).cookies = { session: "cookie-value" };
    next();
  });
  app.use(router);
  return app;
};

describe("request parameter injection", () => {
  it("extracts supported request sources and applies codecs", async () => {
    @Controller("/users")
    class UsersController {
      @Get("/:id")
      show(
        @ReqParam("id", Number) id: number,
        @ReqQuery("page", Number) page: number,
        @ReqBody() body: unknown,
        @ReqHeader("authorization") authorization: string | undefined,
        @ReqCookie("session") session: string,
        @ReqContext() context: unknown,
        @ReqIp() ip: string | undefined,
        @Req() req: unknown,
        @Res() res: unknown,
        @Next() next: unknown
      ) {
        return {
          id,
          page,
          body,
          authorization,
          session,
          context,
          hasRequest: Boolean(req),
          hasResponse: Boolean(res),
          hasNext: typeof next === "function",
          hasIp: typeof ip === "string"
        };
      }
    }

    const response = await request(
      createTestApp(createRouter({ controllers: [UsersController] }))
    )
      .get("/users/42?page=3")
      .set("Authorization", "Bearer token")
      .send({ active: true });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 42,
      page: 3,
      body: { active: true },
      authorization: "Bearer token",
      session: "cookie-value",
      context: { requestId: "test", meta: {} },
      hasRequest: true,
      hasResponse: true,
      hasNext: true,
      hasIp: true
    });
  });

  it("supports whole-object extraction and optional values", async () => {
    @Controller("/search")
    class SearchController {
      @Get("/")
      search(
        @ReqQuery() query: unknown,
        @ReqHeader() headers: unknown,
        @ReqCookie() cookies: unknown,
        @ReqQuery("page", Number).optional() page: number | undefined
      ) {
        return { query, headers, cookies, page };
      }
    }

    const response = await request(
      createTestApp(createRouter({ controllers: [SearchController] }))
    )
      .get("/search?term=framework")
      .set("X-Test", "yes");

    expect(response.status).toBe(200);
    expect(response.body.query).toMatchObject({ term: "framework" });
    expect(response.body.headers).toMatchObject({ "x-test": "yes" });
    expect(response.body.cookies).toEqual({ session: "cookie-value" });
    expect(response.body.page).toBeUndefined();
  });

  it("runs codecs before validators and preserves declaration order", async () => {
    const order: string[] = [];
    const codec = (value: unknown): number => {
      order.push(`codec:${typeof value}`);
      return Number(value);
    };
    const first = (value: number): void => {
      order.push(`first:${typeof value}`);
      expect(value).toBe(2);
    };
    const second = (value: number): void => {
      order.push(`second:${typeof value}`);
      expect(value).toBe(2);
    };

    @Controller("/values")
    class ValuesController {
      @Get("/")
      read(@ReqQuery("value", codec).validate(first).validate(second) value: number) {
        return { value };
      }
    }

    const response = await request(
      createTestApp(createRouter({ controllers: [ValuesController] }))
    ).get("/values?value=2");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ value: 2 });
    expect(order).toEqual(["codec:string", "first:number", "second:number"]);
  });

  it("does not run codec or validators for an absent optional value", async () => {
    const codec = vi.fn((value: unknown) => Number(value));
    const validator = vi.fn();

    @Controller("/optional")
    class OptionalController {
      @Get("/")
      read(@ReqQuery("value", codec).validate(validator).optional() value: number | undefined) {
        return { value };
      }
    }

    const response = await request(
      createTestApp(createRouter({ controllers: [OptionalController] }))
    ).get("/optional");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
    expect(codec).not.toHaveBeenCalled();
    expect(validator).not.toHaveBeenCalled();
  });

  it("throws typed codec, validation, and missing-parameter errors", () => {
    const context = {
      req: { query: { value: "abc" }, get: () => undefined } as never,
      res: {} as never,
      next: vi.fn()
    };

    @Controller("/errors")
    class ErrorController {
      @Get("/")
      read(@ReqQuery("value", Number) value: number) {
        return value;
      }
    }

    const metadata = createRouter({ controllers: [ErrorController] });
    expect(metadata).toBeDefined();

    expect(() =>
      resolveControllerArguments(context, [
        {
          index: 0,
          source: "query",
          key: "value",
          codec: Number,
          validators: [],
          optional: false
        }
      ])
    ).toThrow(CodecError);

    expect(() =>
      resolveControllerArguments(context, [
        {
          index: 0,
          source: "query",
          key: "missing",
          validators: [],
          optional: false
        }
      ])
    ).toThrow(MissingParameterError);

    expect(() =>
      resolveControllerArguments(
        { ...context, req: { query: { value: "2" }, get: () => undefined } as never },
        [
          {
            index: 0,
            source: "query",
            key: "value",
            codec: Number,
            validators: [() => { throw new Error("not positive"); }],
            optional: false
          }
        ]
      )
    ).toThrow(ValidationError);
  });

  it("validates UUID values at runtime", () => {
    expect(UUID("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    );
    expect(() => UUID("not-a-uuid")).toThrow(CodecError);
  });

  it("uses explicit Boolean semantics and creates native Dates", () => {
    const context = {
      req: { query: { enabled: "false", date: "2026-09-04" }, get: () => undefined } as never,
      res: {} as never,
      next: vi.fn()
    };

    const values = resolveControllerArguments(context, [
      {
        index: 0,
        source: "query",
        key: "enabled",
        codec: Boolean,
        validators: [],
        optional: false
      },
      {
        index: 1,
        source: "query",
        key: "date",
        codec: Date,
        validators: [],
        optional: false
      }
    ]);

    expect(values[0]).toBe(false);
    expect(values[1]).toBeInstanceOf(Date);
    expect((values[1] as Date).getTime()).not.toBeNaN();
    expect(() =>
      resolveControllerArguments(
        { ...context, req: { query: { enabled: "yes" }, get: () => undefined } as never },
        [
          {
            index: 0,
            source: "query",
            key: "enabled",
            codec: Boolean,
            validators: [],
            optional: false
          }
        ]
      )
    ).toThrow(CodecError);
  });

  it("routes codec failures through the core error pipeline", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sculptor-error-"));
    fs.writeFileSync(path.join(rootDir, "sculptor.json"), "{}\n");
    const hookErrors: Array<{ kind?: unknown; status: number }> = [];

    @Controller("/typed")
    class TypedController {
      @Get("/")
      read(@ReqQuery("value", Number) value: number) {
        return { value };
      }
    }

    const result = await bootstrapApp({
      registry: { controllers: [TypedController], routes: [], services: [] },
      rootDir,
      listen: false,
      onError: (error) => {
        hookErrors.push({ kind: error.details?.kind, status: error.status });
      }
    });

    const response = await request(result.app).get("/typed?value=abc");

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: "CODEC_ERROR", status: 400 });
    expect(hookErrors).toEqual([{ kind: "CodecError", status: 400 }]);
  });

  it("rejects keyed request parameters absent from the route pattern", () => {
    @Controller("/users")
    class InvalidController {
      @Get("/:id")
      read(@ReqParam("missing") value: string) {
        return value;
      }
    }

    expect(() => createRouter({ controllers: [InvalidController] })).toThrow(
      'Parameter "missing" is not defined in route "/:id".'
    );
  });

  it("preserves undecorated legacy invocation", async () => {
    @Controller("/legacy")
    class LegacyController {
      @Get("/")
      read(req: express.Request, res: express.Response, next: express.NextFunction) {
        return {
          hasRequest: Boolean(req),
          hasResponse: Boolean(res),
          hasNext: typeof next === "function"
        };
      }
    }

    const response = await request(
      createTestApp(createRouter({ controllers: [LegacyController] }))
    ).get("/legacy");

    expect(response.body).toEqual({ hasRequest: true, hasResponse: true, hasNext: true });
  });
});
