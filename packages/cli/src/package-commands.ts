import fs from "node:fs";
import path from "node:path";

import { loadConfig } from "@sculptor/config";

import {
  buildPackageRecord,
  getOwningPackage,
  loadPackageRegistry,
  removeFileFromRegistry,
  savePackageRegistry,
  scanPackageRegistry,
  syncPackageRegistry,
  syncRootRegistryForPackages,
  updatePackageIndexForRecord,
  upsertFileIntoRegistry,
  type PackageRecord
} from "./package-registry.js";

export type PromptFn = (question: string, defaultValue?: string) => Promise<string>;

export interface PackageCommandContext {
  cwd: string;
  prompt: PromptFn;
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface PackageValidationReport {
  packageCountDetected: number;
  packageCountRegistered: number;
  messages: string[];
}

const packageFlagNames = ["-p", "--p", "-pkg", "--pkg", "-package", "--package"];

const ensureAppRoot = (cwd: string, command: string): string => {
  if (!fs.existsSync(path.join(cwd, "sculptor.json"))) {
    throw new Error(`${command} can only be run from a Sculptor app root.`);
  }

  return cwd;
};

const normalizePath = (value: string): string =>
  value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");

const isPackageFlag = (value: string): boolean =>
  packageFlagNames.some((flag) => value === flag || value.startsWith(`${flag}=`));

export const getPackageFlagValue = (args: string[]): string | undefined => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;

    for (const flag of packageFlagNames) {
      const prefixed = `${flag}=`;
      if (arg.startsWith(prefixed)) {
        return arg.slice(prefixed.length);
      }

      if (arg !== flag) {
        continue;
      }

      const next = args[index + 1];
      if (!next || next.startsWith("-")) {
        return undefined;
      }

      return next;
    }
  }

  return undefined;
};

export const stripPackageFlag = (args: string[]): string[] => {
  const result: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;

    if (!isPackageFlag(arg)) {
      result.push(arg);
      continue;
    }

    if (packageFlagNames.some((flag) => arg.startsWith(`${flag}=`))) {
      continue;
    }

    const next = args[index + 1];
    if (next && !next.startsWith("-")) {
      index += 1;
    }
  }

  return result;
};

const toPascalCase = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const getPackageByName = (
  registry: ReturnType<typeof loadPackageRegistry>,
  packageName: string
): PackageRecord | undefined =>
  Object.values(registry.packages).find((record) => record.name === packageName);

const getPackageRegistryKey = (
  registry: ReturnType<typeof loadPackageRegistry>,
  packageName: string
): string | undefined =>
  Object.keys(registry.packages).find((key) => registry.packages[key]?.name === packageName);

const comparePackageFiles = (
  detected: PackageRecord | undefined,
  registered: PackageRecord | undefined,
  messages: string[],
  packageName: string
): void => {
  const detectedFiles = new Set((detected?.files ?? []).map((entry) => entry.path));
  const registeredFiles = new Set((registered?.files ?? []).map((entry) => entry.path));

  for (const file of registeredFiles) {
    if (!detectedFiles.has(file)) {
      messages.push(`Missing registered file: ${file}`);
    }
  }

  for (const file of detectedFiles) {
    if (!registeredFiles.has(file)) {
      messages.push(`Detected unregistered file: ${file}`);
    }
  }

  if (detected && !registered) {
    messages.push(`Package not registered: ${packageName}`);
  }
}

export const validatePackageRegistryState = (rootDir: string, packageName?: string): PackageValidationReport => {
  const scan = scanPackageRegistry(rootDir);
  const registry = loadPackageRegistry(rootDir);
  const messages: string[] = [];

  const detectedPackages = packageName
    ? scan.packages.filter((record) => record.name === packageName)
    : scan.packages;

  const registeredPackages = packageName
    ? Object.values(registry.packages).filter((record) => record.name === packageName)
    : Object.values(registry.packages);

  for (const detected of detectedPackages) {
    const registered = getPackageByName(registry, detected.name);
    comparePackageFiles(detected, registered, messages, detected.name);
  }

  for (const registered of registeredPackages) {
    const detected = detectedPackages.find((record) => record.name === registered.name);
    comparePackageFiles(detected, registered, messages, registered.name);
  }

  const detectedFileSet = new Set(scan.files.map((file) => file.path));
  const registeredFileSet = new Set(registry.files.map((file) => file.path));

  for (const file of registeredFileSet) {
    if (!detectedFileSet.has(file)) {
      messages.push(`Missing registered file: ${file}`);
    }
  }

  for (const file of detectedFileSet) {
    if (!registeredFileSet.has(file)) {
      messages.push(`Detected unregistered file: ${file}`);
    }
  }

  return {
    packageCountDetected: detectedPackages.length,
    packageCountRegistered: registeredPackages.length,
    messages: [...new Set(messages)]
  };
};

export const syncPackageRegistryState = (rootDir: string): PackageValidationReport => {
  const report = validatePackageRegistryState(rootDir);
  syncPackageRegistry(rootDir);
  return report;
};

export const printPackageValidation = (
  report: PackageValidationReport,
  log: (...args: unknown[]) => void
): void => {
  log(`Packages detected: ${report.packageCountDetected}`);
  log(`Packages registered: ${report.packageCountRegistered}`);

  for (const message of report.messages) {
    log(message);
  }
};

interface ResolvedFileTarget {
  path: string;
  package?: PackageRecord;
}

const collectKnownFiles = (
  rootDir: string
): ResolvedFileTarget[] => {
  const scan = scanPackageRegistry(rootDir);

  return [
    ...scan.packages.flatMap((pkg) =>
      pkg.files.map((file) => ({
        path: file.path,
        package: pkg
      }))
    ),
    ...scan.files.map((file) => ({
      path: file.path
    }))
  ];
};

const resolveFileTarget = (rootDir: string, fileInput: string): ResolvedFileTarget => {
  const normalizedInput = normalizePath(fileInput);
  const absolutePath = path.isAbsolute(fileInput) ? fileInput : path.join(rootDir, fileInput);
  const relativeFromRoot = normalizePath(path.relative(rootDir, absolutePath));
  const knownFiles = collectKnownFiles(rootDir);

  const exactMatches = knownFiles.filter(
    (file) => file.path === normalizedInput || file.path === relativeFromRoot
  );

  if (exactMatches.length === 1) {
    return exactMatches[0]!;
  }

  if (exactMatches.length > 1) {
    const paths = exactMatches.map((file) => file.path).join(", ");
    throw new Error(`File "${fileInput}" is ambiguous. Matches: ${paths}`);
  }

  const leaf = path.posix.basename(normalizedInput);
  const leafMatches = knownFiles.filter((file) => path.posix.basename(file.path) === leaf);

  if (leafMatches.length === 1) {
    return leafMatches[0]!;
  }

  if (leafMatches.length > 1) {
    const paths = leafMatches.map((file) => file.path).join(", ");
    throw new Error(`File "${fileInput}" is ambiguous. Matches: ${paths}`);
  }

  throw new Error(`File "${fileInput}" does not exist in this package or project.`);
};

export const handleSyncCommand = (args: string[], context: PackageCommandContext): void => {
  const rootDir = ensureAppRoot(context.cwd, "sc sync");
  const packageName = getPackageFlagValue(args);
  const report = validatePackageRegistryState(rootDir, packageName);

  printPackageValidation(report, context.log);
  syncPackageRegistry(rootDir);
  syncRootRegistryForPackages(rootDir);
};

const packageTreeLines = (record: PackageRecord | undefined, registered: PackageRecord | undefined): string[] => {
  if (!record && !registered) {
    return [];
  }

  const lines: string[] = [];
  const source = record ?? registered;

  if (!source) {
    return lines;
  }

  lines.push(`${source.name} (${source.path})`);

  const detectedFiles = new Set((record?.files ?? []).map((entry) => entry.path));
  const registeredFiles = new Set((registered?.files ?? []).map((entry) => entry.path));
  const allFiles = [...new Set([...detectedFiles, ...registeredFiles])].sort();

  for (const file of allFiles) {
    const marker = detectedFiles.has(file) && registeredFiles.has(file)
      ? "✔"
      : detectedFiles.has(file)
        ? "⚠"
        : "✖";
    lines.push(`  ${marker} ${path.posix.basename(file)}`);
  }

  return lines;
};

export const handleLsCommand = (args: string[], context: PackageCommandContext): void => {
  const rootDir = ensureAppRoot(context.cwd, "sc ls");
  const treeMode = args.some((arg) => ["-t", "--tree", "-tree", "--t"].includes(arg));
  const packageName = getPackageFlagValue(args);
  const scan = scanPackageRegistry(rootDir);
  const registry = loadPackageRegistry(rootDir);

  if (treeMode) {
    const packages = packageName
      ? scan.packages.filter((record) => record.name === packageName)
      : scan.packages;

    for (const pkg of packages) {
      const registered = registry.packages[pkg.name];
      for (const line of packageTreeLines(pkg, registered)) {
        context.log(line);
      }
    }

    if (!packageName) {
      const unpackaged = scan.files.filter((file) =>
        !Object.values(registry.packages).some((record) => record.files.some((entry) => entry.path === file.path))
      );

      if (unpackaged.length > 0) {
        context.log("Unpackaged files");
        for (const file of unpackaged) {
          context.log(`  ⚠ ${file.path}`);
        }
      }
    }

    return;
  }

  context.log(`Packages detected: ${scan.packages.length}`);
  for (const pkg of scan.packages) {
    context.log(`${pkg.name} -> ${pkg.path}`);
  }
};

export const handlePackageCommand = async (
  args: string[],
  context: PackageCommandContext
): Promise<void> => {
  const rootDir = ensureAppRoot(context.cwd, "sc pkg");
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "help") {
    context.log(`Usage: sc pkg|package <name|ls|rm>`);
    return;
  }

  if (subcommand === "ls") {
    const scan = scanPackageRegistry(rootDir);
    for (const pkg of scan.packages) {
      context.log(`${pkg.name} (${pkg.path})`);
    }
    return;
  }

  if (subcommand === "rm") {
    const packageName = rest[0];
    if (!packageName) {
      context.error("Usage: sc pkg|package rm <name>");
      process.exit(1);
    }

    const registry = loadPackageRegistry(rootDir);
    const record = getPackageByName(registry, packageName);
    if (!record) {
      context.error(`Package "${packageName}" is not registered.`);
      process.exit(1);
    }

    const answer = await context.prompt(`Remove package "${packageName}" and delete ${record.path}? (y/n)`, "n");
    if (!answer.trim().toLowerCase().startsWith("y")) {
      context.log("Package removal cancelled.");
      return;
    }

    fs.rmSync(path.join(rootDir, record.path), { recursive: true, force: true });
    const registryKey = getPackageRegistryKey(registry, packageName);
    if (registryKey) {
      delete registry.packages[registryKey];
    }
    savePackageRegistry(rootDir, registry);
    syncRootRegistryForPackages(rootDir);
    context.log(`Removed package "${packageName}".`);
    return;
  }

  const registry = loadPackageRegistry(rootDir);
  const packageRecord = getPackageByName(registry, subcommand);

  if (!packageRecord) {
    context.error(`Package "${subcommand}" is not registered.`);
    process.exit(1);
  }

  context.log(`Package: ${packageRecord.name}`);
  context.log(`Path: ${packageRecord.path}`);
  context.log(`Index: ${packageRecord.index}`);
  context.log(`Files: ${packageRecord.files.length}`);
  for (const line of packageTreeLines(packageRecord, packageRecord)) {
    context.log(line);
  }
};

export const handleRegisterCommand = async (
  command: "reg" | "ureg" | "rm",
  args: string[],
  context: PackageCommandContext
): Promise<void> => {
  const rootDir = ensureAppRoot(context.cwd, `sc ${command}`);
  const [fileInput] = args;

  if (!fileInput) {
    context.error(`Usage: sc ${command} <file>`);
    process.exit(1);
  }

  if (command === "reg" && (fileInput === "pkg" || fileInput === "package")) {
    const packageName = args[1];
    if (!packageName) {
      context.error(`Usage: sc reg pkg <name>`);
      process.exit(1);
    }

    const registry = syncPackageRegistry(rootDir);
    const packageRecord = getPackageByName(registry, packageName);
    if (!packageRecord) {
      context.error(`Package "${packageName}" is not registered.`);
      process.exit(1);
    }

    const rootRegistryPath = syncRootRegistryForPackages(rootDir);
    context.log(`Registered package "${packageName}" in ${path.posix.relative(rootDir, rootRegistryPath)}`);
    return;
  }

  if (command === "ureg" && (fileInput === "pkg" || fileInput === "package")) {
    context.error("Package unregistering from registry.ts is not supported yet. Use sc pkg rm <name> to remove the package and its registry entry.");
    return;
  }

  const resolvedTarget = resolveFileTarget(rootDir, fileInput);
  const filePath = resolvedTarget.path;
  const fileAbs = path.join(rootDir, filePath);
  const registry = syncPackageRegistry(rootDir);
  const owningPackage = getOwningPackage(registry, filePath) ?? resolvedTarget.package;

  const scopeMessage = owningPackage
    ? `inside package "${owningPackage.name}" at path = ${filePath}`
    : `at path = ${filePath}`;
  const actionLabel =
    command === "reg" ? "Registering" : command === "rm" ? "Removing" : "Unregistering";

  if (command === "rm" && owningPackage && filePath === owningPackage.index) {
    context.error(`sc rm cannot delete the package index file for "${owningPackage.name}". Use sc pkg rm ${owningPackage.name} instead.`);
    process.exit(1);
  }

  context.log(`${actionLabel} "${fileInput}" ${scopeMessage}`);
  const answer = await context.prompt("Continue? (y/n)", "n");
  if (!answer.trim().toLowerCase().startsWith("y")) {
    context.log(`${actionLabel} cancelled.`);
    return;
  }

  if (command === "reg") {
    upsertFileIntoRegistry(registry, filePath);
  } else {
    removeFileFromRegistry(registry, filePath);
  }

  savePackageRegistry(rootDir, registry);

  if (command === "rm" && fs.existsSync(fileAbs)) {
    fs.rmSync(fileAbs, { force: true });
  }

  if (owningPackage) {
    updatePackageIndexForRecord(path.join(rootDir, owningPackage.index), owningPackage);
  }

  syncRootRegistryForPackages(rootDir);

  context.log(`${command === "reg" ? "Registered" : command === "rm" ? "Removed" : "Unregistered"} ${filePath}`);
};

export const createPackageFromName = (
  rootDir: string,
  name: string,
  explicitPath?: string
): PackageRecord => buildPackageRecord(rootDir, name, explicitPath);

export const ensureRootRegistryForPackages = (rootDir: string): void => {
  const srcRoot = String(loadConfig(rootDir).framework.project?.srcRoot ?? "src");
  const registryPath = path.join(rootDir, srcRoot, "registry.ts");

  if (fs.existsSync(registryPath)) {
    return;
  }

  const registry = loadPackageRegistry(rootDir);
  const packageRecords = Object.values(registry.packages);
  const packageEntries = packageRecords.map((record) => `${toPascalCase(record.name)}Package`);
  const imports = packageRecords
    .map((record) => {
      const relativePath = record.path.startsWith(`${srcRoot}/`)
        ? record.path.slice(`${srcRoot}/`.length)
        : record.path;
      return `import { ${toPascalCase(record.name)}Package } from "./${relativePath}/index.js";`;
    })
    .join("\n");

  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(
    registryPath,
    `${imports}${imports ? "\n\n" : ""}export const registry = {\n  packages: [${packageEntries.join(", ")}],\n  controllers: [],\n  services: [],\n  repositories: [],\n  middlewares: [],\n  routes: []\n};\n`,
    "utf8"
  );
};
