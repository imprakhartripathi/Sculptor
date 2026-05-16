import { RouteCollisionError } from "./errors.js";
const SCULPTOR_SOURCE_KEY = Symbol.for("sculptor:router:source");
const normalizePath = (segment) => {
    if (!segment) {
        return "/";
    }
    const withLeadingSlash = segment.startsWith("/") ? segment : `/${segment}`;
    return withLeadingSlash === "/" ? "/" : withLeadingSlash.replace(/\/+$/, "");
};
const joinPaths = (prefix, path) => {
    const normalizedPrefix = normalizePath(prefix);
    const normalizedPath = normalizePath(path);
    if (normalizedPath === "/") {
        return normalizedPrefix;
    }
    if (normalizedPrefix === "/") {
        return normalizedPath;
    }
    return `${normalizedPrefix}${normalizedPath}`;
};
const toRouteLabel = (controllerName, route) => route.source?.label ?? `${controllerName}.${route.propertyKey}()`;
const toRouterLabel = (router) => {
    const source = router[SCULPTOR_SOURCE_KEY];
    if (typeof source === "string" && source.trim()) {
        return source;
    }
    return "functional router";
};
const isFunctionalRouterLike = (value) => typeof value.toRouter === "function";
const collectRouterRoutes = (router, label) => {
    const stack = (router.stack ?? []);
    const entries = [];
    for (const layer of stack) {
        const route = layer.route;
        if (route) {
            const paths = Array.isArray(route.path)
                ? route.path
                : [route.path ?? "/"];
            const methods = Object.keys(route.methods ?? {}).filter((method) => route.methods?.[method]);
            for (const method of methods) {
                for (const path of paths) {
                    entries.push({
                        method,
                        path: normalizePath(String(path ?? "/")),
                        source: label
                    });
                }
            }
            continue;
        }
        const childRouter = layer.handle;
        if (childRouter &&
            typeof childRouter.stack !== "undefined") {
            entries.push(...collectRouterRoutes(childRouter, label));
        }
    }
    return entries;
};
export const createRegisteredRouteEntries = (controllerMetadata, routeRouters, appPrefix = "") => {
    const entries = [];
    for (const metadata of controllerMetadata) {
        for (const route of metadata.routes) {
            entries.push({
                method: route.method,
                path: joinPaths(appPrefix, joinPaths(metadata.prefix, route.path)),
                source: toRouteLabel(metadata.controllerName, route)
            });
        }
    }
    for (const router of routeRouters) {
        const expressRouter = isFunctionalRouterLike(router) ? router.toRouter() : router;
        entries.push(...collectRouterRoutes(expressRouter, toRouterLabel(expressRouter)).map((entry) => ({
            ...entry,
            path: joinPaths(appPrefix, entry.path)
        })));
    }
    return entries;
};
export const detectRouteCollisions = (controllerMetadata, routeRouters, appPrefix = "") => {
    const seen = new Map();
    for (const entry of createRegisteredRouteEntries(controllerMetadata, routeRouters, appPrefix)) {
        const key = `${entry.method.toLowerCase()} ${entry.path}`;
        const previous = seen.get(key);
        if (!previous) {
            seen.set(key, entry);
            continue;
        }
        throw new RouteCollisionError({
            method: entry.method,
            path: entry.path,
            registrations: [{ label: previous.source }, { label: entry.source }]
        });
    }
};
export const registerRouterSource = (router, source) => {
    if (!source) {
        return;
    }
    Object.defineProperty(router, SCULPTOR_SOURCE_KEY, {
        configurable: true,
        enumerable: false,
        value: source,
        writable: false
    });
};
//# sourceMappingURL=collisions.js.map