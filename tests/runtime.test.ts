import { afterEach, describe, expect, it, vi } from "vitest";

import { bootstrapApp } from "../packages/core/src/index.js";

describe("runtime banner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("boots without listening when requested", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    const result = await bootstrapApp({
      registry: { controllers: [], routes: [], services: [] },
      rootDir: process.cwd(),
      listen: false
    });

    const output = logs.join("\n");

    expect(result.listen).toBe(false);
    expect(result.server).toBeUndefined();
    expect(output).toContain("[Sculptor] Mode: development | Port: 3000");
    expect(output).not.toContain("SculptorTS listening on port");
  });
});
