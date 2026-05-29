import "reflect-metadata";
import express from "express";
import { detectRouteCollisions } from "./collisions.js";
import { registerControllerRoutes } from "./route-registry.js";
import { scanController } from "./scanner.js";
const normalizePrefix = (prefix) => {
    if (!prefix) {
        return undefined;
    }
    const withLeadingSlash = prefix.startsWith("/") ? prefix : `/${prefix}`;
    return withLeadingSlash.replace(/\/+$/, "") || "/";
};
const instantiateController = (controllerClass) => new controllerClass();
export const createRouter = ({ controllers = [], routes = [], prefix, controllerFactory }) => {
    const scannedControllers = controllers.map((controllerClass) => scanController(controllerClass));
    const normalizedPrefix = normalizePrefix(prefix);
    detectRouteCollisions(scannedControllers, routes, normalizedPrefix ?? "");
    const coreRouter = express.Router();
    for (const [index, controllerClass] of controllers.entries()) {
        const metadata = scannedControllers[index];
        if (!metadata) {
            continue;
        }
        const instance = controllerFactory
            ? controllerFactory(controllerClass)
            : instantiateController(controllerClass);
        registerControllerRoutes(coreRouter, metadata, instance);
    }
    for (const routeRouter of routes) {
        const expressRouter = "toRouter" in routeRouter ? routeRouter.toRouter() : routeRouter;
        coreRouter.use(expressRouter);
    }
    if (!normalizedPrefix) {
        return coreRouter;
    }
    const wrapper = express.Router();
    wrapper.use(normalizedPrefix, coreRouter);
    return wrapper;
};
//# sourceMappingURL=router.js.map