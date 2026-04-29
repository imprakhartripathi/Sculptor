import fs from "node:fs";
import path from "node:path";

import { getConfig } from "@sculptor/config";
import { paws } from "@sculptor/paws";
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

  const previousRootDir = process.env.SCULPTOR_ROOT_DIR;
  process.env.SCULPTOR_ROOT_DIR = rootDir;

  try {
    paws.log(`Registered Controllers: ${controllerCount}`);
    paws.log(`Registered Routes: ${routeCount}`);

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
      paws.warn("Unregistered Controllers Found:");
      for (const controllerName of missingControllers) {
        paws.warn(` - ${controllerName}`);
      }
    }
  } finally {
    if (previousRootDir === undefined) {
      delete process.env.SCULPTOR_ROOT_DIR;
    } else {
      process.env.SCULPTOR_ROOT_DIR = previousRootDir;
    }
  }
};
