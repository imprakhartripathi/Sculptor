import "reflect-metadata";
import { METADATA_KEYS } from "../metadata.js";
const flattenMiddlewares = (middlewares) => middlewares.flatMap((middleware) => Array.isArray(middleware) ? middleware : [middleware]);
const appendClassMiddlewares = (target, middlewares) => {
    const existing = Reflect.getOwnMetadata(METADATA_KEYS.controllerMiddlewares, target) ?? [];
    Reflect.defineMetadata(METADATA_KEYS.controllerMiddlewares, [...existing, ...middlewares], target);
};
const appendMethodMiddlewares = (target, propertyKey, middlewares) => {
    const existing = Reflect.getOwnMetadata(METADATA_KEYS.methodMiddlewares, target, propertyKey) ?? [];
    Reflect.defineMetadata(METADATA_KEYS.methodMiddlewares, [...existing, ...middlewares], target, propertyKey);
};
export const Use = (...middlewares) => (target, propertyKey) => {
    const resolvedMiddlewares = flattenMiddlewares(middlewares);
    if (propertyKey === undefined) {
        appendClassMiddlewares(target, resolvedMiddlewares);
        return;
    }
    appendMethodMiddlewares(target, propertyKey, resolvedMiddlewares);
};
//# sourceMappingURL=middleware.js.map