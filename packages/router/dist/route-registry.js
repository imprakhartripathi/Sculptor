import { wrapRequestHandler } from "./async.js";
const normalizePathSegment = (segment) => {
    if (!segment) {
        return "/";
    }
    const withLeadingSlash = segment.startsWith("/") ? segment : `/${segment}`;
    return withLeadingSlash === "/" ? "/" : withLeadingSlash.replace(/\/+$/, "");
};
const joinPaths = (prefix, path) => {
    const normalizedPrefix = normalizePathSegment(prefix);
    const normalizedPath = normalizePathSegment(path);
    if (normalizedPath === "/") {
        return normalizedPrefix;
    }
    if (normalizedPrefix === "/") {
        return normalizedPath;
    }
    return `${normalizedPrefix}${normalizedPath}`;
};
const createRouteHandler = (instance, controllerMetadata, route) => {
    const handler = instance[route.propertyKey];
    if (typeof handler !== "function") {
        throw new TypeError(`Route handler "${route.propertyKey}" is not a function on controller instance.`);
    }
    return (req, res, next) => {
        res.locals.sculptorRoute = {
            controller: controllerMetadata.controllerName,
            method: route.method,
            path: joinPaths(controllerMetadata.prefix, route.path),
            propertyKey: route.propertyKey
        };
        void Promise.resolve()
            .then(() => handler.call(instance, req, res, next))
            .then((result) => {
            if (result !== undefined && !res.headersSent) {
                res.json(result);
            }
        })
            .catch(next);
    };
};
export const registerControllerRoutes = (app, controllerMetadata, controllerInstance) => {
    for (const route of controllerMetadata.routes) {
        const registrar = app[route.method];
        if (!registrar) {
            throw new TypeError(`Express router does not support "${route.method.toUpperCase()}" method.`);
        }
        const fullPath = joinPaths(controllerMetadata.prefix, route.path);
        const middlewares = [
            ...controllerMetadata.middlewares,
            ...route.middlewares
        ].map((middleware) => wrapRequestHandler(middleware));
        registrar.call(app, fullPath, ...middlewares, createRouteHandler(controllerInstance, controllerMetadata, route));
    }
};
//# sourceMappingURL=route-registry.js.map