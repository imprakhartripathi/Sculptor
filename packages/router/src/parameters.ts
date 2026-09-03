import "reflect-metadata";

import type { NextFunction, Request, Response } from "express";

import { METADATA_KEYS } from "./metadata.js";
import { CodecError, MissingParameterError, ValidationError } from "./errors.js";

export type ParameterSource =
  | "params"
  | "query"
  | "body"
  | "headers"
  | "cookies"
  | "context"
  | "ip"
  | "request"
  | "response"
  | "next";

export type Req = Request;
export type Res = Response;

export type Codec<T> = (value: unknown) => T;
export type Validator<T> = (value: T) => void;

export interface ParameterDefinition {
  index: number;
  source: ParameterSource;
  key?: string;
  codec?: Codec<unknown>;
  validators: Validator<unknown>[];
  optional: boolean;
}

type ParameterDecoratorFactory = ParameterDecorator & {
  validate<T>(validator: Validator<T>): ParameterDecoratorFactory;
  optional(): ParameterDecoratorFactory;
};

const isAbsent = (value: unknown): value is undefined | null =>
  value === undefined || value === null;

const addParameterDefinition = (
  target: object,
  propertyKey: string | symbol,
  definition: ParameterDefinition
): void => {
  const existing: ParameterDefinition[] =
    Reflect.getOwnMetadata(METADATA_KEYS.methodParameters, target, propertyKey) ?? [];
  const next = existing.filter((entry) => entry.index !== definition.index);

  Reflect.defineMetadata(
    METADATA_KEYS.methodParameters,
    [...next, definition].sort((left, right) => left.index - right.index),
    target,
    propertyKey
  );
};

const createParameterDecorator = (
  source: ParameterSource,
  key?: string,
  codec?: Codec<unknown>
): ParameterDecoratorFactory => {
  const definition: Omit<ParameterDefinition, "index"> = {
    source,
    ...(key === undefined ? {} : { key }),
    ...(codec === undefined ? {} : { codec }),
    validators: [],
    optional: false
  };

  const decorator = ((target: object, propertyKey: string | symbol, parameterIndex: number) => {
    addParameterDefinition(target, propertyKey, {
      ...definition,
      validators: [...definition.validators],
      index: parameterIndex
    });
  }) as ParameterDecoratorFactory;

  decorator.validate = <T>(validator: Validator<T>): ParameterDecoratorFactory => {
    definition.validators.push(validator as Validator<unknown>);
    return decorator;
  };

  decorator.optional = (): ParameterDecoratorFactory => {
    definition.optional = true;
    return decorator;
  };

  return decorator;
};

export const ReqParam = (
  key?: string,
  codec?: Codec<unknown>
): ParameterDecoratorFactory => createParameterDecorator("params", key, codec);

export const ReqQuery = (
  key?: string,
  codec?: Codec<unknown>
): ParameterDecoratorFactory => createParameterDecorator("query", key, codec);

export const ReqBody = (codec?: Codec<unknown>): ParameterDecoratorFactory =>
  createParameterDecorator("body", undefined, codec);

export const ReqHeader = (
  key?: string,
  codec?: Codec<unknown>
): ParameterDecoratorFactory => createParameterDecorator("headers", key, codec);

export const ReqCookie = (
  key?: string,
  codec?: Codec<unknown>
): ParameterDecoratorFactory => createParameterDecorator("cookies", key, codec);

export const ReqContext = (): ParameterDecoratorFactory => createParameterDecorator("context");
export const ReqIp = (): ParameterDecoratorFactory => createParameterDecorator("ip");
export const Req = (): ParameterDecoratorFactory => createParameterDecorator("request");
export const Res = (): ParameterDecoratorFactory => createParameterDecorator("response");
export const Next = (): ParameterDecoratorFactory => createParameterDecorator("next");

export const UUID: Codec<string> = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new CodecError("Value is not a valid UUID.", "Invalid UUID value.");
  }

  return value;
};

const extractSource = (
  context: { req: Request; res: Response; next: NextFunction },
  source: ParameterSource
): unknown => {
  switch (source) {
    case "params":
      return context.req.params;
    case "query":
      return context.req.query;
    case "body":
      return context.req.body;
    case "headers":
      return context.req.headers;
    case "cookies":
      return (context.req as Request & { cookies?: unknown }).cookies;
    case "context":
      return (context.req as Request & { ctx?: unknown }).ctx;
    case "ip":
      return context.req.ip;
    case "request":
      return context.req;
    case "response":
      return context.res;
    case "next":
      return context.next;
  }
};

const extractValue = (
  context: { req: Request; res: Response; next: NextFunction },
  definition: ParameterDefinition
): unknown => {
  const source = extractSource(context, definition.source);
  return definition.key === undefined
    ? source
    : source !== null && typeof source === "object"
      ? (source as Record<string, unknown>)[definition.key]
      : undefined;
};

const applyCodec = (value: unknown, codec: Codec<unknown>, definition: ParameterDefinition): unknown => {
  try {
    if (codec === Boolean) {
      if (value === true || value === "true") {
        return true;
      }

      if (value === false || value === "false") {
        return false;
      }

      throw new Error("Value is not a valid boolean.");
    }

    const converted = codec === Date ? new Date(value as string | number | Date) : codec(value);
    if (codec === Number && typeof converted === "number" && Number.isNaN(converted)) {
      throw new Error("Value is not a valid number.");
    }
    if (codec === Date && converted instanceof Date && Number.isNaN(converted.getTime())) {
      throw new Error("Value is not a valid date.");
    }
    return converted;
  } catch (error) {
    if (error instanceof CodecError) {
      throw error;
    }

    throw new CodecError(
      `Unable to convert parameter${definition.key ? ` "${definition.key}"` : ""}.`,
      error instanceof Error ? error.message : "Codec conversion failed."
    );
  }
};

const applyValidators = (value: unknown, definition: ParameterDefinition): void => {
  for (const validator of definition.validators) {
    try {
      validator(value);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ValidationError(
        `Parameter${definition.key ? ` "${definition.key}"` : ""} failed validation.`,
        error instanceof Error ? error.message : "Validation failed."
      );
    }
  }
};

export const getParameterDefinitions = (
  prototype: object,
  propertyKey: string
): ParameterDefinition[] =>
  Reflect.getMetadata(METADATA_KEYS.methodParameters, prototype, propertyKey) ?? [];

export const resolveControllerArguments = (
  context: { req: Request; res: Response; next: NextFunction },
  definitions: ParameterDefinition[]
): unknown[] => {
  const args: unknown[] = [];

  for (const definition of definitions) {
    let value = extractValue(context, definition);

    if (definition.key !== undefined && definition.source === "headers") {
      const headerValue = context.req.get(definition.key);
      value = headerValue;
    }

    if (isAbsent(value)) {
      if (definition.optional) {
        args[definition.index] = undefined;
        continue;
      }

      throw new MissingParameterError(
        definition.key ?? definition.source,
        `Required ${definition.source} parameter is missing.`
      );
    }

    if (definition.codec) {
      value = applyCodec(value, definition.codec, definition);
    }

    applyValidators(value, definition);
    args[definition.index] = value;
  }

  if (definitions.length > 0) {
    const decoratedIndexes = new Set(definitions.map((definition) => definition.index));

    for (let index = 0; index < 3; index += 1) {
      if (decoratedIndexes.has(index)) {
        continue;
      }

      args[index] = [context.req, context.res, context.next][index];
    }
  }

  return args;
};