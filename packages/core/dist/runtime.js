import express from "express";
import { loadConfig } from "@sculptor/config";
import { paws } from "@sculptor/paws";
import { createRouter } from "@sculptor/router";
import { logRegistryState } from "./warnings.js";
export const startApp = async ({ registry: appRegistry, rootDir = process.cwd(), port }) => {
    const loadedConfig = loadConfig(rootDir);
    const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;
    const resolvedPort = port ?? envPort ?? Number(loadedConfig.runtime.app?.port ?? 3000);
    const prefix = loadedConfig.runtime.app?.prefix ?? "";
    const loggingEnabled = loadedConfig.framework.logging?.enabled !== false;
    if (loggingEnabled) {
        console.log(`[Sculptor] Mode: development | Port: ${resolvedPort}`);
    }
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
            if (loggingEnabled) {
                const previousRootDir = process.env.SCULPTOR_ROOT_DIR;
                process.env.SCULPTOR_ROOT_DIR = rootDir;
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
            resolve(server);
        });
    });
};
//# sourceMappingURL=runtime.js.map