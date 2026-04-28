import "reflect-metadata";
import { METADATA_KEYS } from "./metadata.js";
const listControllerMethods = (prototype) => {
    const names = new Set();
    let cursor = prototype;
    while (cursor && cursor !== Object.prototype) {
        for (const name of Object.getOwnPropertyNames(cursor)) {
            if (name === "constructor" || names.has(name)) {
                continue;
            }
            const descriptor = Object.getOwnPropertyDescriptor(cursor, name);
            if (descriptor && typeof descriptor.value === "function") {
                names.add(name);
            }
        }
        cursor = Object.getPrototypeOf(cursor);
    }
    return [...names];
};
const toRouteDefinitions = (prototype, methodName) => {
    const routeMetadata = Reflect.getMetadata(METADATA_KEYS.methodRoutes, prototype, methodName) ?? [];
    if (routeMetadata.length === 0) {
        return [];
    }
    const methodMiddlewares = Reflect.getMetadata(METADATA_KEYS.methodMiddlewares, prototype, methodName) ?? [];
    return routeMetadata.map((route) => ({
        method: route.method,
        path: route.path,
        propertyKey: methodName,
        middlewares: [...methodMiddlewares]
    }));
};
export const scanController = (controllerClass) => {
    const prefix = Reflect.getMetadata(METADATA_KEYS.controllerPrefix, controllerClass);
    if (prefix === undefined) {
        throw new TypeError(`Controller "${controllerClass.name}" is missing @Controller() decorator.`);
    }
    const controllerMiddlewares = Reflect.getMetadata(METADATA_KEYS.controllerMiddlewares, controllerClass) ?? [];
    const methods = listControllerMethods(controllerClass.prototype);
    const routes = methods.flatMap((methodName) => toRouteDefinitions(controllerClass.prototype, methodName));
    return {
        prefix,
        middlewares: [...controllerMiddlewares],
        routes
    };
};
//# sourceMappingURL=scanner.js.map