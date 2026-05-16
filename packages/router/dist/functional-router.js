import express from "express";
import { registerRouterSource } from "./collisions.js";
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
const createRouteHandler = (method, routePath, handler) => {
    return (req, res, next) => {
        res.locals.sculptorRoute = {
            controller: undefined,
            method,
            path: routePath,
            propertyKey: handler.name || "handler"
        };
        void Promise.resolve()
            .then(() => handler(req, res, next))
            .then((result) => {
            if (result !== undefined && !res.headersSent) {
                res.json(result);
            }
        })
            .catch(next);
    };
};
class FunctionalRouterScope {
    constructor(prefix = "", sourceLabel, inheritedMiddlewares = [], router = express.Router()) {
        this.prefix = prefix;
        this.sourceLabel = sourceLabel ?? `FunctionalRouter(${JSON.stringify(prefix || "/")})`;
        this.inheritedMiddlewares = inheritedMiddlewares;
        this.router = router;
        registerRouterSource(this.router, this.sourceLabel);
    }
    register(method, pathOrHandler, handlers) {
        const localPath = typeof pathOrHandler === "string" ? pathOrHandler : "/";
        const routeHandlers = typeof pathOrHandler === "string"
            ? handlers
            : [pathOrHandler, ...handlers];
        const [lastHandler, ...middlewares] = [...routeHandlers].reverse();
        if (typeof lastHandler !== "function") {
            throw new TypeError(`FunctionalRouter.${method}() requires a handler.`);
        }
        const routePath = joinPaths(this.prefix, localPath);
        const routeHandler = createRouteHandler(method, routePath, lastHandler);
        const middlewareList = [
            ...this.inheritedMiddlewares,
            ...middlewares.reverse().filter((value) => typeof value === "function")
        ];
        this.router[method](routePath, ...middlewareList, routeHandler);
        return this;
    }
    use(pathOrMiddleware, ...middlewares) {
        if (typeof pathOrMiddleware !== "string") {
            this.inheritedMiddlewares.push(pathOrMiddleware, ...middlewares);
            return this;
        }
        this.router.use(joinPaths(this.prefix, pathOrMiddleware), ...middlewares);
        return this;
    }
    at(path) {
        return new FunctionalRouterScope(joinPaths(this.prefix, path), this.sourceLabel, [...this.inheritedMiddlewares], this.router);
    }
    get(pathOrHandler, ...handlers) {
        return this.register("get", pathOrHandler, handlers);
    }
    post(pathOrHandler, ...handlers) {
        return this.register("post", pathOrHandler, handlers);
    }
    put(pathOrHandler, ...handlers) {
        return this.register("put", pathOrHandler, handlers);
    }
    patch(pathOrHandler, ...handlers) {
        return this.register("patch", pathOrHandler, handlers);
    }
    delete(pathOrHandler, ...handlers) {
        return this.register("delete", pathOrHandler, handlers);
    }
    toRouter() {
        return this.router;
    }
}
export const FunctionalRouter = (prefix = "") => new FunctionalRouterScope(prefix);
//# sourceMappingURL=functional-router.js.map