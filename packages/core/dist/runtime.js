import express from "express";
import { loadConfig } from "@sculptor/config";
import { createRuntimeContainer, flattenRegistry, validateRuntimePackages } from "./packages.js";
import { paws } from "@sculptor/paws";
import { createRouter } from "@sculptor/router";
import { requestContextMiddleware } from "./context.js";
import { createFrameworkErrorMiddleware, RuntimeError } from "./errors.js";
import { logRegistryState } from "./warnings.js";
const resolvePort = (port, envPort, fallback) => {
    if (port !== undefined) {
        return port;
    }
    if (envPort !== undefined && envPort.trim()) {
        const parsed = Number(envPort);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    const numericFallback = Number(fallback);
    return Number.isNaN(numericFallback) ? 3000 : numericFallback;
};
const isPromiseLike = (value) => (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function";
const wrapRequestHandler = (handler) => (req, res, next) => {
    try {
        const result = handler(req, res, next);
        if (isPromiseLike(result)) {
            void Promise.resolve(result).catch(next);
        }
    }
    catch (error) {
        next(error);
    }
};
const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(requestContextMiddleware());
    return app;
};
const bootstrap = ({ registry: appRegistry, rootDir = process.cwd(), port, listen = true, onError }) => {
    const loadedConfig = loadConfig(rootDir);
    const resolvedPort = resolvePort(port, process.env.PORT, loadedConfig.runtime.app?.port);
    const prefix = loadedConfig.runtime.app?.prefix ?? "";
    const loggingEnabled = loadedConfig.framework.logging?.enabled !== false;
    const flattenedRegistry = flattenRegistry(appRegistry);
    if (loggingEnabled) {
        console.log(`[Sculptor] Mode: development | Port: ${resolvedPort}`);
    }
    validateRuntimePackages(appRegistry);
    logRegistryState(rootDir, appRegistry);
    const app = createApp();
    const container = createRuntimeContainer(appRegistry);
    const dependencyIssues = container.validate();
    if (dependencyIssues.length > 0) {
        throw new RuntimeError(dependencyIssues
            .map((issue) => issue.reason)
            .join("\n"), {
            code: "DEPENDENCY_VALIDATION_ERROR",
            details: {
                issues: dependencyIssues.map((issue) => issue.reason)
            }
        });
    }
    for (const middleware of flattenedRegistry.middlewares) {
        app.use(wrapRequestHandler(middleware));
    }
    const router = createRouter({
        controllers: flattenedRegistry.controllers,
        routes: flattenedRegistry.routes,
        prefix,
        controllerFactory: (controllerClass) => container.resolve(controllerClass)
    });
    app.use(router);
    app.use(createFrameworkErrorMiddleware(onError));
    return {
        app,
        router,
        resolvedPort,
        rootDir,
        listen
    };
};
export async function bootstrapApp(options) {
    const bootstrapped = bootstrap(options);
    if (!options.listen) {
        return {
            app: bootstrapped.app,
            router: bootstrapped.router,
            rootDir: bootstrapped.rootDir,
            port: bootstrapped.resolvedPort,
            listen: false
        };
    }
    return await new Promise((resolve) => {
        const server = bootstrapped.app.listen(bootstrapped.resolvedPort, () => {
            const address = server.address();
            const actualPort = typeof address === "object" && address !== null ? address.port : bootstrapped.resolvedPort;
            const loadedConfig = loadConfig(bootstrapped.rootDir);
            const loggingEnabled = loadedConfig.framework.logging?.enabled !== false;
            if (loggingEnabled) {
                const previousRootDir = process.env.SCULPTOR_ROOT_DIR;
                process.env.SCULPTOR_ROOT_DIR = bootstrapped.rootDir;
                try {
                    paws.system(`SculptorTS listening on port ${actualPort}\nLocal: http://localhost:${actualPort}`);
                    console.log("🐾 Sculptor ready.");
                }
                finally {
                    if (previousRootDir === undefined) {
                        delete process.env.SCULPTOR_ROOT_DIR;
                    }
                    else {
                        process.env.SCULPTOR_ROOT_DIR = previousRootDir;
                    }
                }
            }
            resolve({
                app: bootstrapped.app,
                router: bootstrapped.router,
                rootDir: bootstrapped.rootDir,
                port: bootstrapped.resolvedPort,
                listen: true,
                server
            });
        });
    });
}
export async function startApp(options = { registry: { controllers: [], routes: [], services: [] } }) {
    const result = options.listen === false
        ? await bootstrapApp({
            ...options,
            listen: false
        })
        : await bootstrapApp({
            ...options,
            listen: true
        });
    if (!result.listen) {
        return result;
    }
    return result.server;
}
//# sourceMappingURL=runtime.js.map