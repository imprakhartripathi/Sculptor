#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { loadConfig } from "@sculptor/config";
import { getConfigValue, listConfigEntries, setConfigValue } from "./config-commands.js";
import { detectPackageManager, globalInstallArgsFor } from "./package-manager.js";
import { controllerHelp, generateHelp, generateResourceFiles, middlewareHelp, moduleHelp, parseGenerateMode, readModeFromFlags, routeHelp, scaffoldProject, syncTestHarness, typeHelp, writeGeneratedFiles } from "./scaffold.js";
import { loadPluginModule, resolvePluginManifest } from "./plugins.js";
const cliPackageVersion = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const versionLabel = cliPackageVersion.version ?? "0.0.0";
const isCommand = (value) => [
    "new",
    "start",
    "dev",
    "build",
    "lint",
    "test",
    "install",
    "i",
    "update",
    "generate",
    "g",
    "help",
    "config",
    "add"
].includes(value);
const isFlag = (value) => value.startsWith("-");
const isVersionFlag = (value) => ["-v", "--v", "--version", "version", "v"].includes(value);
const sculptorCliBanner = String.raw `
                                                                         
   ███████╗ ██████╗██╗   ██╗██╗     ██████╗ ████████╗ ██████╗ ██████╗    
   ██╔════╝██╔════╝██║   ██║██║     ██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗   
   ███████╗██║     ██║   ██║██║     ██████╔╝   ██║   ██║   ██║██████╔╝   
   ╚════██║██║     ██║   ██║██║     ██╔═══╝    ██║   ██║   ██║██╔══██╗   
   ███████║╚██████╗╚██████╔╝███████╗██║        ██║   ╚██████╔╝██║  ██║   
   ╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝   
                                                                         
                        SculptorTS CLI v${versionLabel}`;
const sculptorDevBanner = (version) => String.raw `
                                                                         
   ███████╗ ██████╗██╗   ██╗██╗     ██████╗ ████████╗ ██████╗ ██████╗    
   ██╔════╝██╔════╝██║   ██║██║     ██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗   
   ███████╗██║     ██║   ██║██║     ██████╔╝   ██║   ██║   ██║██████╔╝   
   ╚════██║██║     ██║   ██║██║     ██╔═══╝    ██║   ██║   ██║██╔══██╗   
   ███████║╚██████╗╚██████╔╝███████╗██║        ██║   ╚██████╔╝██║  ██║   
   ╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝   
                                                                         
                        SculptorTS CLI v${version}`;
const buildBanner = (title, subtitle) => {
    if (title === "SculptorTS CLI" && subtitle === `v${versionLabel}`) {
        return sculptorCliBanner;
    }
    const width = 56;
    const line = `+${"-".repeat(width - 2)}+`;
    const center = (value) => {
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
const printBanner = (log, title, subtitle) => {
    log(buildBanner(title, subtitle));
};
const printDevBanner = (log) => {
    log(sculptorDevBanner(versionLabel));
};
const requireAppRoot = (cwd, command) => {
    const sculptorConfig = path.join(cwd, "sculptor.json");
    if (!fs.existsSync(sculptorConfig)) {
        throw new Error(`${command} can only be run from a Sculptor app root.`);
    }
    return cwd;
};
const findAppRoot = (cwd) => {
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
const requireOutsideAppRoot = (cwd, command) => {
    const appRoot = findAppRoot(cwd);
    if (appRoot) {
        throw new Error(`${command} can only be run outside a Sculptor app root.`);
    }
    return cwd;
};
const extractOutputDir = (args) => {
    const index = args.findIndex((arg) => arg === "in");
    if (index < 0 || index === args.length - 1) {
        return { args };
    }
    return {
        args: [...args.slice(0, index), ...args.slice(index + 2)],
        outputDir: args[index + 1]
    };
};
const getFlagValue = (args, names) => {
    for (const name of names) {
        const prefixed = `${name}=`;
        const match = args.find((arg) => arg.startsWith(prefixed));
        if (match) {
            return match.slice(prefixed.length);
        }
    }
    return undefined;
};
const getFlagPresence = (args, names) => names.some((name) => args.includes(name) || args.some((arg) => arg.startsWith(`${name}=`)));
const getPrompt = (prompt) => {
    if (prompt) {
        return prompt;
    }
    return async (question, defaultValue) => {
        const rl = createInterface({ input: stdin, output: stdout });
        try {
            const suffix = defaultValue ? ` [${defaultValue}]` : "";
            const answer = await rl.question(`${question}${suffix}: `);
            const trimmed = answer.trim();
            return trimmed || defaultValue || "";
        }
        finally {
            rl.close();
        }
    };
};
const resolveDefaultMode = (cwd) => {
    const config = loadConfig(cwd);
    const style = config.framework.routing?.style;
    return style === "decorator" || style === "functional" || style === "hybrid"
        ? style
        : "decorator";
};
const resolveDefaultDevServer = (cwd) => {
    const config = loadConfig(cwd);
    const devServer = config.framework.project?.devServer;
    return devServer === "nodemon" ? "nodemon" : "tsx";
};
const resolveTestingGenerate = (cwd) => loadConfig(cwd).framework.testing?.generate !== false;
const resolveFrameworkLock = (mode, provided) => {
    if (provided !== undefined) {
        return provided;
    }
    return mode !== "hybrid";
};
const parseBooleanInput = (value, fallback) => {
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
const promptChoice = async (ask, question, choices, defaultValue) => {
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
        return choices[byIndex - 1].value;
    }
    const direct = choices.find((choice) => choice.value.toLowerCase() === normalized || choice.label.toLowerCase() === normalized);
    return direct?.value ?? defaultValue;
};
const printMainHelp = (log) => {
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
- \`sc install deps\`
- \`sc update\`
- \`sc generate\` or \`sc g\`
- \`sc config <get|set|list>\`
- \`sc add <plugin>\`
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

## Binary Alias

- \`sculptor\` is equivalent to \`sc\`
`);
};
const printHelp = (topic, log) => {
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
    if (topic === "config") {
        log(`# Config\n\nUse \`sc config get\`, \`sc config set\`, or \`sc config list\`.`);
        return;
    }
    if (topic === "install") {
        log(`# Install\n\nUsage: \`sc install deps\` or \`sc i deps\``);
        return;
    }
    if (topic === "update") {
        log(`# Update\n\nUsage: \`sc update\`\n\nUpdates the globally installed Sculptor packages to their latest versions.`);
        return;
    }
    if (topic === "add") {
        log(`# Add\n\nUsage: \`sc add <plugin>\``);
        return;
    }
    printMainHelp(log);
};
const printVersion = (log) => {
    printBanner(log, "SculptorTS CLI", `v${versionLabel}`);
    log(`SculptorTS CLI ${versionLabel}`);
};
const resolveProjectMetadata = async (args, cwd, prompt) => {
    const ask = getPrompt(prompt);
    const positional = args.filter((arg) => !isFlag(arg));
    const defaultMode = resolveDefaultMode(cwd);
    const explicitMode = args.includes("--decorator") ||
        args.includes("--functional") ||
        args.includes("--hybrid") ||
        getFlagValue(args, ["--style"]) !== undefined;
    const appName = getFlagValue(args, ["--name"]) ?? positional[0] ?? (await ask("App name"));
    const version = getFlagValue(args, ["--version"]) ?? (await ask("Version", "0.1.0"));
    const modeInput = getFlagValue(args, ["--style"]) ??
        (explicitMode
            ? readModeFromFlags(args, defaultMode)
            : (await promptChoice(ask, "Select a scaffolding style", [
                { label: "Decorator", value: "decorator", description: "Class-based controllers" },
                { label: "Functional", value: "functional", description: "Express routers and handlers" },
                { label: "Hybrid", value: "hybrid", description: "Use both styles together" }
            ], defaultMode)));
    const mode = parseGenerateMode(modeInput, defaultMode) ?? defaultMode;
    const explicitFrameworkLock = getFlagValue(args, [
        "--frameworkLock",
        "--frameworklock",
        "--framework-lock"
    ]);
    const frameworkLock = explicitFrameworkLock !== undefined
        ? !["false", "0", "no"].includes(explicitFrameworkLock.toLowerCase())
        : parseBooleanInput(await ask("Framework lock", String(resolveFrameworkLock(mode))), resolveFrameworkLock(mode));
    const devServerFlag = getFlagValue(args, ["--dev-server", "--devserver"])
        ?? (args.includes("--tsx") ? "tsx" : undefined)
        ?? (args.includes("--nodemon") ? "nodemon" : undefined);
    const devServer = devServerFlag === "nodemon" || devServerFlag === "tsx"
        ? devServerFlag
        : (await promptChoice(ask, "Select a dev server", [
            { label: "tsx", value: "tsx", description: "Fast TypeScript runtime" },
            { label: "nodemon", value: "nodemon", description: "Restart on file changes" }
        ], resolveDefaultDevServer(cwd)));
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
const runSpawn = (command, args, cwd, spawn, log, env) => {
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
const installScaffoldDependencies = (cwd, spawn, log) => {
    runSpawn("npm", ["i"], cwd, spawn, log);
    runSpawn("npm", ["i", "@sculptor/core@latest", "@sculptor/paws@latest"], cwd, spawn, log);
    runSpawn("npm", ["i", "-D", "@sculptor/cli@latest", "@sculptor/config@latest", "@sculptor/router@latest"], cwd, spawn, log);
};
const updateGlobalSculptorPackages = (cwd, spawn, log) => {
    const packageManager = detectPackageManager();
    const packages = [
        "@sculptor/cli@latest",
        "@sculptor/config@latest",
        "@sculptor/core@latest",
        "@sculptor/paws@latest",
        "@sculptor/router@latest",
        "@sculptor/template-registry@latest"
    ];
    runSpawn(packageManager, globalInstallArgsFor(packageManager, packages), cwd, spawn, log);
};
const handleNew = async (args, cwd, prompt, spawn, log) => {
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
const handleInstall = (args, cwd, spawn, log, error) => {
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
const handleUpdate = (cwd, spawn, log, error) => {
    requireOutsideAppRoot(cwd, "sc update");
    try {
        updateGlobalSculptorPackages(cwd, spawn, log);
        log("Updated globally installed Sculptor packages.");
    }
    catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        error(message);
        process.exit(1);
    }
};
const handleDev = (args, cwd, spawn, log) => {
    const appRoot = requireAppRoot(cwd, "sc dev");
    const devServer = resolveDefaultDevServer(cwd);
    const port = getFlagValue(args, ["--port"]);
    if (port) {
        process.env.PORT = port;
    }
    printDevBanner(log);
    if (devServer === "nodemon") {
        runSpawn("npx", [
            "nodemon",
            "--watch",
            path.join(appRoot, "src"),
            "--ext",
            "ts",
            "--exec",
            "tsx src/main.ts"
        ], appRoot, spawn, log, { SCULPTOR_SUPPRESS_BANNER: "1" });
        return;
    }
    runSpawn("npx", ["tsx", path.join(appRoot, "src/main.ts")], appRoot, spawn, log, { SCULPTOR_SUPPRESS_BANNER: "1" });
};
const handleStart = (args, cwd, spawn, log) => {
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
const handleBuild = (cwd, spawn, log) => {
    const appRoot = requireAppRoot(cwd, "sc build");
    const appTsconfig = path.join(appRoot, "tsconfig.json");
    runSpawn("npx", ["tsc", "-p", appTsconfig], appRoot, spawn, log);
};
const handleLint = (cwd, spawn, log) => {
    const appRoot = requireAppRoot(cwd, "sc lint");
    runSpawn("npx", ["eslint", ".", "--ext", ".ts"], appRoot, spawn, log);
};
const handleTest = (cwd, spawn, log) => {
    const appRoot = requireAppRoot(cwd, "sc test");
    const runner = path.join(appRoot, "src", "tests", "runner.spec.ts");
    if (fs.existsSync(runner)) {
        runSpawn("npx", ["vitest", "run", runner], appRoot, spawn, log);
        return;
    }
    runSpawn("npx", ["vitest", "run"], appRoot, spawn, log);
};
const handleConfig = (args, cwd, log, error) => {
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
const handleAdd = async (args, cwd, log, error) => {
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
const handleGenerate = async (args, cwd, prompt, spawn, log, error) => {
    const [kindInput, ...restInput] = args;
    if (!kindInput) {
        error("Usage: sc generate <controller|service|module|middleware|type|route> <name>");
        process.exit(1);
    }
    const kindMap = {
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
    const mode = parseGenerateMode(readModeFromFlags(rest, fallbackMode), fallbackMode);
    const typeVariant = rest.includes("-interface") || rest.includes("-i")
        ? "interface"
        : rest.includes("-class") || rest.includes("-c")
            ? "class"
            : rest.includes("-enum") || rest.includes("-e")
                ? "enum"
                : "type";
    const functionalRoutes = rest.includes("--functional") || rest.includes("--with-routes");
    if (kind !== "type" &&
        !explicitName &&
        !outputDir) {
        error(`Usage: sc generate ${kind} <name>`);
        process.exit(1);
    }
    const appRoot = requireAppRoot(cwd, "sc generate");
    const resolvedName = explicitName ??
        (() => {
            if (!outputDir) {
                return "index";
            }
            const parts = outputDir.split(/[\\/]/).filter(Boolean);
            return parts[parts.length - 1] ?? "index";
        })();
    const files = await generateResourceFiles(kind, resolvedName, mode, devServer, outputDir, typeVariant, functionalRoutes, resolveTestingGenerate(appRoot), { cwd, prompt, spawn, log, error });
    const targetDir = appRoot;
    if (!files) {
        return;
    }
    await writeGeneratedFiles(targetDir, files, { cwd, prompt, spawn, log, error });
    if (resolveTestingGenerate(appRoot)) {
        await syncTestHarness(targetDir, { cwd, prompt, spawn, log, error });
    }
    log(`Generated ${kind} "${resolvedName}" using ${mode} mode.`);
    return;
};
export const runCli = async (argv = process.argv, options = {}) => {
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
        case "install":
        case "i":
            handleInstall(args, cwd, spawn, log, error);
            return;
        case "update":
            handleUpdate(cwd, spawn, log, error);
            return;
        case "config":
            handleConfig(args, cwd, log, error);
            return;
        case "add":
            await handleAdd(args, cwd, log, error);
            return;
        case "generate":
        case "g":
            await handleGenerate(args, cwd, prompt, spawn, log, error);
            return;
    }
};
if (fileURLToPath(import.meta.url) === process.argv[1]) {
    void runCli().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
        process.exit(1);
    });
}
export { resolveProjectMetadata };
//# sourceMappingURL=cli.js.map