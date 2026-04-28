import "reflect-metadata";

import { METADATA_KEYS } from "../metadata.js";

const normalizePrefix = (prefix: string): string => {
  if (!prefix) {
    return "/";
  }

  const withLeadingSlash = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return withLeadingSlash === "/" ? "/" : withLeadingSlash.replace(/\/+$/, "");
};

export const Controller = (prefix = "/"): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(
      METADATA_KEYS.controllerPrefix,
      normalizePrefix(prefix),
      target
    );
  };
};
