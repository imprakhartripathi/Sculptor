import "reflect-metadata";
import { METADATA_KEYS } from "../metadata.js";
const normalizeRoutePath = (path) => {
    if (!path || path === "/") {
        return "/";
    }
    return path.startsWith("/") ? path : `/${path}`;
};
const appendRouteMetadata = (target, propertyKey, route) => {
    const existing = Reflect.getOwnMetadata(METADATA_KEYS.methodRoutes, target, propertyKey) ?? [];
    Reflect.defineMetadata(METADATA_KEYS.methodRoutes, [...existing, route], target, propertyKey);
};
const createMethodDecorator = (method) => (path = "/") => {
    return (target, propertyKey) => {
        appendRouteMetadata(target, propertyKey, {
            method,
            path: normalizeRoutePath(path)
        });
    };
};
export const Get = createMethodDecorator("get");
export const Post = createMethodDecorator("post");
export const Put = createMethodDecorator("put");
export const Delete = createMethodDecorator("delete");
//# sourceMappingURL=methods.js.map