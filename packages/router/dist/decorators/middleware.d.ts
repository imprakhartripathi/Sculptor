import "reflect-metadata";
import type { RequestHandler } from "express";
type MiddlewareInput = RequestHandler | RequestHandler[];
export declare const Use: (...middlewares: MiddlewareInput[]) => ClassDecorator & MethodDecorator;
export {};
