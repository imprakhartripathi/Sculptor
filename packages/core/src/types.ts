import type { Router } from "express";

import type { ControllerClass } from "@sculptor/router";

export interface RegistryShape {
  controllers: ControllerClass[];
  routes: Router[];
  services: unknown[];
}

export interface StartAppOptions {
  registry: RegistryShape;
  rootDir?: string;
  port?: number;
}
