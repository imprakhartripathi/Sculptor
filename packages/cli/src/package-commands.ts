import fs from "node:fs";
import path from "node:path";

import {
  buildPackageRecord,
  getOwningPackage,
  loadPackageRegistry,
  deleteFileFromRegistry,
  savePackageRegistry,
  scanPackageRegistry,
  syncPackageRegistry,
  syncRootRegistryForPackages,
  updatePackageIndexForRecord,
  unregisterFileFromRegistry,
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
  const detectedFiles = new Map((detected?.files ?? []).map((entry) => [entry.path, entry]));
  const registeredFiles = new Map((registered?.files ?? []).map((entry) => [entry.path, entry]));

  for (const [filePath, fileRecord] of registeredFiles) {
    if (fileRecord.tags.includes("helper")) {
      continue;
    }

    if (fileRecord.registered && !detectedFiles.has(filePath)) {
      messages.push(`Missing registered file: ${filePath}`);
    }
  }

  for (const [filePath, fileRecord] of detectedFiles) {
    if (fileRecord.tags.includes("helper")) {
      continue;
    }

    const registryRecord = registeredFiles.get(filePath);
    if (!registryRecord || !registryRecord.registered || !fileRecord.registered) {
      messages.push(`Detected unregistered file: ${filePath}`);
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

  const detectedFileMap = new Map(scan.files.map((file) => [file.path, file]));
  const registeredFileMap = new Map(registry.files.map((file) => [file.path, file]));

  for (const [filePath, fileRecord] of registeredFileMap) {
    if (fileRecord.registered && !detectedFileMap.has(filePath)) {
      messages.push(`Missing registered file: ${filePath}`);
    }
  }

  for (const [filePath, fileRecord] of detectedFileMap) {
    const registryRecord = registeredFileMap.get(filePath);
    if (!registryRecord || !registryRecord.registered || !fileRecord.registered) {
      messages.push(`Detected unregistered file: ${filePath}`);
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

const generatedSuffixByKind: Record<string, string> = {
  controller: ".controller.ts",
  c: ".controller.ts",
  service: ".service.ts",
  s: ".service.ts",
  repository: ".repository.ts",
  repo: ".repository.ts",
  middleware: ".middleware.ts",
  mw: ".middleware.ts",
  module: ".module.ts",
  mo: ".module.ts",
  m: ".module.ts",
  dto: ".dto.ts",
  type: ".type.ts",
  t: ".type.ts",
  route: ".route.ts",
  r: ".route.ts"
};

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

const resolveGeneratedFileTarget = (rootDir: string, kindInput: string, name: string): ResolvedFileTarget | undefined => {
  const kindKey = kindInput.split(/[\\/]/).filter(Boolean).pop()?.toLowerCase();
  const suffix = kindKey ? generatedSuffixByKind[kindKey] : undefined;

  if (!suffix) {
    return undefined;
  }

  const candidate = `${name}${suffix}`;

  try {
    return resolveFileTarget(rootDir, candidate);
  } catch {
    return undefined;
  }
};

const resolveFileTarget = (rootDir: string, fileInput: string): ResolvedFileTarget => {
  const normalizedInput = normalizePath(fileInput);
  const absolutePath = path.isAbsolute(fileInput) ? fileInput : path.join(rootDir, fileInput);
  const relativeFromRoot = normalizePath(path.relative(rootDir, absolutePath));
  const scan = scanPackageRegistry(rootDir);
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

  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
    const owningPackage = scan.packages.find((record) => {
      const normalizedPackagePath = normalizePath(record.path);
      return relativeFromRoot.startsWith(`${normalizedPackagePath}/`);
    });

    return {
      path: relativeFromRoot,
      package: owningPackage
    };
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

  const detectedFiles = new Map((record?.files ?? []).map((entry) => [entry.path, entry]));
  const registeredFiles = new Map((registered?.files ?? []).map((entry) => [entry.path, entry]));
  const allFiles = [...new Set([...detectedFiles.keys(), ...registeredFiles.keys()])].sort();

  for (const file of allFiles) {
    const detectedRecord = detectedFiles.get(file);
    const registeredRecord = registeredFiles.get(file);
    const marker = detectedRecord?.registered && registeredRecord?.registered
      ? "✔"
      : detectedRecord?.registered
        ? "⚠"
        : registeredRecord?.registered
          ? "✖"
          : "⚠";
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
      const unpackaged = scan.files.filter((file) => !file.registered);

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
  const [primaryInput, secondaryInput] = args;

  if (!primaryInput) {
    context.error(`Usage: sc ${command} <file>`);
    process.exit(1);
  }

  if (primaryInput === "pkg" || primaryInput === "package") {
    const packageName = secondaryInput;

    if (command === "rm") {
      if (!packageName) {
        context.error(`Usage: sc rm pkg <name>`);
        process.exit(1);
      }

      const registry = syncPackageRegistry(rootDir);
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

    if (command === "ureg") {
      context.error("Package unregistering from registry.ts is not supported yet. Use sc pkg rm <name> to remove the package and its registry entry.");
      return;
    }

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

  const suffixKey = primaryInput.split(/[\\/]/).filter(Boolean).pop()?.toLowerCase() ?? "";
  const generatedSuffix = generatedSuffixByKind[suffixKey] ?? "";
  const fileInput = secondaryInput && generatedSuffix ? `${secondaryInput}${generatedSuffix}` : primaryInput;
  const generatedTarget = secondaryInput && generatedSuffix ? resolveGeneratedFileTarget(rootDir, primaryInput, secondaryInput) : undefined;

  if (secondaryInput && generatedSuffix && !generatedTarget) {
    context.error(`File "${fileInput}" does not exist in this package or project.`);
    process.exit(1);
  }

  const resolvedTarget = generatedTarget ?? resolveFileTarget(rootDir, fileInput);
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
  } else if (command === "rm") {
    deleteFileFromRegistry(registry, filePath);
  } else {
    unregisterFileFromRegistry(registry, filePath);
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
  syncRootRegistryForPackages(rootDir);
};
