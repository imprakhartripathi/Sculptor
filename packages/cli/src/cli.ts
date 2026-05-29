#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

import { loadConfig } from "@sculptor/config";
import {
  getConfigValue,
  listConfigEntries,
  setConfigValue
} from "./config-commands.js";
import {
  getPackageFlagValue,
  handleLsCommand,
  ensureRootRegistryForPackages,
  handlePackageCommand,
  handleRegisterCommand,
  handleSyncCommand,
  stripPackageFlag,
  validatePackageRegistryState
} from "./package-commands.js";
import {
  getOwningPackage,
  loadPackageRegistry,
  savePackageRegistry,
  syncPackageRegistry,
  updatePackageIndexForRecord,
  upsertFileIntoRegistry
} from "./package-registry.js";
import { writeAgentsMarkdown } from "./agents.js";
import { detectPackageManager, globalInstallArgsFor } from "./package-manager.js";
import {
  createDoctorReport,
  hasDoctorErrors,
  printDoctorReport
} from "./diagnostics.js";
import {
  controllerHelp,
  dtoHelp,
  generateHelp,
  generateResourceFiles,
  middlewareHelp,
  moduleHelp,
  parseGenerateMode,
  readModeFromFlags,
  routeHelp,
  scaffoldProject,
  syncTestHarness,
  repositoryHelp,
  type GenerateKind,
  type ScaffoldMode,
  type ScaffoldProjectMetadata,
  typeHelp,
  type TypeVariant,
  writeGeneratedFiles
} from "./scaffold.js";
import { loadPluginModule, resolvePluginManifest } from "./plugins.js";

type Command =
  | "new"
  | "start"
  | "dev"
  | "build"
  | "lint"
  | "test"
  | "sync"
  | "install"
  | "i"
  | "update"
  | "generate"
  | "g"
  | "pkg"
  | "package"
  | "ls"
  | "list"
  | "reg"
  | "register"
  | "r"
  | "ureg"
  | "unreg"
  | "unregister"
  | "ur"
  | "rm"
  | "remove"
  | "help"
  | "config"
  | "add"
  | "agents"
  | "doctor";
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
  [
    "new",
    "start",
    "dev",
    "build",
    "lint",
    "test",
    "sync",
    "install",
    "i",
    "update",
    "generate",
    "g",
    "pkg",
    "package",
    "ls",
    "list",
    "reg",
    "register",
    "r",
    "ureg",
    "unreg",
    "unregister",
    "ur",
    "rm",
    "remove",
    "help",
    "config",
    "add",
    "agents",
    "doctor"
  ].includes(value);

const isFlag = (value: string): boolean => value.startsWith("-");

const isVersionFlag = (value: string): boolean =>
  ["-v", "--v", "--version", "version", "v"].includes(value);

const sculptorCliBanner = String.raw`
                                                                         
   ███████╗ ██████╗██╗   ██╗██╗     ██████╗ ████████╗ ██████╗ ██████╗    
   ██╔════╝██╔════╝██║   ██║██║     ██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗   
   ███████╗██║     ██║   ██║██║     ██████╔╝   ██║   ██║   ██║██████╔╝   
   ╚════██║██║     ██║   ██║██║     ██╔═══╝    ██║   ██║   ██║██╔══██╗   
   ███████║╚██████╗╚██████╔╝███████╗██║        ██║   ╚██████╔╝██║  ██║   
   ╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝   
                                                                         
                        SculptorTS CLI v${versionLabel}`;

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
    center("   _____               _                           "),
    center("  / ____|             | |      _______             "),
    center(" | (___   ____  _   _ | | ____|_______|____  _ __  "),
    center("  \\___ \\ ___|| | | || |/ _ \\  | | /  _  \/ '__| "),
    center("  ____) | (___ | |_| || || (_) / | | | (_) || |    "),
    center(" |_____/ \\___/\\___/ \\_|_\\ /  |_| \_____/|_|    "),
    center("                         | |                       "),
    center("                         |_|                       "),



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

const findAppRoot = (cwd: string): string | undefined => {
  let current = path.resolve(cwd);

  for (;;) {
    if (fs.existsSync(path.join(current, "sculptor.json"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
};

const requireOutsideAppRoot = (cwd: string, command: string): string => {
  const appRoot = findAppRoot(cwd);

  if (appRoot) {
    throw new Error(`${command} can only be run outside a Sculptor app root.`);
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

const resolveRegisteredPackagePath = (cwd: string, packageName: string): string | undefined => {
  const registry = loadPackageRegistry(cwd);

  for (const record of Object.values(registry.packages)) {
    if (record.name === packageName) {
      return record.path;
    }
  }

  return undefined;
};

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
- \`sc sync\`
- \`sc ls\`
- \`sc list\`
- \`sc pkg\`
- \`sc package\`
- \`sc reg <file>\` / \`sc register <file>\` / \`sc r <file>\`
- \`sc ureg <file>\` / \`sc unreg <file>\` / \`sc unregister <file>\` / \`sc ur <file>\`
- \`sc rm <file>\` / \`sc remove <file>\`
- \`sc install deps\`
- \`sc update\`
- \`sc doctor\`
- \`sc generate\` or \`sc g\`
- \`sc config <get|set|list>\`
- \`sc add <plugin>\`
- \`sc agents\`
- \`sc agents refresh\`
- \`sc help\`
  - \`sc help generate\`
  - \`sc help controller\`
  - \`sc help repository\`
  - \`sc help dto\`
  - \`sc help pkg\`
  - \`sc help package\`
  - \`sc help ls\`
  - \`sc help list\`
  - \`sc --version\` / \`sc -v\`
  - \`sc version\`

## Generators

- \`controller\` / \`c\`
- \`service\` / \`s\`
- \`module\` / \`m\` or \`mo\`
- \`middleware\` / \`mw\`
- \`repository\` / \`repo\`
- \`dto\` / \`dto\`
- \`type\` / \`t\`
- \`route\` / \`r\`
- \`pkg\`
- \`package\`

## Binary Alias

- \`sculptor\` is equivalent to \`sc\`
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

  if (topic === "repository") {
    log(repositoryHelp);
    return;
  }

  if (topic === "dto") {
    log(dtoHelp);
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

  if (topic === "config") {
    log(`# Config\n\nUse \`sc config get\`, \`sc config set\`, or \`sc config list\`.`);
    return;
  }

  if (topic === "sync") {
    log(`# Sync\n\nUse \`sc sync\` to refresh \`sculptor.packages.json\`.`);
    return;
  }

  if (topic === "pkg") {
    log(`# Package\n\nUse \`sc pkg <name>\`, \`sc package <name>\`, \`sc pkg ls\`, or \`sc pkg rm <name>\`.\nPackage names are exact and are not normalized.`);
    return;
  }

  if (topic === "package") {
    log(`# Package\n\nUse \`sc pkg <name>\`, \`sc package <name>\`, \`sc pkg ls\`, or \`sc pkg rm <name>\`.\nPackage names are exact and are not normalized.`);
    return;
  }

  if (topic === "ls") {
    log(`# List\n\nUse \`sc ls\` or \`sc list\`, and \`sc ls -t\` for tree view.`);
    return;
  }

  if (topic === "list") {
    log(`# List\n\nUse \`sc ls\` or \`sc list\`, and \`sc ls -t\` for tree view.`);
    return;
  }

  if (topic === "reg" || topic === "register" || topic === "r") {
    log(`# Register\n\nUse \`sc reg <file>\`, \`sc register <file>\`, or \`sc r <file>\``);
    return;
  }

  if (topic === "ureg" || topic === "unreg" || topic === "unregister" || topic === "ur") {
    log(`# Unregister\n\nUse \`sc ureg <file>\`, \`sc unreg <file>\`, \`sc unregister <file>\`, or \`sc ur <file>\``);
    return;
  }

  if (topic === "rm" || topic === "remove") {
    log(`# Remove\n\nUse \`sc rm <file>\` or \`sc remove <file>\``);
    return;
  }

  if (topic === "install") {
    log(`# Install\n\nUsage: \`sc install deps\` or \`sc i deps\``);
    return;
  }

  if (topic === "update") {
    log(`# Update\n\nUsage: \`sc update\`\n\nUpdates the globally installed Sculptor CLI package.`);
    return;
  }

  if (topic === "doctor") {
    log(`# Doctor\n\nUsage: \`sc doctor\`\n\nRuns diagnostics for the current Sculptor project and package registry.`);
    return;
  }

  if (topic === "add") {
    log(`# Add\n\nUsage: \`sc add <plugin>\``);
    return;
  }

  if (topic === "agents") {
    log(`# Agents\n\nUsage: \`sc agents\` or \`sc agents refresh\`\n\nWrites \`AGENTS.md\` in the current directory.`);
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

const installScaffoldDependencies = (
  cwd: string,
  spawn: typeof spawnSync,
  log: (...args: unknown[]) => void
): void => {
  runSpawn("npm", ["i"], cwd, spawn, log);
  runSpawn(
    "npm",
    ["i", "@sculptor/core@latest", "@sculptor/paws@latest"],
    cwd,
    spawn,
    log
  );
  runSpawn(
    "npm",
    ["i", "-D", "@sculptor/cli@latest", "@sculptor/config@latest", "@sculptor/router@latest"],
    cwd,
    spawn,
    log
  );
};

const updateGlobalCliPackage = (
  cwd: string,
  spawn: typeof spawnSync,
  log: (...args: unknown[]) => void
): void => {
  const packageManager = detectPackageManager();

  runSpawn(
    packageManager,
    globalInstallArgsFor(packageManager, ["@sculptor/cli@latest"]),
    cwd,
    spawn,
    log
  );
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

  const scaffolded = await scaffoldProject(metadata, targetDir, {
    cwd,
    prompt,
    spawn,
    log,
    error: () => undefined
  });

  if (!scaffolded) {
    return;
  }
  installScaffoldDependencies(targetDir, spawn, log);
  log(`Created SculptorTS project at ${targetDir}`);
};

const handleInstall = (
  args: string[],
  cwd: string,
  spawn: typeof spawnSync,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void
): void => {
  const [subcommand] = args;

  if (!subcommand || subcommand === "help") {
    log(`Usage: sc install deps`);
    return;
  }

  if (subcommand !== "deps") {
    error(`Unknown install subcommand "${subcommand}".`);
    process.exit(1);
  }

  const appRoot = findAppRoot(cwd);

  if (!appRoot) {
    throw new Error("sc install deps can only be run from a Sculptor app root.");
  }

  installScaffoldDependencies(appRoot, spawn, log);
  log(`Installed Sculptor dependencies at ${appRoot}`);
};

const handleUpdate = (
  cwd: string,
  spawn: typeof spawnSync,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void
): void => {
  requireOutsideAppRoot(cwd, "sc update");

  try {
    updateGlobalCliPackage(cwd, spawn, log);
    log("Updated the globally installed Sculptor CLI package.");
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    error(message);
    process.exit(1);
  }
};

const handleDoctor = (
  cwd: string,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void
): void => {
  const report = createDoctorReport(cwd);
  printDoctorReport(report, log);

  if (hasDoctorErrors(report)) {
    error("Doctor found blocking issues.");
    process.exit(1);
  }
};

const handleAgents = (
  args: string[],
  cwd: string,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void
): void => {
  const [subcommand] = args;

  if (subcommand && subcommand !== "refresh" && subcommand !== "help") {
    error(`Unknown agents subcommand "${subcommand}".`);
    process.exit(1);
  }

  if (subcommand === "help") {
    log(`# Agents\n\nUsage: \`sc agents\` or \`sc agents refresh\`\n\nWrites \`AGENTS.md\` in the current directory.`);
    return;
  }

  const filePath = writeAgentsMarkdown(cwd);
  log(`Wrote ${path.relative(cwd, filePath) || "AGENTS.md"}`);
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
  try {
    const report = validatePackageRegistryState(appRoot);
    if (report.packageCountDetected > 0 || report.packageCountRegistered > 0 || report.messages.length > 0) {
      log(`Packages detected: ${report.packageCountDetected}`);
      log(`Packages registered: ${report.packageCountRegistered}`);
      for (const message of report.messages) {
        log(message);
      }
    }
  } catch (error) {
    log(error instanceof Error ? error.message : String(error));
  }
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

const handleConfig = (
  args: string[],
  cwd: string,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void
): void => {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "help") {
    log(`Usage: sc config <get|set|list> [path]`);
    return;
  }

  const appRoot = requireAppRoot(cwd, "sc config");

  if (subcommand === "get") {
    const pathExpression = rest[0];
    if (!pathExpression) {
      error("Usage: sc config get <path>");
      process.exit(1);
    }

    const value = getConfigValue(appRoot, pathExpression);
    log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
    return;
  }

  if (subcommand === "set") {
    const assignment = rest[0];
    if (!assignment) {
      error("Usage: sc config set <path=value>");
      process.exit(1);
    }

    setConfigValue(appRoot, assignment);
    log(`Updated config: ${assignment.split("=")[0]}`);
    return;
  }

  if (subcommand === "list") {
    for (const entry of listConfigEntries(appRoot)) {
      log(`${entry.path} = ${typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value)}`);
    }
    return;
  }

  error(`Unknown config subcommand "${subcommand}".`);
  process.exit(1);
};

const handleAdd = async (
  args: string[],
  cwd: string,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void
): Promise<void> => {
  const pluginName = args[0];

  if (!pluginName) {
    error("Usage: sc add <plugin>");
    process.exit(1);
  }

  const appRoot = requireAppRoot(cwd, "sc add");
  const module = await loadPluginModule(pluginName);
  const manifest = resolvePluginManifest(module, pluginName);
  log(`Loaded plugin ${manifest.name} for ${appRoot}`);
};

const handleGenerate = async (
  args: string[],
  cwd: string,
  prompt: PromptFn,
  spawn: typeof spawnSync,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void
): Promise<void> => {
  const [kindInput, ...restInput] = args;

  if (!kindInput) {
    error("Usage: sc generate <controller|service|repository|dto|module|middleware|type|route|pkg> <name>");
    process.exit(1);
  }

  const kindMap: Record<string, GenerateKind> = {
    c: "controller",
    controller: "controller",
    s: "service",
    service: "service",
    repo: "repository",
    repository: "repository",
    m: "module",
    mo: "module",
    module: "module",
    mw: "middleware",
    middleware: "middleware",
    dto: "dto",
    t: "type",
    type: "type",
    r: "route",
    route: "route",
    resource: "route",
    pkg: "pkg",
    package: "pkg"
  };

  const kind = kindMap[kindInput];

  if (!kind) {
    error(`Unknown generator "${kindInput}".`);
    process.exit(1);
  }

  const { args: restAfterOutputDir, outputDir } = extractOutputDir(restInput);
  const rest = stripPackageFlag(restAfterOutputDir);
  const positional = rest.filter((arg) => !isFlag(arg));
  const explicitName = positional[0];
  const packageTarget = getPackageFlagValue(restAfterOutputDir);
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
  const functionalRoutes = rest.includes("--functional") || rest.includes("--with-routes");

  if (
    kind !== "type" &&
    !explicitName &&
    !outputDir
  ) {
    error(`Usage: sc generate ${kind} <name>`);
    process.exit(1);
  }

  const appRoot = requireAppRoot(cwd, "sc generate");
  const packagePath = packageTarget ? resolveRegisteredPackagePath(appRoot, packageTarget) : undefined;

  if (packageTarget && !packagePath) {
    error(`Package "${packageTarget}" is not registered.`);
    process.exit(1);
  }

  const packageScopedOutput =
    packagePath !== undefined
      ? (outputDir
          ? path.posix.join(packagePath, outputDir)
          : kind === "route"
            ? path.posix.join(packagePath, "routes")
            : packagePath)
      : undefined;

  const resolvedOutputDir =
    kind === "pkg"
      ? outputDir ?? String(loadConfig(appRoot).framework.project?.srcRoot ?? "src")
      : packageScopedOutput ?? outputDir;

  const resolvedName =
    explicitName ??
    (() => {
      if (!outputDir) {
        return "index";
      }

      const parts = outputDir.split(/[\\/]/).filter(Boolean);
      return parts[parts.length - 1] ?? "index";
    })();
  const files = await generateResourceFiles(
    kind,
    resolvedName,
    mode,
    devServer,
    resolvedOutputDir,
    typeVariant,
    functionalRoutes,
    resolveTestingGenerate(appRoot),
    { cwd, prompt, spawn, log, error }
  );
  const targetDir = appRoot;

  if (!files) {
    return;
  }

  await writeGeneratedFiles(targetDir, files, { cwd, prompt, spawn, log, error });

  if (packagePath || kind === "pkg") {
    const registry = syncPackageRegistry(appRoot);

    for (const filePath of Object.keys(files)) {
      upsertFileIntoRegistry(registry, filePath);
      const owningPackage = getOwningPackage(registry, filePath);
      if (owningPackage) {
        updatePackageIndexForRecord(path.join(appRoot, owningPackage.index), owningPackage);
      }
    }

    savePackageRegistry(appRoot, registry);
  }

  if (resolveTestingGenerate(appRoot)) {
    await syncTestHarness(targetDir, { cwd, prompt, spawn, log, error });
  }
  syncPackageRegistry(appRoot);
  if (kind === "pkg") {
    ensureRootRegistryForPackages(appRoot);
  }
  log(`Generated ${kind} "${resolvedName}" using ${mode} mode.`);
  return;
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
    case "sync":
      handleSyncCommand(args, { cwd, prompt, log, error });
      return;
    case "lint":
      handleLint(cwd, spawn, log);
      return;
    case "test":
      handleTest(cwd, spawn, log);
      return;
    case "install":
    case "i":
      handleInstall(args, cwd, spawn, log, error);
      return;
    case "update":
      handleUpdate(cwd, spawn, log, error);
      return;
    case "doctor":
      handleDoctor(cwd, log, error);
      return;
    case "config":
      handleConfig(args, cwd, log, error);
      return;
    case "add":
      await handleAdd(args, cwd, log, error);
      return;
    case "agents":
      handleAgents(args, cwd, log, error);
      return;
    case "pkg":
    case "package":
      await handlePackageCommand(args, { cwd, prompt, log, error });
      return;
    case "ls":
    case "list":
      handleLsCommand(args, { cwd, prompt, log, error });
      return;
    case "reg":
    case "register":
    case "r":
      await handleRegisterCommand("reg", args, { cwd, prompt, log, error });
      return;
    case "ureg":
    case "unreg":
    case "unregister":
    case "ur":
      await handleRegisterCommand("ureg", args, { cwd, prompt, log, error });
      return;
    case "rm":
    case "remove":
      await handleRegisterCommand("rm", args, { cwd, prompt, log, error });
      return;
    case "generate":
    case "g":
      await handleGenerate(args, cwd, prompt, spawn, log, error);
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
