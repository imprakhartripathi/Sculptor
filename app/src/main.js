import { startApp } from "@sculptor/core";
import { fileURLToPath } from "node:url";
import { registry } from "./registry.js";
const appRoot = fileURLToPath(new URL("..", import.meta.url));
void startApp({ registry, rootDir: appRoot });
