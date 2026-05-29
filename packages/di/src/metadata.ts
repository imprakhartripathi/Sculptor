import "reflect-metadata";

export const DI_METADATA_KEYS = {
  service: "sculptor:di:service",
  repository: "sculptor:di:repository",
  middleware: "sculptor:di:middleware",
  autoInjectConstructor: "sculptor:di:auto-inject:constructor",
  autoInjectProperty: "sculptor:di:auto-inject:property",
  package: "sculptor:di:package"
} as const;
