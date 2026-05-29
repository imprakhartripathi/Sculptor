import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

import { loadConfig } from "@sculptor/config";

import { validatePackageRegistryState } from "./package-commands.js";
import { detectPackageManager, type PackageManager } from "./package-manager.js";

const cliPackageVersion = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { version?: string };

export type DoctorSeverity = "info" | "warn" | "error";

export interface DoctorDiagnostic {
  severity: DoctorSeverity;
  code: string;
  message: string;
}

export interface DoctorReport {
  cliVersion: string;
  packageManager: PackageManager;
  appRoot?: string;
  diagnostics: DoctorDiagnostic[];
}

const toPackageManager = detectPackageManager;

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

const readJson = <T>(filePath: string): T | undefined => {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) {
    return undefined;
  }

  return JSON.parse(raw) as T;
};

const comparePinnedVersions = (left: string, right: string): number | undefined => {
  const parse = (value: string): [number, number, number] | undefined => {
    const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
      return undefined;
    }

    return [Number(match[1]), Number(match[2]), Number(match[3])];
  };

  const leftParts = parse(left);
  const rightParts = parse(right);
  if (!leftParts || !rightParts) {
    return undefined;
  }

  for (let index = 0; index < leftParts.length; index += 1) {
    const difference = leftParts[index]! - rightParts[index]!;
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
};

const isRangeSpecifier = (specifier: string): boolean =>
  /^(\^|~|>=|<=|>|<|\*)/.test(specifier.trim()) || specifier.includes(" || ");

const collectSculptorDependencies = (
  rootDir: string
): Array<{ packageName: string; specifier: string; source: string }> => {
  const packageJson = readJson<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  }>(path.join(rootDir, "package.json"));

  if (!packageJson) {
    return [];
  }

  const sources: Array<[string, Record<string, string> | undefined]> = [
    ["dependencies", packageJson.dependencies],
    ["devDependencies", packageJson.devDependencies],
    ["peerDependencies", packageJson.peerDependencies],
    ["optionalDependencies", packageJson.optionalDependencies]
  ];

  const result: Array<{ packageName: string; specifier: string; source: string }> = [];

  for (const [source, dependencies] of sources) {
    for (const [packageName, specifier] of Object.entries(dependencies ?? {})) {
      if (!packageName.startsWith("@sculptor/")) {
        continue;
      }

      result.push({ packageName, specifier, source });
    }
  }

  return result;
};

const inspectRegistryShape = (rootDir: string): DoctorDiagnostic[] => {
  const diagnostics: DoctorDiagnostic[] = [];

  let srcRoot = "src";
  try {
    srcRoot = String(loadConfig(rootDir).framework.project?.srcRoot ?? "src");
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "CONFIG_LOAD_FAILED",
      message: error instanceof Error ? error.message : String(error)
    });
    return diagnostics;
  }

  const registryPath = path.join(rootDir, srcRoot, "registry.ts");

  if (!fs.existsSync(registryPath)) {
    diagnostics.push({
      severity: "warn",
      code: "REGISTRY_MISSING",
      message: `No registry file found at ${path.posix.join(srcRoot, "registry.ts")}.`
    });
    return diagnostics;
  }

  const sourceText = fs.readFileSync(registryPath, "utf8");
  const sourceFile = ts.createSourceFile(registryPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const registryDeclaration = sourceFile.statements.find(
    (statement): statement is ts.VariableStatement =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "registry"
      )
  );

  if (!registryDeclaration) {
    diagnostics.push({
      severity: "warn",
      code: "REGISTRY_UNINSPECTABLE",
      message: "Unable to inspect registry.ts statically."
    });
    return diagnostics;
  }

  const registryInitializer = registryDeclaration.declarationList.declarations.find(
    (declaration): declaration is ts.VariableDeclaration & { initializer: ts.Expression } =>
      ts.isIdentifier(declaration.name) && declaration.name.text === "registry" &&
      declaration.initializer !== undefined
  )?.initializer;

  if (!registryInitializer || !ts.isObjectLiteralExpression(registryInitializer)) {
    diagnostics.push({
      severity: "error",
      code: "REGISTRY_MALFORMED",
      message: "registry.ts must export a plain object registry."
    });
    return diagnostics;
  }

  const propertyNames = new Set<string>();
  for (const property of registryInitializer.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
      propertyNames.add(property.name.text);
    }
  }

  if (!propertyNames.has("packages")) {
    if (["controllers", "services", "routes", "repositories", "middlewares"].some((key) => propertyNames.has(key))) {
      diagnostics.push({
        severity: "warn",
        code: "REGISTRY_LEGACY",
        message: "Legacy flat registry shape detected. Package-aware registry support is available.",
      });
    }
    return diagnostics;
  }

  const packagesProperty = registryInitializer.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === "packages"
  );

  if (packagesProperty && !ts.isArrayLiteralExpression(packagesProperty.initializer)) {
    diagnostics.push({
      severity: "error",
      code: "REGISTRY_PACKAGES_INVALID",
      message: "registry.packages must be an array."
    });
    return diagnostics;
  }

  diagnostics.push({
    severity: "info",
    code: "REGISTRY_PACKAGE_AWARE",
    message: "Package-aware registry shape detected."
  });

  return diagnostics;
};

export const createDoctorReport = (cwd: string): DoctorReport => {
  const diagnostics: DoctorDiagnostic[] = [];
  const cliVersion = cliPackageVersion.version ?? "0.0.0";
  const packageManager = toPackageManager();
  const appRoot = findAppRoot(cwd);

  if (!appRoot) {
    diagnostics.push({
      severity: "info",
      code: "NO_APP_ROOT",
      message: "No Sculptor app root detected. Project diagnostics are skipped."
    });

    return {
      cliVersion,
      packageManager,
      diagnostics
    };
  }

  diagnostics.push({
    severity: "info",
    code: "APP_ROOT_DETECTED",
    message: `App root: ${appRoot}`
  });

  const sculptorDependencies = collectSculptorDependencies(appRoot);
  if (sculptorDependencies.length === 0) {
    diagnostics.push({
      severity: "warn",
      code: "NO_SCULPTOR_DEPENDENCIES",
      message: "No Sculptor dependencies were declared in package.json."
    });
  }

  for (const dependency of sculptorDependencies) {
    const specifier = dependency.specifier.trim();

    if (!specifier || specifier === "latest" || specifier === "*" || specifier.startsWith("file:") || specifier.startsWith("link:") || specifier.startsWith("workspace:")) {
      diagnostics.push({
        severity: "warn",
        code: "DEPENDENCY_UNPINNED",
        message: `${dependency.packageName} (${dependency.source}) uses an unpinned or workspace specifier: ${dependency.specifier}`
      });
      continue;
    }

    if (isRangeSpecifier(specifier)) {
      diagnostics.push({
        severity: "info",
        code: "DEPENDENCY_RANGE",
        message: `${dependency.packageName} (${dependency.source}) is declared with range ${dependency.specifier}.`
      });
      continue;
    }

    const comparison = comparePinnedVersions(cliVersion, specifier);
    if (comparison === undefined) {
      diagnostics.push({
        severity: "info",
        code: "DEPENDENCY_UNKNOWN",
        message: `${dependency.packageName} (${dependency.source}) is declared as ${dependency.specifier}.`
      });
      continue;
    }

    if (comparison > 0) {
      diagnostics.push({
        severity: "warn",
        code: "DEPENDENCY_OLDER_THAN_CLI",
        message: `${dependency.packageName} (${dependency.source}) is behind the CLI version ${cliVersion} (declared ${dependency.specifier}).`
      });
      continue;
    }

    if (comparison < 0) {
      diagnostics.push({
        severity: "warn",
        code: "DEPENDENCY_AHEAD_OF_CLI",
        message: `${dependency.packageName} (${dependency.source}) is ahead of the CLI version ${cliVersion} (declared ${dependency.specifier}).`
      });
      continue;
    }

    diagnostics.push({
      severity: "info",
      code: "DEPENDENCY_MATCH",
      message: `${dependency.packageName} (${dependency.source}) matches CLI version ${cliVersion}.`
    });
  }

  try {
    const report = validatePackageRegistryState(appRoot);

    diagnostics.push({
      severity: "info",
      code: "PACKAGE_REGISTRY_COUNTS",
      message: `Packages detected: ${report.packageCountDetected}; registered: ${report.packageCountRegistered}.`
    });

    for (const message of report.messages) {
      diagnostics.push({
        severity: message.startsWith("Missing registered file") || message.startsWith("Package not registered") ? "warn" : "warn",
        code: "PACKAGE_REGISTRY_WARNING",
        message
      });
    }
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "PACKAGE_REGISTRY_SCAN_FAILED",
      message: error instanceof Error ? error.message : String(error)
    });
  }

  diagnostics.push(...inspectRegistryShape(appRoot));

  return {
    cliVersion,
    packageManager,
    appRoot,
    diagnostics
  };
};

export const printDoctorReport = (
  report: DoctorReport,
  log: (...args: unknown[]) => void
): void => {
  log(`Sculptor doctor`);
  log(`CLI version: ${report.cliVersion}`);
  log(`Package manager: ${report.packageManager}`);

  if (report.appRoot) {
    log(`App root: ${report.appRoot}`);
  }

  for (const diagnostic of report.diagnostics) {
    const prefix = diagnostic.severity === "error" ? "✖" : diagnostic.severity === "warn" ? "⚠" : "•";
    log(`${prefix} ${diagnostic.message}`);
  }
};

export const hasDoctorErrors = (report: DoctorReport): boolean =>
  report.diagnostics.some((diagnostic) => diagnostic.severity === "error");
