import type { Server } from "node:http";
import type { BootstrapAppOptions, BootstrapAppResult, StartAppBootstrapOptions, StartAppOptions } from "./types.js";
export declare function bootstrapApp(options: BootstrapAppOptions & {
    listen: false;
}): Promise<BootstrapAppResult>;
export declare function bootstrapApp(options: BootstrapAppOptions & {
    listen?: true;
}): Promise<BootstrapAppResult & {
    server: Server;
}>;
export declare function startApp(options: StartAppBootstrapOptions): Promise<BootstrapAppResult>;
export declare function startApp(options?: StartAppOptions): Promise<Server>;
