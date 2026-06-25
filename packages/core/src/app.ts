import express from "express";
import type { PathParams, RequestHandlerParams } from "express-serve-static-core";

import { requestContextMiddleware } from "./context.js";

export interface SculptorExpressBuilder {
  readonly instance: express.Express;
  getInstance(): express.Express;
  use(): SculptorExpressBuilder;
  use(...handlers: RequestHandlerParams[]): SculptorExpressBuilder;
  use(path: PathParams, ...handlers: RequestHandlerParams[]): SculptorExpressBuilder;
  use(path: PathParams, subApplication: express.Application): SculptorExpressBuilder;
  set(...args: Parameters<express.Express["set"]>): SculptorExpressBuilder;
  enable(setting: string): SculptorExpressBuilder;
  disable(setting: string): SculptorExpressBuilder;
  locals(): express.Express["locals"];
  locals(locals: Record<string, unknown>): SculptorExpressBuilder;
  locals(name: string, value: unknown): SculptorExpressBuilder;
  engine(...args: Parameters<express.Express["engine"]>): SculptorExpressBuilder;
}

class SculptorExpressBuilderImpl implements SculptorExpressBuilder {
  constructor(private readonly app: express.Express) {}

  get instance(): express.Express {
    return this.app;
  }

  getInstance(): express.Express {
    return this.app;
  }

  use(...args: unknown[]): SculptorExpressBuilder {
    this.app.use(...(args as never[]));
    return this;
  }

  set(...args: Parameters<express.Express["set"]>): SculptorExpressBuilder {
    this.app.set(...args);
    return this;
  }

  enable(setting: string): SculptorExpressBuilder {
    this.app.enable(setting);
    return this;
  }

  disable(setting: string): SculptorExpressBuilder {
    this.app.disable(setting);
    return this;
  }

  locals(): express.Express["locals"];
  locals(locals: Record<string, unknown>): SculptorExpressBuilder;
  locals(name: string, value: unknown): SculptorExpressBuilder;
  locals(name?: string | Record<string, unknown>, value?: unknown): express.Express["locals"] | SculptorExpressBuilder {
    if (name === undefined) {
      return this.app.locals;
    }

    if (typeof name === "string") {
      this.app.locals[name] = value;
      return this;
    }

    Object.assign(this.app.locals, name);
    return this;
  }

  engine(...args: Parameters<express.Express["engine"]>): SculptorExpressBuilder {
    this.app.engine(...args);
    return this;
  }
}

export const createApp = (): SculptorExpressBuilder => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestContextMiddleware());
  return new SculptorExpressBuilderImpl(app);
};
