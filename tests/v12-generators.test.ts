import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../packages/cli/src/cli.js";

const makeProject = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sculptor-v12-"));
  fs.writeFileSync(path.join(root, "sculptor.json"), "{}\n");
  return root;
};

describe("v1.2 generators", () => {
  it("generates non-package codecs and validators at project root", async () => {
    const root = makeProject();

    await runCli(["node", "sc", "g", "codec", "uuid"], {
      cwd: root,
      log: () => undefined
    });
    await runCli(["node", "sc", "g", "validator", "isPositive"], {
      cwd: root,
      log: () => undefined
    });

    const codecPath = path.join(root, "codec", "uuid.codec.ts");
    const validatorPath = path.join(root, "validator", "isPositive.validator.ts");

    expect(fs.existsSync(codecPath)).toBe(true);
    expect(fs.existsSync(validatorPath)).toBe(true);
    expect(fs.readFileSync(codecPath, "utf8")).toContain('import type { Codec } from "@sculptor/router";');
    expect(fs.readFileSync(validatorPath, "utf8")).toContain('import type { Validator } from "@sculptor/router";');
  });

  it("generates package-local helpers directly in the detected package root", async () => {
    const root = makeProject();

    await runCli(["node", "sc", "g", "pkg", "users"], {
      cwd: root,
      log: () => undefined
    });
    await runCli(["node", "sc", "g", "codec", "uuid", "--package=users"], {
      cwd: root,
      log: () => undefined
    });
    await runCli(["node", "sc", "g", "validator", "isPositive", "--package=users"], {
      cwd: root,
      log: () => undefined
    });

    expect(fs.existsSync(path.join(root, "src", "app", "users", "uuid.codec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src", "app", "users", "isPositive.validator.ts"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src", "app", "users", "codec", "uuid.codec.ts"))).toBe(false);
    expect(fs.existsSync(path.join(root, "src", "app", "users", "validator", "isPositive.validator.ts"))).toBe(false);
  });
});
