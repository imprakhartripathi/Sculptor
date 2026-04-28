import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../packages/cli/src/cli.js";

const repoRoot = process.cwd();

const makeTempDir = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "sculptor-app-"));

const linkDir = (source: string, destination: string): void => {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) {
    fs.rmSync(destination, { recursive: true, force: true });
  }
  fs.symlinkSync(source, destination, "junction");
};

const scaffoldFixture = async (): Promise<{ cwd: string; projectRoot: string }> => {
  const cwd = makeTempDir();
  const prompt = async (question: string, defaultValue?: string): Promise<string> => {
    if (question === "App name") return "fixture-app";
    if (question === "Version") return "1.0.0";
    if (question.startsWith("Select a scaffolding style")) return "1";
    if (question === "Framework lock") return "true";
    if (question.startsWith("Select a dev server")) return "1";
    return defaultValue ?? "";
  };

  await runCli(["node", "sc", "new"], {
    cwd,
    prompt,
    log: () => undefined,
    error: () => undefined,
    spawn: (() => ({ status: 0 })) as never
  });

  const projectRoot = path.join(cwd, "fixture-app");
  linkDir(path.join(repoRoot, "node_modules"), path.join(projectRoot, "node_modules"));

  return { cwd, projectRoot };
};

const waitForExit = async (child: ReturnType<typeof spawn>, timeoutMs = 12000): Promise<number | null> => {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Timed out waiting for process exit"));
    }, timeoutMs);

    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
};

describe("scaffolded app", () => {
  const processes: Array<ReturnType<typeof spawn>> = [];

  afterEach(() => {
    for (const child of processes) {
      child.kill("SIGTERM");
    }
    processes.length = 0;
  });

  it("boots a scaffolded app and serves health endpoints", async () => {
    const { projectRoot } = await scaffoldFixture();

    const buildChild = spawn("node", [path.join(repoRoot, "packages", "cli", "bin", "sc.js"), "build"], {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });

    processes.push(buildChild);
    await waitForExit(buildChild);

    const distMain = fs.readFileSync(path.join(projectRoot, "dist/main.js"), "utf8");
    const distRegistry = fs.readFileSync(path.join(projectRoot, "dist/registry.js"), "utf8");

    expect(distMain).toContain('startApp({ registry, rootDir: appRoot })');
    expect(distRegistry).toContain("HealthController");
    expect(distRegistry).toContain("controllers: [HealthController]");
  }, 10000);

  it("creates a scaffolded workspace on disk", async () => {
    const { projectRoot } = await scaffoldFixture();

    const rootPackage = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")
    ) as { name: string; version: string; scripts: Record<string, string>; dependencies: Record<string, string>; devDependencies: Record<string, string> };
    const sculptor = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "sculptor.json"), "utf8")
    ) as { routing: { style: string }; project: { srcRoot: string; entryFile: string; devServer: string } };

    expect(rootPackage.name).toBe("fixture-app");
    expect(rootPackage.scripts.dev).toBe("tsx src/main.ts");
    expect(rootPackage.dependencies).toEqual({
      express: "^4.21.2",
      "reflect-metadata": "^0.2.2"
    });
    expect(rootPackage.devDependencies).not.toHaveProperty("@sculptor/cli");
    expect(fs.existsSync(path.join(projectRoot, "src/main.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/registry.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/app/controllers/health.controller.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "sculptor.json"))).toBe(true);
    expect(sculptor.routing.style).toBe("decorator");
    expect(sculptor.project.srcRoot).toBe("src");
    expect(sculptor.project.entryFile).toBe("main.ts");
    expect(sculptor.project.devServer).toBe("tsx");
  });
});
