export class RouteCollisionError extends Error {
    constructor(details) {
        super([
            "Duplicate route detected:",
            `${details.method.toUpperCase()} ${details.path}`,
            "",
            "Registered by:",
            ...details.registrations.map((registration) => `- ${registration.label}`)
        ].join("\n"));
        this.name = "RouteCollisionError";
        this.details = details;
    }
}
//# sourceMappingURL=errors.js.map