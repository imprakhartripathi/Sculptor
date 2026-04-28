import { Controller, Get } from "@sculptor/core";

@Controller("/health")
export class HealthController {
  @Get("/")
  health() {
    return { status: "ok" };
  }

  @Get("/ping")
  ping() {
    return { message: "pong" };
  }
}
