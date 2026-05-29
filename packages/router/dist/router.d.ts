import "reflect-metadata";
import express from "express";
import type { CreateRouterOptions } from "./types.js";
export declare const createRouter: ({ controllers, routes, prefix, controllerFactory }: CreateRouterOptions) => express.Router;
