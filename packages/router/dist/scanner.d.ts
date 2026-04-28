import "reflect-metadata";
import type { ControllerClass, ControllerMetadata } from "./types.js";
export declare const scanController: <TInstance>(controllerClass: ControllerClass<TInstance>) => ControllerMetadata;
