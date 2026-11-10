export interface RouteCollisionRegistration {
  label: string;
}

export interface RouteCollisionDetails {
  method: string;
  path: string;
  registrations: RouteCollisionRegistration[];
}

export class RouteCollisionError extends Error {
  readonly details: RouteCollisionDetails;

  constructor(details: RouteCollisionDetails) {
    super(
      [
        "Duplicate route detected:",
        `${details.method.toUpperCase()} ${details.path}`,
        "",
        "Registered by:",
        ...details.registrations.map((registration) => `- ${registration.label}`)
      ].join("\n")
    );
    this.name = "RouteCollisionError";
    this.details = details;
  }
}

export class ParameterInputError extends Error {
  readonly kind: string;
  readonly code: string;
  readonly reason: string;
  readonly statusCode = 400;

  constructor(kind: string, code: string, message: string, reason: string) {
    super(message);
    this.name = kind;
    this.kind = kind;
    this.code = code;
    this.reason = reason;
  }
}

export class CodecError extends ParameterInputError {
  constructor(message: string, reason: string) {
    super("CodecError", "CODEC_ERROR", message, reason);
  }
}

export class ValidationError extends ParameterInputError {
  constructor(message: string, reason: string) {
    super("ValidationError", "VALIDATION_ERROR", message, reason);
  }
}

export class MissingParameterError extends ParameterInputError {
  constructor(parameter: string, reason: string) {
    super(
      "MissingParameterError",
      "MISSING_PARAMETER",
      `Required parameter "${parameter}" is missing.`,
      reason
    );
  }
}

