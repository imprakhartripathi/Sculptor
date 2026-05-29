import fs from "node:fs";
import path from "node:path";
import { getConfig } from "@sculptor/config";
import { paws } from "@sculptor/paws";
const toControllerClassName = (fileName) => {
    const base = fileName.replace(/\.controller\.[^.]+$/, "").replace(/\.controller$/, "");
    return `${base
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("")}Controller`;
};
export const logRegistryState = (rootDir, registry) => {
    const controllerCount = registry.controllers.length;
    const routeCount = registry.routes.length;
    const packageRegistryPath = path.join(rootDir, "sculptor.packages.json");
    const previousRootDir = process.env.SCULPTOR_ROOT_DIR;
    process.env.SCULPTOR_ROOT_DIR = rootDir;
    try {
        paws.system(`Registered Controllers: ${controllerCount}`);
        paws.system(`Registered Routes: ${routeCount}`);
        paws.system(`Registered Packages: ${registry.packages?.length ?? 0}`);
        const srcRoot = String(getConfig("project.srcRoot", rootDir) ?? "src");
        const controllersDir = path.join(rootDir, srcRoot, "app", "controllers");
        if (fs.existsSync(packageRegistryPath)) {
            const raw = fs.readFileSync(packageRegistryPath, "utf8");
            const artifact = raw.trim() ? JSON.parse(raw) : {};
            for (const [packageName, packageRecord] of Object.entries(artifact.packages ?? {})) {
                for (const file of packageRecord.files ?? []) {
                    const filePath = path.join(rootDir, file.path);
                    if (!fs.existsSync(filePath)) {
                        paws.warn(`Missing registered file: ${file.path}`);
                    }
                }
                paws.system(`Package: ${packageName} -> ${packageRecord.path}`);
            }
        }
        const registeredNames = new Set(registry.controllers.map((controller) => controller.name));
        if (fs.existsSync(controllersDir)) {
            const missingControllers = fs
                .readdirSync(controllersDir)
                .filter((file) => /\.controller\.[cm]?[jt]sx?$/.test(file))
                .map(toControllerClassName)
                .filter((className) => !registeredNames.has(className));
            if (missingControllers.length > 0) {
                paws.warn("Unregistered controller detected.");
                for (const controllerName of missingControllers) {
                    paws.warn(`${controllerName} is not registered. Please add it to registry.ts.`);
                }
            }
        }
    }
    finally {
        if (previousRootDir === undefined) {
            delete process.env.SCULPTOR_ROOT_DIR;
        }
        else {
            process.env.SCULPTOR_ROOT_DIR = previousRootDir;
        }
    }
};
//# sourceMappingURL=warnings.js.map