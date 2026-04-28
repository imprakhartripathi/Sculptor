import fs from "node:fs";
import path from "node:path";

import { getConfig } from "@sculptor/config";
import type { RegistryShape } from "./types.js";

const toControllerClassName = (fileName: string): string => {
  const base = fileName.replace(/\.controller\.[^.]+$/, "").replace(/\.controller$/, "");
  return `${base
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}Controller`;
};

export const logRegistryState = (rootDir: string, registry: RegistryShape): void => {
  const controllerCount = registry.controllers.length;
  const routeCount = registry.routes.length;

  console.log(`Registered Controllers: ${controllerCount}`);
  console.log(`Registered Routes: ${routeCount}`);

  const srcRoot = String(getConfig("project.srcRoot", rootDir) ?? "src");
  const controllersDir = path.join(rootDir, srcRoot, "app", "controllers");

  if (!fs.existsSync(controllersDir)) {
    return;
  }

  const registeredNames = new Set(
    registry.controllers.map((controller) => controller.name)
  );

  const missingControllers = fs
    .readdirSync(controllersDir)
    .filter((file) => /\.controller\.[cm]?[jt]sx?$/.test(file))
    .map(toControllerClassName)
    .filter((className) => !registeredNames.has(className));

  if (missingControllers.length > 0) {
    console.warn("⚠ Unregistered Controllers Found:");
    for (const controllerName of missingControllers) {
      console.warn(` - ${controllerName}`);
    }
  }
};
