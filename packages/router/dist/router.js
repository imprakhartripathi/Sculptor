import "reflect-metadata";
import express from "express";
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
export const createRouter = ({ controllers = [], routes = [], prefix }) => {
    const coreRouter = express.Router();
    for (const controllerClass of controllers) {
        const metadata = scanController(controllerClass);
        const instance = instantiateController(controllerClass);
        registerControllerRoutes(coreRouter, metadata, instance);
    }
    for (const routeRouter of routes) {
        coreRouter.use(routeRouter);
    }
    const normalizedPrefix = normalizePrefix(prefix);
    if (!normalizedPrefix) {
        return coreRouter;
    }
    const wrapper = express.Router();
    wrapper.use(normalizedPrefix, coreRouter);
    return wrapper;
};
//# sourceMappingURL=router.js.map