import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runCli } from "../packages/cli/src/cli.js";

const repoRoot = process.cwd();
const cliVersion = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "packages/cli/package.json"), "utf8")
) as { version: string };

const makeTempDir = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "sculptor-"));

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

describe("cli", () => {
  it("prints help", async () => {
    const logs: string[] = [];

    await runCli(["node", "sc", "help"], {
      log: (value) => logs.push(String(value))
    });

    expect(logs.join("\n")).toContain("SculptorTS CLI");
    expect(logs.join("\n")).toContain(`v${cliVersion.version}`);
  });

  it("prints version flags", async () => {
    const logs: string[] = [];

    await runCli(["node", "sc", "--version"], {
      log: (value) => logs.push(String(value))
    });

    await runCli(["node", "sc", "-v"], {
      log: (value) => logs.push(String(value))
    });

    await runCli(["node", "sc", "version"], {
      log: (value) => logs.push(String(value))
    });

    expect(logs.join("\n")).toContain("SculptorTS CLI");
    expect(logs.join("\n")).toContain(`SculptorTS CLI ${cliVersion.version}`);
  });

  it("prints the dev banner from the cli", async () => {
    const { projectRoot } = await scaffoldFixture();
    const logs: string[] = [];

    await runCli(["node", "sc", "dev"], {
      cwd: projectRoot,
      log: (value) => logs.push(String(value)),
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const expectedDevBanner = [
      "",
      "                                                                         ",
      "   ███████╗ ██████╗██╗   ██╗██╗     ██████╗ ████████╗ ██████╗ ██████╗    ",
      "   ██╔════╝██╔════╝██║   ██║██║     ██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗   ",
      "   ███████╗██║     ██║   ██║██║     ██████╔╝   ██║   ██║   ██║██████╔╝   ",
      "   ╚════██║██║     ██║   ██║██║     ██╔═══╝    ██║   ██║   ██║██╔══██╗   ",
      "   ███████║╚██████╗╚██████╔╝███████╗██║        ██║   ╚██████╔╝██║  ██║   ",
      "   ╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ",
      "                                                                         ",
      `                             SculptorTS CLI v${cliVersion.version}`
    ].join("\n");

    expect(logs[0]).toBe(expectedDevBanner);
    expect(logs.some((line) => line.startsWith("> npx tsx"))).toBe(true);
  });

  it("scaffolds a new project with prompted metadata", async () => {
    const cwd = makeTempDir();
    const calls: Array<{ command: string; args: string[] }> = [];
    const prompt = vi
      .fn()
      .mockResolvedValueOnce("demo-app")
      .mockResolvedValueOnce("2.0.0")
      .mockResolvedValueOnce("hybrid")
      .mockResolvedValueOnce("false")
      .mockResolvedValueOnce("tsx");

    await runCli(["node", "sc", "new"], {
      cwd,
      prompt,
      log: () => undefined,
      error: () => undefined,
      spawn: vi.fn((command: string, args: string[]) => {
        calls.push({ command, args });
        return { status: 0 } as const;
      }) as never
    });

    const projectRoot = path.join(cwd, "demo-app");
    const rootPackage = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")
    ) as {
      name: string;
      version: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    const sculptor = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "sculptor.json"), "utf8")
    ) as {
      routing: { style: string };
      frameworkLock: boolean;
      project: { devServer: string };
      testing: { generate: boolean; framework: string };
    };

    expect(rootPackage.name).toBe("demo-app");
    expect(rootPackage.version).toBe("2.0.0");
    expect(rootPackage.scripts.start).toBe("tsx src/main.ts");
    expect(rootPackage.scripts.dev).toBe("tsx src/main.ts");
    expect(rootPackage.dependencies).toEqual({
      express: "^4.21.2",
      "reflect-metadata": "^0.2.2"
    });
    expect(sculptor.routing.style).toBe("hybrid");
    expect(sculptor.frameworkLock).toBe(false);
    expect(sculptor.project?.devServer).toBe("tsx");
    expect(sculptor.testing).toEqual({ generate: false, framework: "vitest" });
    expect(calls).toEqual([
      { command: "npm", args: ["i"] },
      { command: "npm", args: ["i", "@sculptor/core@latest"] },
      {
        command: "npm",
        args: ["i", "-D", "@sculptor/cli@latest", "@sculptor/config@latest", "@sculptor/router@latest"]
      }
    ]);
  });

  it("uses flags without prompting for provided scaffold values", async () => {
    const cwd = makeTempDir();
    const prompt = vi.fn().mockResolvedValue("2.0.0");
    const calls: Array<{ command: string; args: string[] }> = [];

    await runCli([
      "node",
      "sc",
      "new",
      "flag-app",
      "--functional",
      "--tsx",
      "--frameworklock=false"
    ], {
      cwd,
      prompt,
      log: () => undefined,
      error: () => undefined,
      spawn: vi.fn((command: string, args: string[]) => {
        calls.push({ command, args });
        return { status: 0 } as const;
      }) as never
    });

    const projectRoot = path.join(cwd, "flag-app");
    const sculptor = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "sculptor.json"), "utf8")
    ) as {
      routing: { style: string };
      frameworkLock: boolean;
      project: { devServer: string };
      testing: { generate: boolean; framework: string };
    };

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(sculptor.routing.style).toBe("functional");
    expect(sculptor.frameworkLock).toBe(false);
    expect(sculptor.project.devServer).toBe("tsx");
    expect(sculptor.testing).toEqual({ generate: false, framework: "vitest" });
    expect(calls[0]).toEqual({ command: "npm", args: ["i"] });
  });

  it("dispatches the expected commands", async () => {
    const { projectRoot } = await scaffoldFixture();
    const cwd = projectRoot;
    fs.writeFileSync(path.join(cwd, "tsconfig.json"), "{}");
    fs.writeFileSync(path.join(cwd, "src", "main.ts"), "");
    fs.mkdirSync(path.join(cwd, "dist"), { recursive: true });
    fs.writeFileSync(path.join(cwd, "dist", "main.js"), "");

    const calls: Array<{ command: string; args: string[] }> = [];
    const spawn = vi.fn((command: string, args: string[]) => {
      calls.push({ command, args });
      return { status: 0 } as const;
    });

    await runCli(["node", "sc", "start", "--port=3001"], {
      cwd,
      spawn: spawn as never,
      log: () => undefined
    });

    await runCli(["node", "sc", "build"], {
      cwd,
      spawn: spawn as never,
      log: () => undefined
    });

    await runCli(["node", "sc", "lint"], {
      cwd,
      spawn: spawn as never,
      log: () => undefined
    });

    await runCli(["node", "sc", "test"], {
      cwd,
      spawn: spawn as never,
      log: () => undefined
    });

    await runCli(["node", "sc", "dev"], {
      cwd,
      spawn: spawn as never,
      log: () => undefined
    });

    expect(calls[0]).toEqual({
      command: "node",
      args: [path.join(cwd, "dist", "main.js")]
    });
    expect(calls[1]).toEqual({
      command: "npx",
      args: ["tsc", "-p", path.join(cwd, "tsconfig.json")]
    });
    expect(calls[2]).toEqual({
      command: "npx",
      args: ["eslint", ".", "--ext", ".ts"]
    });
    expect(calls[3]).toEqual({
      command: "npx",
      args: ["vitest", "run"]
    });
    expect(calls[4]).toEqual({
      command: "npx",
      args: ["tsx", path.join(cwd, "src", "main.ts")]
    });
  });

  it("generates controller, module, middleware, type, and route artifacts independently", async () => {
    const { projectRoot } = await scaffoldFixture();
    const cwd = projectRoot;
    fs.writeFileSync(
      path.join(cwd, "sculptor.json"),
      JSON.stringify(
        {
          project: { srcRoot: "src", entryFile: "main.ts", devServer: "tsx" },
          routing: { style: "decorator" },
          testing: { generate: true, framework: "vitest" },
          frameworkLock: true
        },
        null,
        2
      )
    );
    const logs: string[] = [];

    await runCli(["node", "sc", "g", "c", "profile"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "g", "c", "session", "--functional"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "g", "mo", "profile"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "g", "mw", "auth"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "g", "t", "user", "-i", "in", "src/app/mongodb"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "g", "r", "profile", "--functional"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    expect(fs.existsSync(path.join(cwd, "src/app/controllers/profile.controller.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/services/profile.service.ts"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, "src/app/modules/profile.module.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/services/profile.module.ts"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, "src/app/middlewares/auth.middleware.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/mongodb/user.interface.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/routes/profile.routes.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/handlers/profile.handler.ts"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, "src/app/routes/session.routes.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/handlers/session.handler.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/controllers/session.controller.ts"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, "src/app/controllers/profile.controller.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/tests/profile.controller.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/tests/profile.module.spec.ts"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, "src/tests/auth.middleware.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/tests/session.routes.spec.ts"))).toBe(true);
    expect(logs.join("\n")).toContain('Generated controller "profile"');
    expect(logs.join("\n")).toContain('Generated controller "session"');
    expect(logs.join("\n")).toContain('Generated module "profile"');
    expect(logs.join("\n")).toContain('Generated middleware "auth"');
    expect(logs.join("\n")).toContain('Generated type "user"');
    expect(logs.join("\n")).toContain('Generated route "profile"');
  });

  it("does not generate test files when tdd is disabled", async () => {
    const { projectRoot } = await scaffoldFixture();
    const cwd = projectRoot;

    await runCli(["node", "sc", "g", "c", "profile"], {
      cwd,
      log: () => undefined,
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    expect(fs.existsSync(path.join(cwd, "src/tests/profile.controller.spec.ts"))).toBe(false);
  });

  it("rejects app commands outside a sculptor app root", async () => {
    const cwd = makeTempDir();

    await expect(
      runCli(["node", "sc", "dev"], {
        cwd,
        spawn: vi.fn(() => ({ status: 0 })) as never,
        log: () => undefined,
        error: () => undefined
      })
    ).rejects.toThrow("sc dev can only be run from a Sculptor app root.");
  });
});
