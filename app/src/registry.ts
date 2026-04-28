import { HealthController } from "./app/controllers/health.controller.js";
import { healthRoutes } from "./app/routes/health.routes.js";
import { HealthService } from "./app/services/health.service.js";
import type { RegistryShape } from "@sculptor/core";

export const registry: RegistryShape = {
  controllers: [HealthController],
  routes: [healthRoutes],
  services: [HealthService]
};
