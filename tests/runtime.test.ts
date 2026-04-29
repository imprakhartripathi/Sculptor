import { afterEach, describe, expect, it, vi } from "vitest";

import { startApp } from "../packages/core/src/index.js";

describe("runtime banner", () => {
  let server: Awaited<ReturnType<typeof startApp>> | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();

    if (!server) {
      return;
    }

    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    server = undefined;
  });

  it("prints the updated dev server banner with version", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    server = await startApp({
      registry: { controllers: [], routes: [], services: [] },
      rootDir: process.cwd(),
      port: 0
    });

    const output = logs.join("\n");

    expect(output).not.toContain("SculptorTS Server");
    expect(output).not.toContain("Booting application");
    expect(output).toContain("[Sculptor] Mode: development | Port: 0");
    expect(output).toMatch(/SculptorTS listening on port \d+\nLocal: http:\/\/localhost:\d+/);
    expect(output).toContain("🐾 Sculptor ready.");
  });
});
