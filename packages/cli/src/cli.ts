#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

import { loadConfig } from "@sculptor/config";
import {
  controllerHelp,
  generateHelp,
  generateResourceFiles,
  middlewareHelp,
  moduleHelp,
  parseGenerateMode,
  readModeFromFlags,
  routeHelp,
  scaffoldProject,
  syncTestHarness,
  type GenerateKind,
  type ScaffoldMode,
  type ScaffoldProjectMetadata,
  typeHelp,
  type TypeVariant,
  writeGeneratedFiles
} from "./scaffold.js";

type Command = "new" | "start" | "dev" | "build" | "lint" | "test" | "generate" | "g" | "help";
type PromptFn = (question: string, defaultValue?: string) => Promise<string>;
const cliPackageVersion = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { version?: string };
const versionLabel = cliPackageVersion.version ?? "0.0.0";

export interface CliOptions {
  cwd?: string;
  prompt?: PromptFn;
  spawn?: typeof spawnSync;
  log?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}

const isCommand = (value: string): value is Command =>
  ["new", "start", "dev", "build", "lint", "test", "generate", "g", "help"].includes(value);

const isFlag = (value: string): boolean => value.startsWith("-");

const isVersionFlag = (value: string): boolean =>
  ["-v", "--v", "--version", "version", "v"].includes(value);

const sculptorCliBanner = String.raw`+-------------------------------------------------------------------------+
|                                                                         |
|   ███████╗ ██████╗██╗   ██╗██╗     ██████╗ ████████╗ ██████╗ ██████╗    |
|   ██╔════╝██╔════╝██║   ██║██║     ██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗   |
|   ███████╗██║     ██║   ██║██║     ██████╔╝   ██║   ██║   ██║██████╔╝   |
|   ╚════██║██║     ██║   ██║██║     ██╔═══╝    ██║   ██║   ██║██╔══██╗   |
|   ███████║╚██████╗╚██████╔╝███████╗██║        ██║   ╚██████╔╝██║  ██║   |
|   ╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝   |
|                                                                         |
|                             SculptorTS CLI                              |
|                                 v${versionLabel}                                  |
|                                                                         |
+-------------------------------------------------------------------------+`;

const sculptorDevBanner = (version: string): string => String.raw`
                                                                         
   ███████╗ ██████╗██╗   ██╗██╗     ██████╗ ████████╗ ██████╗ ██████╗    
   ██╔════╝██╔════╝██║   ██║██║     ██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗   
   ███████╗██║     ██║   ██║██║     ██████╔╝   ██║   ██║   ██║██████╔╝   
   ╚════██║██║     ██║   ██║██║     ██╔═══╝    ██║   ██║   ██║██╔══██╗   
   ███████║╚██████╗╚██████╔╝███████╗██║        ██║   ╚██████╔╝██║  ██║   
   ╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝   
                                                                         
                             SculptorTS CLI v${version}`;

const buildBanner = (title: string, subtitle?: string): string => {
  if (title === "SculptorTS CLI" && subtitle === `v${versionLabel}`) {
    return sculptorCliBanner;
  }

  const width = 56;
  const line = `+${"-".repeat(width - 2)}+`;
  const center = (value: string): string => {
    const text = value.length > width - 4 ? value.slice(0, width - 4) : value;
    const padding = width - 2 - text.length;
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return `|${" ".repeat(left)}${text}${" ".repeat(right)}|`;
  };

  return [
    line,
    center("   _____             _                  _____ _____  "),
    center("  / ____|           | |                / ____|_   _| "),
    center(" | (___   ___   ___ | |_ ___  _ __ ___| (___   | |   "),
    center("  \\___ \\ / _ \\ / _ \\| __/ _ \\| '__/ _ \\\\___ \\  | |   "),
    center("  ____) | (_) | (_) | || (_) | | |  __/____) |_| |_  "),
    center(" |_____/ \\___/ \\___/ \\__\\___/|_|  \\___|_____/|_____| "),
    center(""),
    center(title),
    subtitle ? center(subtitle) : center(""),
    line
  ].join("\n");
};

const printBanner = (log: (...args: unknown[]) => void, title: string, subtitle?: string): void => {
  log(buildBanner(title, subtitle));
};

const printDevBanner = (log: (...args: unknown[]) => void): void => {
  log(sculptorDevBanner(versionLabel));
};

const requireAppRoot = (cwd: string, command: string): string => {
  const sculptorConfig = path.join(cwd, "sculptor.json");

  if (!fs.existsSync(sculptorConfig)) {
    throw new Error(`${command} can only be run from a Sculptor app root.`);
  }

  return cwd;
};

const extractOutputDir = (
  args: string[]
): { args: string[]; outputDir?: string } => {
  const index = args.findIndex((arg) => arg === "in");

  if (index < 0 || index === args.length - 1) {
    return { args };
  }

  return {
    args: [...args.slice(0, index), ...args.slice(index + 2)],
    outputDir: args[index + 1]
  };
};

const getFlagValue = (args: string[], names: string[]): string | undefined => {
  for (const name of names) {
    const prefixed = `${name}=`;
    const match = args.find((arg) => arg.startsWith(prefixed));

    if (match) {
      return match.slice(prefixed.length);
    }
  }

  return undefined;
};

const getFlagPresence = (args: string[], names: string[]): boolean =>
  names.some((name) => args.includes(name) || args.some((arg) => arg.startsWith(`${name}=`)));

const getPrompt = (prompt?: PromptFn): PromptFn => {
  if (prompt) {
    return prompt;
  }

  return async (question: string, defaultValue?: string) => {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      const suffix = defaultValue ? ` [${defaultValue}]` : "";
      const answer = await rl.question(`${question}${suffix}: `);
      const trimmed = answer.trim();
      return trimmed || defaultValue || "";
    } finally {
      rl.close();
    }
  };
};

const resolveDefaultMode = (cwd: string): ScaffoldMode => {
  const config = loadConfig(cwd);
  const style = config.framework.routing?.style;

  return style === "decorator" || style === "functional" || style === "hybrid"
    ? style
    : "decorator";
};

const resolveDefaultDevServer = (cwd: string): "tsx" | "nodemon" => {
  const config = loadConfig(cwd);
  const devServer = config.framework.project?.devServer;
  return devServer === "nodemon" ? "nodemon" : "tsx";
};

const resolveTestingGenerate = (cwd: string): boolean =>
  loadConfig(cwd).framework.testing?.generate !== false;

const resolveFrameworkLock = (
  mode: ScaffoldMode,
  provided?: boolean
): boolean => {
  if (provided !== undefined) {
    return provided;
  }

  return mode !== "hybrid";
};

const parseBooleanInput = (value: string, fallback: boolean): boolean => {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (["false", "no", "0"].includes(normalized)) {
    return false;
  }

  if (["true", "yes", "1"].includes(normalized)) {
    return true;
  }

  return fallback;
};

const promptChoice = async (
  ask: PromptFn,
  question: string,
  choices: Array<{ label: string; value: string; description?: string }>,
  defaultValue: string
): Promise<string> => {
  const lines = choices
    .map((choice, index) => {
      const suffix = choice.description ? ` - ${choice.description}` : "";
      const marker = choice.value === defaultValue ? " (default)" : "";
      return `${index + 1}) ${choice.label}${suffix}${marker}`;
    })
    .join("\n");
  const answer = await ask(`${question}\n${lines}\nChoose`, defaultValue);
  const normalized = answer.trim().toLowerCase();
  const byIndex = Number.parseInt(normalized, 10);

  if (!Number.isNaN(byIndex) && byIndex >= 1 && byIndex <= choices.length) {
    return choices[byIndex - 1]!.value;
  }

  const direct = choices.find(
    (choice) =>
      choice.value.toLowerCase() === normalized || choice.label.toLowerCase() === normalized
  );

  return direct?.value ?? defaultValue;
};

const printMainHelp = (log: (...args: unknown[]) => void): void => {
  log(`${buildBanner("SculptorTS CLI", `v${versionLabel}`)}

# SculptorTS CLI

## Usage

\`\`\`bash
sc <command> [options]
\`\`\`

## Commands

- \`sc new <app>\`
- \`sc start [--port=3000] [--watch]\`
- \`sc dev [--port=3000]\`
- \`sc build\`
- \`sc lint\`
- \`sc test\`
- \`sc generate\` or \`sc g\`
- \`sc help\`
  - \`sc help generate\`
  - \`sc help controller\`
  - \`sc --version\` / \`sc -v\`
  - \`sc version\`

## Generators

- \`controller\` / \`c\`
- \`service\` / \`s\`
- \`module\` / \`m\` or \`mo\`
- \`middleware\` / \`mw\`
- \`type\` / \`t\`
- \`route\` / \`r\`
`);
};

const printHelp = (topic: string | undefined, log: (...args: unknown[]) => void): void => {
  if (!topic) {
    printMainHelp(log);
    return;
  }

  if (topic === "generate") {
    log(generateHelp);
    return;
  }

  if (topic === "controller") {
    log(controllerHelp);
    return;
  }

  if (topic === "module") {
    log(moduleHelp);
    return;
  }

  if (topic === "middleware") {
    log(middlewareHelp);
    return;
  }

  if (topic === "type") {
    log(typeHelp);
    return;
  }

  if (topic === "route") {
    log(routeHelp);
    return;
  }

  printMainHelp(log);
};

const printVersion = (log: (...args: unknown[]) => void): void => {
  printBanner(log, "SculptorTS CLI", `v${versionLabel}`);
  log(`SculptorTS CLI ${versionLabel}`);
};

const resolveProjectMetadata = async (
  args: string[],
  cwd: string,
  prompt?: PromptFn
): Promise<ScaffoldProjectMetadata> => {
  const ask = getPrompt(prompt);
  const positional = args.filter((arg) => !isFlag(arg));
  const defaultMode = resolveDefaultMode(cwd);
  const explicitMode =
    args.includes("--decorator") ||
    args.includes("--functional") ||
    args.includes("--hybrid") ||
    getFlagValue(args, ["--style"]) !== undefined;

  const appName =
    getFlagValue(args, ["--name"]) ?? positional[0] ?? (await ask("App name"));
  const version =
    getFlagValue(args, ["--version"]) ?? (await ask("Version", "0.1.0"));
  const modeInput = getFlagValue(args, ["--style"]) ??
    (explicitMode
      ? readModeFromFlags(args, defaultMode)
      : (await promptChoice(
          ask,
          "Select a scaffolding style",
          [
            { label: "Decorator", value: "decorator", description: "Class-based controllers" },
            { label: "Functional", value: "functional", description: "Express routers and handlers" },
            { label: "Hybrid", value: "hybrid", description: "Use both styles together" }
          ],
          defaultMode
        )));
  const mode =
    parseGenerateMode(modeInput, defaultMode) ?? defaultMode;

  const explicitFrameworkLock = getFlagValue(args, [
    "--frameworkLock",
    "--frameworklock",
    "--framework-lock"
  ]);
  const frameworkLock =
    explicitFrameworkLock !== undefined
      ? !["false", "0", "no"].includes(explicitFrameworkLock.toLowerCase())
      : parseBooleanInput(
          await ask("Framework lock", String(resolveFrameworkLock(mode))),
          resolveFrameworkLock(mode)
        );
  const devServerFlag = getFlagValue(args, ["--dev-server", "--devserver"])
    ?? (args.includes("--tsx") ? "tsx" : undefined)
    ?? (args.includes("--nodemon") ? "nodemon" : undefined);
  const devServer =
    devServerFlag === "nodemon" || devServerFlag === "tsx"
      ? devServerFlag
      : (await promptChoice(
          ask,
          "Select a dev server",
          [
            { label: "tsx", value: "tsx", description: "Fast TypeScript runtime" },
            { label: "nodemon", value: "nodemon", description: "Restart on file changes" }
          ],
          resolveDefaultDevServer(cwd)
        )) as "tsx" | "nodemon";

  return {
    appName,
    version,
    mode,
    frameworkLock,
    devServer,
    testing: {
      generate: true,
      framework: "vitest"
    }
  };
};

const runSpawn = (
  command: string,
  args: string[],
  cwd: string,
  spawn: typeof spawnSync,
  log: (...args: unknown[]) => void,
  env?: NodeJS.ProcessEnv
): void => {
  log(`> ${command} ${args.join(" ")}`);
  const result = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ...env
    }
  });

  if (result.status && result.status !== 0) {
    process.exit(result.status);
  }
};

const handleNew = async (
  args: string[],
  cwd: string,
  prompt: PromptFn,
  spawn: typeof spawnSync,
  log: (...args: unknown[]) => void
): Promise<void> => {
  printBanner(log, "SculptorTS CLI", `v${versionLabel}`);
  const metadata = await resolveProjectMetadata(args, cwd, prompt);
  const targetDir = path.join(cwd, metadata.appName);

  scaffoldProject(metadata, targetDir);
  runSpawn("npm", ["i"], targetDir, spawn, log);
  runSpawn("npm", ["i", "@sculptor/core@latest"], targetDir, spawn, log);
  runSpawn(
    "npm",
    ["i", "-D", "@sculptor/cli@latest", "@sculptor/config@latest", "@sculptor/router@latest"],
    targetDir,
    spawn,
    log
  );
  log(`Created SculptorTS project at ${targetDir}`);
};

const handleDev = (
  args: string[],
  cwd: string,
  spawn: typeof spawnSync,
  log: (...args: unknown[]) => void
): void => {
  const appRoot = requireAppRoot(cwd, "sc dev");
  const devServer = resolveDefaultDevServer(cwd);
  const port = getFlagValue(args, ["--port"]);

  if (port) {
    process.env.PORT = port;
  }

  printDevBanner(log);

  if (devServer === "nodemon") {
    runSpawn(
      "npx",
      [
        "nodemon",
        "--watch",
        path.join(appRoot, "src"),
        "--ext",
        "ts",
        "--exec",
        "tsx src/main.ts"
      ],
      appRoot,
      spawn,
      log,
      { SCULPTOR_SUPPRESS_BANNER: "1" }
    );
    return;
  }

  runSpawn(
    "npx",
    ["tsx", path.join(appRoot, "src/main.ts")],
    appRoot,
    spawn,
    log,
    { SCULPTOR_SUPPRESS_BANNER: "1" }
  );
};

const handleStart = (
  args: string[],
  cwd: string,
  spawn: typeof spawnSync,
  log: (...args: unknown[]) => void
): void => {
  const appRoot = requireAppRoot(cwd, "sc start");
  const port = getFlagValue(args, ["--port"]);
  const watch = getFlagPresence(args, ["--watch"]);
  const distEntry = path.join(appRoot, "dist", "main.js");
  const srcEntry = path.join(appRoot, "src", "main.ts");

  if (port) {
    process.env.PORT = port;
  }

  if (!watch && fs.existsSync(distEntry)) {
    runSpawn("node", [distEntry], appRoot, spawn, log, { SCULPTOR_SUPPRESS_BANNER: "1" });
    return;
  }

  if (watch) {
    handleDev(args, cwd, spawn, log);
    return;
  }

  runSpawn("npx", ["tsx", srcEntry], appRoot, spawn, log, { SCULPTOR_SUPPRESS_BANNER: "1" });
};

const handleBuild = (cwd: string, spawn: typeof spawnSync, log: (...args: unknown[]) => void): void => {
  const appRoot = requireAppRoot(cwd, "sc build");
  const appTsconfig = path.join(appRoot, "tsconfig.json");
  runSpawn("npx", ["tsc", "-p", appTsconfig], appRoot, spawn, log);
};

const handleLint = (cwd: string, spawn: typeof spawnSync, log: (...args: unknown[]) => void): void => {
  const appRoot = requireAppRoot(cwd, "sc lint");
  runSpawn("npx", ["eslint", ".", "--ext", ".ts"], appRoot, spawn, log);
};

const handleTest = (cwd: string, spawn: typeof spawnSync, log: (...args: unknown[]) => void): void => {
  const appRoot = requireAppRoot(cwd, "sc test");
  const runner = path.join(appRoot, "src", "tests", "runner.spec.ts");
  if (fs.existsSync(runner)) {
    runSpawn("npx", ["vitest", "run", runner], appRoot, spawn, log);
    return;
  }

  runSpawn("npx", ["vitest", "run"], appRoot, spawn, log);
};

const handleGenerate = (
  args: string[],
  cwd: string,
  prompt: PromptFn,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void
): Promise<void> => {
  const [kindInput, ...restInput] = args;

  if (!kindInput) {
    error("Usage: sc generate <controller|service|module|middleware|type|route> <name>");
    process.exit(1);
  }

  const kindMap: Record<string, GenerateKind> = {
    c: "controller",
    controller: "controller",
    s: "service",
    service: "service",
    m: "module",
    mo: "module",
    module: "module",
    mw: "middleware",
    middleware: "middleware",
    t: "type",
    type: "type",
    r: "route",
    route: "route",
    resource: "route"
  };

  const kind = kindMap[kindInput];

  if (!kind) {
    error(`Unknown generator "${kindInput}".`);
    process.exit(1);
  }

  const { args: rest, outputDir } = extractOutputDir(restInput);
  const positional = rest.filter((arg) => !isFlag(arg));
  const explicitName = positional[0];
  const fallbackMode = resolveDefaultMode(cwd);
  const devServer = resolveDefaultDevServer(cwd);
  const mode = parseGenerateMode(
    readModeFromFlags(rest, fallbackMode),
    fallbackMode
  );
  const typeVariant: TypeVariant =
    rest.includes("-interface") || rest.includes("-i")
      ? "interface"
      : rest.includes("-class") || rest.includes("-c")
        ? "class"
        : rest.includes("-enum") || rest.includes("-e")
          ? "enum"
          : "type";

  if (
    kind !== "type" &&
    !explicitName &&
    !outputDir
  ) {
    error(`Usage: sc generate ${kind} <name>`);
    process.exit(1);
  }

  if (kind === "route" && mode === "decorator") {
    error("Routers can only be scaffolded in functional or hybrid mode.");
    process.exit(1);
  }

  const appRoot = requireAppRoot(cwd, "sc generate");

  const resolvedName =
    explicitName ??
    (() => {
      if (!outputDir) {
        return "index";
      }

      const parts = outputDir.split(/[\\/]/).filter(Boolean);
      return parts[parts.length - 1] ?? "index";
    })();
  const files = generateResourceFiles(
    kind,
    resolvedName,
    mode,
    devServer,
    outputDir,
    typeVariant,
    resolveTestingGenerate(appRoot)
  );
  const targetDir = appRoot;

  writeGeneratedFiles(targetDir, files);
  if (resolveTestingGenerate(appRoot)) {
    syncTestHarness(targetDir);
  }
  log(`Generated ${kind} "${resolvedName}" using ${mode} mode.`);
  return Promise.resolve();
};

export const runCli = async (
  argv: string[] = process.argv,
  options: CliOptions = {}
): Promise<void> => {
  const cwd = options.cwd ?? process.cwd();
  const prompt = getPrompt(options.prompt);
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;
  const spawn = options.spawn ?? spawnSync;
  const [, , rawCommand, ...args] = argv;

  if (!rawCommand || rawCommand === "-h" || rawCommand === "--help") {
    printMainHelp(log);
    return;
  }

  if (isVersionFlag(rawCommand)) {
    printVersion(log);
    return;
  }

  if (!isCommand(rawCommand)) {
    if (rawCommand === "version") {
      printVersion(log);
      return;
    }
    printMainHelp(log);
    return;
  }

  switch (rawCommand) {
    case "help":
      printHelp(args[0], log);
      return;
    case "new":
      await handleNew(args, cwd, prompt, spawn, log);
      return;
    case "start":
      handleStart(args, cwd, spawn, log);
      return;
    case "dev":
      handleDev(args, cwd, spawn, log);
      return;
    case "build":
      handleBuild(cwd, spawn, log);
      return;
    case "lint":
      handleLint(cwd, spawn, log);
      return;
    case "test":
      handleTest(cwd, spawn, log);
      return;
    case "generate":
    case "g":
      await handleGenerate(args, cwd, prompt, log, error);
      return;
  }
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}

export { resolveProjectMetadata };
