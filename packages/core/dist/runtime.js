import express from "express";
import { loadConfig } from "@sculptor/config";
import { createRouter } from "@sculptor/router";
import { logRegistryState } from "./warnings.js";
export const startApp = async ({ registry: appRegistry, rootDir = process.cwd(), port }) => {
    const loadedConfig = loadConfig(rootDir);
    const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;
    const resolvedPort = port ?? envPort ?? Number(loadedConfig.runtime.app?.port ?? 3000);
    const prefix = loadedConfig.runtime.app?.prefix ?? "";
    logRegistryState(rootDir, appRegistry);
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    const router = createRouter({
        controllers: appRegistry.controllers,
        routes: appRegistry.routes,
        prefix
    });
    app.use(router);
    return await new Promise((resolve) => {
        let server;
        server = app.listen(resolvedPort, () => {
            const address = server.address();
            const actualPort = typeof address === "object" && address !== null ? address.port : resolvedPort;
            console.log(`SculptorTS listening on port ${actualPort}\nLocal: http://localhost:${actualPort}`);
            resolve(server);
        });
    });
};
//# sourceMappingURL=runtime.js.map