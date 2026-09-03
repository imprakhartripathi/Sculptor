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

