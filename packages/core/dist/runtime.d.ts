import type { Server } from "node:http";
import type { StartAppOptions } from "./types.js";
export declare const startApp: ({ registry: appRegistry, rootDir, port }: StartAppOptions) => Promise<Server>;
