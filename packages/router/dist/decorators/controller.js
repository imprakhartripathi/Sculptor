import "reflect-metadata";
import { METADATA_KEYS } from "../metadata.js";
const normalizePrefix = (prefix) => {
    if (!prefix) {
        return "/";
    }
    const withLeadingSlash = prefix.startsWith("/") ? prefix : `/${prefix}`;
    return withLeadingSlash === "/" ? "/" : withLeadingSlash.replace(/\/+$/, "");
};
export const Controller = (prefix = "/") => {
    return (target) => {
        Reflect.defineMetadata(METADATA_KEYS.controllerPrefix, normalizePrefix(prefix), target);
    };
};
//# sourceMappingURL=controller.js.map