import { HealthController } from "./app/controllers/health.controller.js";
import { healthRoutes } from "./app/routes/health.routes.js";
import { HealthService } from "./app/services/health.service.js";
export const registry = {
    controllers: [HealthController],
    routes: [healthRoutes],
    services: [HealthService]
};
