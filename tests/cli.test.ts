import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runCli } from "../packages/cli/src/cli.js";
import { getPackageFlagValue, stripPackageFlag } from "../packages/cli/src/package-commands.js";

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

    expect(logs[0]).toContain(`SculptorTS CLI v${cliVersion.version}`);
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
      logging: { enabled: boolean; dogMode: boolean };
      routing: { style: string };
      frameworkLock: boolean;
      project: { devServer: string };
      testing: { generate: boolean; framework: string };
    };

    expect(rootPackage.name).toBe("demo-app");
    expect(rootPackage.version).toBe("2.0.0");
    expect(rootPackage.scripts.start).toBe("tsx src/main.ts");
    expect(rootPackage.scripts.dev).toBe("tsx src/main.ts");
    expect(rootPackage.scripts.test).toBe("sc test");
    expect(rootPackage.dependencies).toEqual({
      express: "^4.21.2",
      "reflect-metadata": "^0.2.2"
    });
    expect(sculptor.logging).toEqual({ enabled: true, dogMode: true });
    expect(sculptor.routing.style).toBe("hybrid");
    expect(sculptor.frameworkLock).toBe(false);
    expect(sculptor.project?.devServer).toBe("tsx");
    expect(sculptor.testing).toEqual({ generate: true, framework: "vitest" });
    expect(fs.existsSync(path.join(projectRoot, "src/tests/main.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/tests/health.controller.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/app/health/index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/app/health/health.controller.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/app/health/health.service.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/app/health/health.repository.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/app/health/health.dto.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/app/health/health.types.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/tests/registry.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/tests/runner.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/tests/runner.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "README.md"))).toBe(true);
    expect(fs.readFileSync(path.join(projectRoot, "src/tests/registry.ts"), "utf8")).toContain(
      "./main.spec.js"
    );
    expect(fs.readFileSync(path.join(projectRoot, "src/tests/runner.ts"), "utf8")).toContain(
      'await import(spec);'
    );
    expect(calls).toEqual([
      { command: "npm", args: ["i"] },
      { command: "npm", args: ["i", "@sculptor/core@latest", "@sculptor/paws@latest"] },
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
      logging: { enabled: boolean; dogMode: boolean };
      routing: { style: string };
      frameworkLock: boolean;
      project: { devServer: string };
      testing: { generate: boolean; framework: string };
    };

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(sculptor.logging).toEqual({ enabled: true, dogMode: true });
    expect(sculptor.routing.style).toBe("functional");
    expect(sculptor.frameworkLock).toBe(false);
    expect(sculptor.project.devServer).toBe("tsx");
    expect(sculptor.testing).toEqual({ generate: true, framework: "vitest" });
    expect(fs.existsSync(path.join(projectRoot, "src/tests/main.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/tests/health.route.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/app/health/health.route.handler.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/app/health/health.route.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/tests/registry.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/tests/runner.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/tests/runner.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "README.md"))).toBe(true);
    expect(fs.readFileSync(path.join(projectRoot, "README.md"), "utf8")).toContain(
      "@sculptor/paws"
    );
    expect(fs.readFileSync(path.join(projectRoot, "src/tests/registry.ts"), "utf8")).toContain(
      "./main.spec.js"
    );
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
      args: ["vitest", "run", path.join(cwd, "src", "tests", "runner.spec.ts")]
    });
    expect(calls[4]).toEqual({
      command: "npx",
      args: ["tsx", path.join(cwd, "src", "main.ts")]
    });
  });

  it("installs dependencies inside a sculptor app and supports the i alias", async () => {
    const { projectRoot } = await scaffoldFixture();
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawn = vi.fn((command: string, args: string[]) => {
      calls.push({ command, args });
      return { status: 0 } as const;
    });

    await runCli(["node", "sc", "install", "deps"], {
      cwd: projectRoot,
      spawn: spawn as never,
      log: () => undefined
    });

    await runCli(["node", "sc", "i", "deps"], {
      cwd: projectRoot,
      spawn: spawn as never,
      log: () => undefined
    });

    expect(calls).toEqual([
      { command: "npm", args: ["i"] },
      { command: "npm", args: ["i", "@sculptor/core@latest", "@sculptor/paws@latest"] },
      {
        command: "npm",
        args: ["i", "-D", "@sculptor/cli@latest", "@sculptor/config@latest", "@sculptor/router@latest"]
      },
      { command: "npm", args: ["i"] },
      { command: "npm", args: ["i", "@sculptor/core@latest", "@sculptor/paws@latest"] },
      {
        command: "npm",
        args: ["i", "-D", "@sculptor/cli@latest", "@sculptor/config@latest", "@sculptor/router@latest"]
      }
    ]);
  });

  it("updates only the global sculptor cli outside an app root", async () => {
    const cwd = makeTempDir();
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawn = vi.fn((command: string, args: string[]) => {
      calls.push({ command, args });
      return { status: 0 } as const;
    });

    await runCli(["node", "sc", "update"], {
      cwd,
      spawn: spawn as never,
      log: () => undefined
    });

    expect(calls).toEqual([
      {
        command: "npm",
        args: ["install", "-g", "@sculptor/cli@latest"]
      }
    ]);
  });

  it("generates exact package names and preserves manual code outside generated markers", async () => {
    const { projectRoot } = await scaffoldFixture();
    const cwd = projectRoot;
    const logs: string[] = [];

    await runCli(["node", "sc", "g", "pkg", "user"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const packageIndex = path.join(cwd, "src", "app", "user", "index.ts");
    const registryFile = path.join(cwd, "sculptor.packages.json");
    const rootRegistryFile = path.join(cwd, "src", "registry.ts");

    expect(fs.existsSync(packageIndex)).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src", "app", "users", "index.ts"))).toBe(false);
    expect(fs.readFileSync(packageIndex, "utf8")).toContain('name: "user"');
    expect(fs.readFileSync(packageIndex, "utf8")).toContain("[sculptor:imports:start]");
    expect(fs.readFileSync(registryFile, "utf8")).toContain('"user"');
    expect(fs.readFileSync(rootRegistryFile, "utf8")).toContain("UserPackage");

    fs.appendFileSync(
      packageIndex,
      "\n// manual note\nexport const preserved = true;\n"
    );

    await runCli(["node", "sc", "reg", "src/app/user/user.service.ts"], {
      cwd,
      prompt: async () => "y",
      log: () => undefined,
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "reg", "pkg", "user"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const updatedIndex = fs.readFileSync(packageIndex, "utf8");
    expect(updatedIndex).toContain("// manual note");
    expect(updatedIndex).toContain('name: "user"');
    expect(logs.join("\n")).toContain('Registered package "user" in src/registry.ts');

    const treeLogs: string[] = [];
    await runCli(["node", "sc", "ls", "-t", "-p=user"], {
      cwd,
      log: (value) => treeLogs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const treeOutput = treeLogs.join("\n");
    expect(treeOutput).toContain("user (src/app/user)");
    expect(treeOutput).not.toContain("users (src/app/users)");

    const pkgLogs: string[] = [];
    await runCli(["node", "sc", "pkg", "user"], {
      cwd,
      log: (value) => pkgLogs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const pkgOutput = pkgLogs.join("\n");
    expect(pkgOutput).toContain("Package: user");
    expect(pkgOutput).not.toContain("users");
  });

  it("supports package command and flag aliases", async () => {
    expect(getPackageFlagValue(["-p=user"])).toBe("user");
    expect(getPackageFlagValue(["--p=user"])).toBe("user");
    expect(getPackageFlagValue(["-pkg=user"])).toBe("user");
    expect(getPackageFlagValue(["--pkg=user"])).toBe("user");
    expect(getPackageFlagValue(["-package=user"])).toBe("user");
    expect(getPackageFlagValue(["--package=user"])).toBe("user");
    expect(getPackageFlagValue(["-p", "user"])).toBe("user");
    expect(getPackageFlagValue(["--pkg", "user"])).toBe("user");
    expect(getPackageFlagValue(["--package", "user"])).toBe("user");
    expect(stripPackageFlag(["profile", "-pkg=user", "in", "src/app"])).toEqual([
      "profile",
      "in",
      "src/app"
    ]);
    expect(stripPackageFlag(["profile", "--package", "user", "in", "src/app"])).toEqual([
      "profile",
      "in",
      "src/app"
    ]);

    const { projectRoot } = await scaffoldFixture();
    const cwd = projectRoot;

    await runCli(["node", "sc", "g", "pkg", "user"], {
      cwd,
      log: () => undefined,
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const logs: string[] = [];
    await runCli(["node", "sc", "package", "user"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    expect(logs.join("\n")).toContain("Package: user");
  });

  it("supports register and listing command aliases", async () => {
    const { projectRoot } = await scaffoldFixture();
    const cwd = projectRoot;

    await runCli(["node", "sc", "g", "pkg", "user"], {
      cwd,
      log: () => undefined,
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const logs: string[] = [];

    await runCli(["node", "sc", "register", "src/app/user/user.service.ts"], {
      cwd,
      prompt: async () => "y",
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "list", "-t", "-p=user"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "r", "src/app/user/user.service.ts"], {
      cwd,
      prompt: async () => "y",
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "unreg", "src/app/user/user.service.ts"], {
      cwd,
      prompt: async () => "y",
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "unregister", "src/app/user/user.service.ts"], {
      cwd,
      prompt: async () => "y",
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "ur", "src/app/user/user.service.ts"], {
      cwd,
      prompt: async () => "y",
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "remove", "src/app/user/user.service.ts"], {
      cwd,
      prompt: async () => "y",
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const output = logs.join("\n");
    expect(output).toContain('Registering "src/app/user/user.service.ts" inside package "user" at path = src/app/user/user.service.ts');
    expect(output).toContain("user (src/app/user)");
    expect(output).toContain('Unregistering "src/app/user/user.service.ts" inside package "user" at path = src/app/user/user.service.ts');
    expect(output).toContain('Removing "src/app/user/user.service.ts" inside package "user" at path = src/app/user/user.service.ts');
    expect(output).toContain("Registered src/app/user/user.service.ts");
    expect(output).toContain("Unregistered src/app/user/user.service.ts");
    expect(output).toContain("Removed src/app/user/user.service.ts");
  });

  it("supports removing a package through the rm pkg alias", async () => {
    const { projectRoot } = await scaffoldFixture();
    const cwd = projectRoot;

    await runCli(["node", "sc", "g", "pkg", "user"], {
      cwd,
      log: () => undefined,
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const logs: string[] = [];
    await runCli(["node", "sc", "rm", "pkg", "user"], {
      cwd,
      prompt: async () => "y",
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    expect(logs.join("\n")).toContain('Removed package "user".');
    expect(fs.existsSync(path.join(cwd, "src", "app", "user"))).toBe(false);
    expect(fs.readFileSync(path.join(cwd, "src", "registry.ts"), "utf8")).not.toContain("UserPackage");
  });

  it("generates AGENTS.md with package-aware guidance", async () => {
    const { projectRoot } = await scaffoldFixture();
    const cwd = projectRoot;
    const logs: string[] = [];

    await runCli(["node", "sc", "agents"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "agents", "refresh"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const agentsPath = path.join(cwd, "AGENTS.md");
    const agents = fs.readFileSync(agentsPath, "utf8");

    expect(fs.existsSync(agentsPath)).toBe(true);
    expect(agents).toContain("Sculptor CLI");
    expect(agents).toContain("Package Architecture");
    expect(agents).toContain("Exact package names");
    expect(agents).toContain("sc agents refresh");
    expect(logs.join("\n")).toContain("Wrote AGENTS.md");
  });

  it("runs doctor diagnostics without mutating the project", async () => {
    const cwd = makeTempDir();
    const appRoot = path.join(cwd, "doctor-app");
    fs.mkdirSync(path.join(appRoot, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(appRoot, "sculptor.json"),
      JSON.stringify(
        {
          framework: {
            project: {
              srcRoot: "src"
            }
          }
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(appRoot, "package.json"),
      JSON.stringify(
        {
          name: "doctor-app",
          version: "1.0.0",
          dependencies: {
            "@sculptor/cli": cliVersion.version
          }
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(appRoot, "src", "registry.ts"),
      `export const registry = {\n  packages: [],\n  controllers: [],\n  routes: [],\n  services: [],\n  repositories: [],\n  middlewares: []\n};\n`
    );

    const logs: string[] = [];

    await runCli(["node", "sc", "doctor"], {
      cwd: appRoot,
      log: (value) => logs.push(String(value)),
      error: (value) => logs.push(String(value)),
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    const output = logs.join("\n");
    expect(output).toContain("Sculptor doctor");
    expect(output).toContain(`CLI version: ${cliVersion.version}`);
    expect(output).toContain("Package-aware registry shape detected.");
    expect(output).toContain("@sculptor/cli");
    expect(output).toContain("matches CLI version");
  });

  it("rejects update inside a sculptor app root", async () => {
    const { projectRoot } = await scaffoldFixture();

    await expect(
      runCli(["node", "sc", "update"], {
        cwd: projectRoot,
        spawn: vi.fn(() => ({ status: 0 })) as never,
        log: () => undefined,
        error: () => undefined
      })
    ).rejects.toThrow("sc update can only be run outside a Sculptor app root.");
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

    await runCli(["node", "sc", "g", "c", "alias", "in", "src.app.alias"], {
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

    await runCli(["node", "sc", "g", "r", "profile"], {
      cwd,
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    await runCli(["node", "sc", "reg", "c", "profile"], {
      cwd,
      prompt: async () => "y",
      log: (value) => logs.push(String(value)),
      error: () => undefined,
      spawn: vi.fn(() => ({ status: 0 })) as never
    });

    expect(fs.existsSync(path.join(cwd, "src/app/controllers/profile.controller.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/alias/alias.controller.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/services/profile.service.ts"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, "src/app/modules/profile.module.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/services/profile.module.ts"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, "src/app/middlewares/auth.middleware.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/mongodb/user.interface.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/routes/profile.route.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/handlers/profile.route.handler.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/handlers/profile.handler.ts"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, "src/app/routes/session.route.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/controllers/session.controller.ts"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, "src/app/handlers/session.route.handler.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/app/controllers/profile.controller.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/tests/profile.controller.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/tests/profile.route.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/tests/auth.middleware.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/tests/session.route.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/tests/registry.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/tests/runner.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "src/tests/runner.spec.ts"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "README.md"))).toBe(true);
    expect(fs.readFileSync(path.join(cwd, "README.md"), "utf8")).toContain(
      "logging.enabled"
    );
    expect(
      fs.readFileSync(path.join(cwd, "src/tests/registry.ts"), "utf8")
    ).toContain("./profile.controller.spec.js");
    expect(
      fs.readFileSync(path.join(cwd, "src/tests/runner.ts"), "utf8")
    ).toContain('await import(spec);');
    expect(logs.join("\n")).toContain('Generated controller "profile"');
    expect(logs.join("\n")).toContain('Generated controller "session"');
    expect(logs.join("\n")).toContain('Generated module "profile"');
    expect(logs.join("\n")).toContain('Generated middleware "auth"');
    expect(logs.join("\n")).toContain('Generated type "user"');
    expect(logs.join("\n")).toContain('Generated route "profile"');
    expect(logs.join("\n")).toContain(
      'Registering "profile.controller.ts" at path = src/app/controllers/profile.controller.ts'
    );
  });

  it("does not generate test files when tdd is disabled", async () => {
    const { projectRoot } = await scaffoldFixture();
    const cwd = projectRoot;
    fs.writeFileSync(
      path.join(cwd, "sculptor.json"),
      JSON.stringify(
        {
          project: { srcRoot: "src", entryFile: "main.ts", devServer: "tsx" },
          routing: { style: "decorator" },
          testing: { generate: false, framework: "vitest" },
          frameworkLock: true
        },
        null,
        2
      )
    );

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
