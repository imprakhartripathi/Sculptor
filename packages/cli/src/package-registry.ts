import fs from "node:fs";
import path from "node:path";

import ts from "typescript";

import { loadConfig } from "@sculptor/config";

export type PackageFileType =
  | "controller"
  | "service"
  | "repository"
  | "middleware"
  | "module"
  | "dto"
  | "route"
  | "type";

export interface PackageFileRecord {
  type: PackageFileType;
  path: string;
  registered: boolean;
  tags: string[];
}

export interface PackageRecord {
  name: string;
  path: string;
  index: string;
  files: PackageFileRecord[];
}

export interface PackageRegistryArtifact {
  packages: Record<string, PackageRecord>;
  files: PackageFileRecord[];
}

export interface PackageScanResult {
  packages: PackageRecord[];
  files: PackageFileRecord[];
}

export const PACKAGE_REGISTRY_FILE = "sculptor.packages.json";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toPascalCase = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const toCamelCase = (value: string): string => {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const normalizeRelativePath = (value: string): string =>
  value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");

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

const writeJson = (filePath: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const getSrcRoot = (rootDir: string): string =>
  String(loadConfig(rootDir).framework.project?.srcRoot ?? "src");

const isLocalModule = (specifier: string): boolean =>
  specifier.startsWith(".") || specifier.startsWith("/");

const toTsPath = (specifier: string): string => {
  if (!specifier.endsWith(".js") && !specifier.endsWith(".ts")) {
    return specifier;
  }

  return specifier.replace(/\.js$/, ".ts");
};

const inferFileType = (filePath: string): PackageFileType => {
  if (filePath.endsWith(".controller.ts")) {
    return "controller";
  }

  if (filePath.endsWith(".service.ts")) {
    return "service";
  }

  if (filePath.endsWith(".repository.ts")) {
    return "repository";
  }

  if (filePath.endsWith(".middleware.ts")) {
    return "middleware";
  }

  if (filePath.endsWith(".module.ts")) {
    return "module";
  }

  if (filePath.endsWith(".route.ts") || filePath.endsWith(".route.handler.ts")) {
    return "route";
  }

  if (filePath.endsWith(".dto.ts")) {
    return "dto";
  }

  return "type";
};

const isRegistryTrackableFile = (filePath: string): boolean => {
  const normalized = normalizeRelativePath(filePath);

  return (
    /\.(controller|service|repository|middleware|module|dto|route|type|types)\.ts$/.test(normalized) ||
    normalized.endsWith(".route.handler.ts")
  );
};

const isHelperTagged = (record: PackageFileRecord): boolean => record.tags.includes("helper");

const isHelperLikeFile = (filePath: string): boolean => {
  const normalized = normalizeRelativePath(filePath);

  if (!normalized.endsWith(".ts")) {
    return false;
  }

  return !isRegistryTrackableFile(normalized) && !normalized.endsWith("index.ts");
};

const createPackageFileRecord = (
  type: PackageFileType,
  filePath: string,
  registered = false,
  tags: string[] = []
): PackageFileRecord => ({
  type,
  path: normalizeRelativePath(filePath),
  registered,
  tags: [...tags]
});

const normalizeFileRecord = (record: Partial<PackageFileRecord> & { path: string }): PackageFileRecord => ({
  type: record.type ?? inferFileType(record.path),
  path: normalizeRelativePath(record.path),
  registered: record.registered ?? true,
  tags: Array.isArray(record.tags) ? record.tags.map((tag) => String(tag)) : []
});

const inferSymbolFromFile = (filePath: string): string => {
  const base = path.posix.basename(filePath).replace(/\.ts$/, "");

  if (base.endsWith(".route.handler")) {
    return `${toCamelCase(base.replace(/\.route\.handler$/, ""))}Handler`;
  }

  if (base.endsWith(".route")) {
    return toCamelCase(base.replace(/\.route$/, ""));
  }

  if (base.endsWith(".middleware")) {
    return `${toCamelCase(base.replace(/\.middleware$/, ""))}Middleware`;
  }

  if (base.endsWith(".service")) {
    return `${toPascalCase(base.replace(/\.service$/, ""))}Service`;
  }

  if (base.endsWith(".repository")) {
    return `${toPascalCase(base.replace(/\.repository$/, ""))}Repository`;
  }

  if (base.endsWith(".controller")) {
    return `${toPascalCase(base.replace(/\.controller$/, ""))}Controller`;
  }

  if (base.endsWith(".module")) {
    return `${toPascalCase(base.replace(/\.module$/, ""))}Module`;
  }

  if (base.endsWith(".dto")) {
    return `${toPascalCase(base.replace(/\.dto$/, ""))}Dto`;
  }

  if (base.endsWith(".types")) {
    return `${toPascalCase(base.replace(/\.types$/, ""))}Types`;
  }

  return toPascalCase(base);
};

const collectTsFiles = (dir: string, rootDir: string = dir): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath, rootDir));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }

    files.push(normalizeRelativePath(path.relative(rootDir, fullPath)));
  }

  return files;
};

const fileBelongsToPackage = (packagePath: string, filePath: string): boolean => {
  const normalizedPackagePath = normalizeRelativePath(packagePath);
  const normalizedFilePath = normalizeRelativePath(filePath);
  return normalizedFilePath.startsWith(`${normalizedPackagePath}/`) && normalizedFilePath !== `${normalizedPackagePath}/index.ts`;
};

const getDecorators = (node: ts.Node): readonly ts.Decorator[] =>
  ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];

const getPackageDecorator = (node: ts.ClassDeclaration): ts.CallExpression | undefined => {
  for (const decorator of getDecorators(node)) {
    const expression = decorator.expression;
    if (!ts.isCallExpression(expression)) {
      continue;
    }

    const callee = expression.expression;
    if (ts.isIdentifier(callee) && callee.text === "Package") {
      return expression;
    }
  }

  return undefined;
};

const getPackageCallExpression = (node: ts.Node): ts.CallExpression | undefined => {
  const visit = (current: ts.Node): ts.CallExpression | undefined => {
    if (ts.isCallExpression(current)) {
      const callee = current.expression;
      if (ts.isIdentifier(callee) && callee.text === "Package") {
        return current;
      }
    }

    return ts.forEachChild(current, visit);
  };

  return visit(node);
};

const getFunctionalPackageDefinition = (sourceFile: ts.SourceFile): ts.ObjectLiteralExpression | undefined => {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }

      const identifier = declaration.name.text;
      if (!identifier.endsWith("PackageDefinition")) {
        continue;
      }

      const initializer = declaration.initializer;
      if (initializer && ts.isObjectLiteralExpression(initializer)) {
        return initializer;
      }
    }
  }

  return undefined;
};

const resolvePackageDefinitionByName = (
  sourceFile: ts.SourceFile,
  identifier: string
): ts.ObjectLiteralExpression | undefined => {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== identifier) {
        continue;
      }

      if (declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
        return declaration.initializer;
      }
    }
  }

  return undefined;
};

const parsePackageMetadata = (
  rootDir: string,
  filePath: string
): Omit<PackageRecord, "files"> | undefined => {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  const classes = sourceFile.statements.filter(ts.isClassDeclaration);
  const decoratedClass = classes.find((node) => getPackageDecorator(node));

  const decorator = decoratedClass ? getPackageDecorator(decoratedClass) : undefined;
  const functionalCall = decorator ? undefined : getPackageCallExpression(sourceFile);
  const functionalDefinition = decorator || functionalCall ? undefined : getFunctionalPackageDefinition(sourceFile);
  if (!decorator && !functionalCall && !functionalDefinition) {
    return undefined;
  }

  const packageCallArgument = functionalCall?.arguments[0];
  const resolvedFunctionalArgument =
    packageCallArgument && ts.isIdentifier(packageCallArgument)
      ? resolvePackageDefinitionByName(sourceFile, packageCallArgument.text)
      : packageCallArgument;
  const argument = decorator?.arguments[0] ?? resolvedFunctionalArgument ?? functionalDefinition;

  if (!argument || !ts.isObjectLiteralExpression(argument)) {
    throw new Error(`Malformed @Package() metadata in ${filePath}.`);
  }

  const values = new Map<string, ts.Expression>();

  for (const property of argument.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    const name = ts.isIdentifier(property.name) ? property.name.text : property.name.getText(sourceFile);
    values.set(name, property.initializer);
  }

  const getString = (key: string, fallback = ""): string => {
    const value = values.get(key);
    if (!value || !ts.isStringLiteralLike(value)) {
      return fallback;
    }

    return value.text;
  };

  const inferredName =
    decoratedClass?.name?.text ??
    (sourceFile.statements.find(ts.isVariableStatement)?.declarationList.declarations.find((declaration) => {
      if (!ts.isIdentifier(declaration.name)) {
        return false;
      }

      const initializer = declaration.initializer;
      if (!initializer || !ts.isCallExpression(initializer)) {
        return false;
      }

      const callee = initializer.expression;
      return ts.isIdentifier(callee) && callee.text === "Package";
    })?.name.getText(sourceFile) ?? "");
  const name = getString("name", inferredName);
  const packagePath = getString("path", "");

  if (!name || !packagePath) {
    throw new Error(`Malformed @Package() metadata in ${filePath}.`);
  }

  return {
    name,
    path: packagePath,
    index: normalizeRelativePath(path.relative(rootDir, filePath))
  };
};

export const getPackageRegistryPath = (rootDir: string): string =>
  path.join(rootDir, PACKAGE_REGISTRY_FILE);

export const loadPackageRegistry = (rootDir: string): PackageRegistryArtifact => {
  const filePath = getPackageRegistryPath(rootDir);
  const data = readJson<PackageRegistryArtifact>(filePath);

  if (!data) {
    return { packages: {}, files: [] };
  }

  return {
    packages: Object.fromEntries(
      Object.entries(data.packages ?? {}).map(([name, record]) => [
        name,
        {
          ...record,
          files: (record.files ?? [])
            .map((file) => normalizeFileRecord(file))
            .filter((file) => isRegistryTrackableFile(file.path) || isHelperTagged(file))
        }
      ])
    ),
    files: (data.files ?? [])
      .map((file) => normalizeFileRecord(file))
      .filter((file) => isRegistryTrackableFile(file.path) || isHelperTagged(file))
  };
};

export const savePackageRegistry = (rootDir: string, registry: PackageRegistryArtifact): void => {
  writeJson(getPackageRegistryPath(rootDir), registry);
};

export const scanPackageRegistry = (rootDir: string): PackageScanResult => {
  const srcRoot = getSrcRoot(rootDir);
  const sourceRoot = path.join(rootDir, srcRoot);
  const existingRegistry = loadPackageRegistry(rootDir);
  const existingFileState = new Map<string, PackageFileRecord>();

  for (const record of Object.values(existingRegistry.packages)) {
    for (const file of record.files) {
      existingFileState.set(file.path, file);
    }
  }

  for (const file of existingRegistry.files) {
    existingFileState.set(file.path, file);
  }

  const packages: Array<Omit<PackageRecord, "files"> & { files: PackageFileRecord[] }> = [];

  const visit = (dir: string): void => {
    if (!fs.existsSync(dir)) {
      return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }

      if (!entry.isFile() || entry.name !== "index.ts") {
        continue;
      }

      const packageMeta = parsePackageMetadata(rootDir, fullPath);
      if (!packageMeta) {
        continue;
      }
      packages.push({
        ...packageMeta,
        files: []
      });
    }
  };

  visit(sourceRoot);

  const allTsFiles = collectTsFiles(sourceRoot, rootDir);

  const ownedFiles = new Set<string>();

  for (const file of allTsFiles) {
    if (
      file === PACKAGE_REGISTRY_FILE ||
      file.endsWith(".d.ts") ||
      file.endsWith("index.ts") ||
      !isRegistryTrackableFile(file)
    ) {
      continue;
    }

    const owner = [...packages]
      .filter((pkg) => fileBelongsToPackage(pkg.path, file))
      .sort((left, right) => right.path.length - left.path.length)[0];

    const existingFile = existingFileState.get(file);
    const nextFile = createPackageFileRecord(
      inferFileType(file),
      file,
      owner ? existingFile?.registered ?? true : existingFile?.registered ?? false,
      existingFile?.tags ?? []
    );

    if (owner) {
      owner.files.push({
        ...nextFile,
        registered: existingFile?.registered ?? true
      });
      ownedFiles.add(file);
    }
  }

  for (const pkg of packages) {
    const existingPackage = existingRegistry.packages[pkg.name];
    const helperFiles = (existingPackage?.files ?? []).filter((file) => {
      if (!isHelperTagged(file)) {
        return false;
      }

      return file.path.startsWith(`${pkg.path}/`) && !ownedFiles.has(file.path);
    });

    for (const file of helperFiles) {
      pkg.files.push({
        ...file,
        registered: true,
        tags: [...new Set([...(file.tags ?? []), "helper"])]
      });
    }
  }

  const unpackaged: PackageFileRecord[] = [];
  for (const file of allTsFiles) {
    if (
      file === PACKAGE_REGISTRY_FILE ||
      file.endsWith(".d.ts") ||
      file.endsWith("index.ts") ||
      !isRegistryTrackableFile(file)
    ) {
      continue;
    }

    if (ownedFiles.has(file)) {
      continue;
    }

    unpackaged.push({
      type: inferFileType(file),
      path: file,
      registered: existingFileState.get(file)?.registered ?? false,
      tags: existingFileState.get(file)?.tags ?? []
    });
  }

  const preservedHelperFiles = existingRegistry.files.filter((file) => isHelperTagged(file));
  for (const file of preservedHelperFiles) {
    if (unpackaged.some((entry) => entry.path === file.path)) {
      continue;
    }

    unpackaged.push({
      ...file,
      registered: true,
      tags: [...new Set([...(file.tags ?? []), "helper"])]
    });
  }

  return {
    packages: packages
      .map((pkg) => ({ ...pkg, files: pkg.files.sort((left, right) => left.path.localeCompare(right.path)) }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    files: unpackaged.sort((left, right) => left.path.localeCompare(right.path))
  };
};

export const scanPackageIndexes = (rootDir: string): PackageRecord[] =>
  scanPackageRegistry(rootDir).packages;

export const syncPackageRegistry = (rootDir: string): PackageRegistryArtifact => {
  const scanned = scanPackageRegistry(rootDir);
  const registry: PackageRegistryArtifact = {
    packages: Object.fromEntries(scanned.packages.map((pkg) => [pkg.name, pkg])),
    files: scanned.files
  };

  savePackageRegistry(rootDir, registry);
  return registry;
};

type PackageIndexStyle = "decorator" | "functional" | "hybrid";

const derivePackageIndexView = (
  record: PackageRecord,
  style: PackageIndexStyle = "decorator"
): {
  imports: string;
  exports: string;
  packageBlock: string;
} => {
  const ownedFiles = record.files.filter((file) => file.path !== record.index && file.registered);
  const controllerFiles = style === "decorator" ? ownedFiles.filter((file) => file.path.endsWith(".controller.ts")) : [];
  const hybridControllerFiles =
    style === "hybrid" ? ownedFiles.filter((file) => file.path.endsWith(".controller.ts")) : [];
  const serviceFiles = ownedFiles.filter((file) => file.path.endsWith(".service.ts"));
  const repositoryFiles = ownedFiles.filter((file) => file.path.endsWith(".repository.ts"));
  const middlewareFiles = ownedFiles.filter((file) => file.path.endsWith(".middleware.ts"));
  const routeFiles = ownedFiles.filter((file) => file.path.endsWith(".route.ts"));
  const routeHandlerFiles = ownedFiles.filter((file) => file.path.endsWith(".route.handler.ts"));
  const dtoFiles = ownedFiles.filter((file) => file.path.endsWith(".dto.ts"));
  const typeFiles = ownedFiles.filter((file) => file.path.endsWith(".types.ts") || file.path.endsWith(".type.ts"));
  const importableFiles =
      style === "functional"
      ? [...serviceFiles, ...repositoryFiles, ...routeFiles, ...routeHandlerFiles]
      : style === "hybrid"
      ? [...hybridControllerFiles, ...serviceFiles, ...repositoryFiles, ...middlewareFiles, ...routeFiles, ...routeHandlerFiles, ...dtoFiles]
      : [
          ...controllerFiles,
          ...serviceFiles,
          ...repositoryFiles,
          ...middlewareFiles,
          ...routeFiles,
          ...dtoFiles
        ];
  const exportFiles =
      style === "functional"
      ? [...serviceFiles, ...repositoryFiles, ...routeFiles, ...routeHandlerFiles, ...typeFiles]
      : style === "hybrid"
      ? [
          ...hybridControllerFiles,
          ...serviceFiles,
          ...repositoryFiles,
          ...middlewareFiles,
          ...routeFiles,
          ...routeHandlerFiles,
          ...dtoFiles
        ]
      : [
          ...controllerFiles,
          ...serviceFiles,
          ...repositoryFiles,
          ...middlewareFiles,
          ...routeFiles,
          ...routeHandlerFiles,
          ...dtoFiles
        ];
  const packageExportFiles =
    style === "functional" ? [] : [...serviceFiles, ...repositoryFiles, ...middlewareFiles, ...dtoFiles];

  const renderArray = (values: string[]): string =>
    values.length === 0 ? "[]" : `[\n${values.map((value) => `    ${value}`).join(",\n")}\n  ]`;

  const imports = importableFiles
    .map((file) => {
      const symbol = inferSymbolFromFile(file.path);
      const relative = normalizeRelativePath(path.posix.relative(record.path, file.path)).replace(/\.ts$/, ".js");
      return `import { ${symbol} } from "./${relative}";`;
    })
    .join("\n");

  const exports = exportFiles
    .map((file) => {
      const relative = normalizeRelativePath(path.posix.relative(record.path, file.path)).replace(/\.ts$/, ".js");
      if (file.path.endsWith(".types.ts") || file.path.endsWith(".type.ts")) {
        return `export type { ${inferSymbolFromFile(file.path)} } from "./${relative}";`;
      }

      return `export * from "./${relative}";`;
    })
    .join("\n");

  const packageBlock = style === "functional"
    ? `const ${toPascalCase(record.name)}PackageDefinition = {
  name: "${record.name}",
  path: "${record.path}",
  imports: [],
  exports: ${renderArray([...serviceFiles, ...repositoryFiles].map((file) => inferSymbolFromFile(file.path)))},
  controllers: [],
  handlers: ${renderArray(routeHandlerFiles.map((file) => inferSymbolFromFile(file.path)))},
  services: ${renderArray(serviceFiles.map((file) => inferSymbolFromFile(file.path)))},
  repositories: ${renderArray(repositoryFiles.map((file) => inferSymbolFromFile(file.path)))},
  middlewares: [],
  routes: ${renderArray(routeFiles.map((file) => inferSymbolFromFile(file.path)))},
  customLinkedHelper: {
    class: [],
    function: []
  }
};

export const ${toPascalCase(record.name)}Package: SculptorFunctionalPackage = Package(${toPascalCase(record.name)}PackageDefinition)(() => ${toPascalCase(record.name)}PackageDefinition);`
    : style === "hybrid"
    ? `@Package({
  name: "${record.name}",
  path: "${record.path}",
  imports: [],
  exports: ${renderArray([...serviceFiles, ...repositoryFiles, ...dtoFiles].map((file) => inferSymbolFromFile(file.path)))},
  controllers: ${renderArray(hybridControllerFiles.map((file) => inferSymbolFromFile(file.path)))},
  handlers: ${renderArray(routeHandlerFiles.map((file) => inferSymbolFromFile(file.path)))},
  services: ${renderArray(serviceFiles.map((file) => inferSymbolFromFile(file.path)))},
  repositories: ${renderArray(repositoryFiles.map((file) => inferSymbolFromFile(file.path)))},
  middlewares: ${renderArray(middlewareFiles.map((file) => inferSymbolFromFile(file.path)))},
  routes: ${renderArray(routeFiles.map((file) => inferSymbolFromFile(file.path)))},
  customLinkedHelper: {
    class: [],
    function: []
  }
})
export class ${toPascalCase(record.name)}Package {}`
    : `@Package({
  name: "${record.name}",
  path: "${record.path}",
  imports: [],
  exports: ${renderArray(packageExportFiles.map((file) => inferSymbolFromFile(file.path)))},
  controllers: ${renderArray(controllerFiles.map((file) => inferSymbolFromFile(file.path)))},
  handlers: ${renderArray(routeHandlerFiles.map((file) => inferSymbolFromFile(file.path)))},
  services: ${renderArray(serviceFiles.map((file) => inferSymbolFromFile(file.path)))},
  repositories: ${renderArray(repositoryFiles.map((file) => inferSymbolFromFile(file.path)))},
  middlewares: ${renderArray(middlewareFiles.map((file) => inferSymbolFromFile(file.path)))},
  routes: ${renderArray(routeFiles.map((file) => inferSymbolFromFile(file.path)))},
  customLinkedHelper: {
    class: [],
    function: []
  }
})
export class ${toPascalCase(record.name)}Package {}`;

  return { imports, exports, packageBlock };
};

export const renderPackageIndex = (record: PackageRecord, style: PackageIndexStyle = "decorator"): string => {
  const sections = derivePackageIndexView(record, style);
  const importLine =
    style === "functional"
      ? 'import { Package, type SculptorFunctionalPackage } from "@sculptor/core";'
      : 'import { Package } from "@sculptor/core";';

  return `/**\n * @generated true\n */\n${importLine}\n\n// [sculptor:imports:start]\n${sections.imports}\n// [sculptor:imports:end]\n\n// [sculptor:exports:start]\n${sections.exports}\n// [sculptor:exports:end]\n\n// [sculptor:package:start]\n${sections.packageBlock}\n// [sculptor:package:end]\n`;
};

export const inferPackageNameFromPath = (packagePath: string): string =>
  normalizeRelativePath(path.posix.basename(packagePath));

export const inferPackagePath = (rootDir: string, packageName: string, explicitPath?: string): string => {
  const srcRoot = getSrcRoot(rootDir);
  const packageFolder = normalizeRelativePath(packageName);

  if (explicitPath) {
    return normalizeRelativePath(path.posix.join(normalizeRelativePath(explicitPath), packageFolder));
  }

  return normalizeRelativePath(path.posix.join(srcRoot, "app", packageFolder));
};

export const inferPackageIndexPath = (packagePath: string): string =>
  normalizeRelativePath(path.posix.join(packagePath, "index.ts"));

export const buildPackageRecord = (
  rootDir: string,
  packageName: string,
  explicitPath?: string
): PackageRecord => {
  const packagePath = inferPackagePath(rootDir, packageName, explicitPath);
  const index = inferPackageIndexPath(packagePath);
  const normalizedPackageName = normalizeRelativePath(packageName);
  const files: PackageFileRecord[] = [
    createPackageFileRecord("controller", path.posix.join(packagePath, `${normalizedPackageName}.controller.ts`), true),
    createPackageFileRecord("service", path.posix.join(packagePath, `${normalizedPackageName}.service.ts`), true),
    createPackageFileRecord("repository", path.posix.join(packagePath, `${normalizedPackageName}.repository.ts`), true),
    createPackageFileRecord("dto", path.posix.join(packagePath, `${normalizedPackageName}.dto.ts`), true),
    createPackageFileRecord("type", path.posix.join(packagePath, `${normalizedPackageName}.types.ts`), true)
  ];

  return {
    name: normalizedPackageName,
    path: packagePath,
    index,
    files,
  };
};

export const readPackageSource = (filePath: string): string => {
  const sourceText = fs.readFileSync(filePath, "utf8");
  return sourceText;
};

const isFileOwnedByPackage = (record: PackageRecord, filePath: string): boolean => {
  const normalized = normalizeRelativePath(filePath);
  return normalized.startsWith(`${record.path}/`) || normalized === record.index;
};

const renderPackageRegistryImport = (srcRoot: string, record: PackageRecord): string => {
  const packageImportPath = record.path.startsWith(`${srcRoot}/`)
    ? record.path.slice(`${srcRoot}/`.length)
    : record.path;

  return `import { ${toPascalCase(record.name)}Package } from "./${normalizeRelativePath(
    path.posix.join(packageImportPath, "index.js")
  )}";`;
};

const renderDirectRegistryImport = (srcRoot: string, file: PackageFileRecord): string | undefined => {
  if (!["controller", "service", "repository", "middleware", "route"].includes(file.type)) {
    return undefined;
  }

  const sourcePath = file.path.startsWith(`${srcRoot}/`)
    ? file.path.slice(`${srcRoot}/`.length)
    : file.path;
  const symbol = inferSymbolFromFile(file.path);

  return `import { ${symbol} } from "./${normalizeRelativePath(
    path.posix.join(sourcePath.replace(/\.ts$/, ".js"))
  )}";`;
};

const renderRegistryRootFile = (rootDir: string, registry: PackageRegistryArtifact): string => {
  const srcRoot = getSrcRoot(rootDir);
  const packageRecords = Object.values(registry.packages).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const directFiles = registry.files
    .filter((file) => file.registered)
    .sort((left, right) => left.path.localeCompare(right.path));
  const packageImports = packageRecords.map((record) => renderPackageRegistryImport(srcRoot, record));
  const directImports = directFiles
    .map((file) => renderDirectRegistryImport(srcRoot, file))
    .filter((value): value is string => Boolean(value));
  const directControllers = directFiles
    .filter((file) => file.type === "controller")
    .map((file) => inferSymbolFromFile(file.path));
  const directServices = directFiles
    .filter((file) => file.type === "service")
    .map((file) => inferSymbolFromFile(file.path));
  const directRepositories = directFiles
    .filter((file) => file.type === "repository")
    .map((file) => inferSymbolFromFile(file.path));
  const directMiddlewares = directFiles
    .filter((file) => file.type === "middleware")
    .map((file) => inferSymbolFromFile(file.path));
  const directRoutes = directFiles
    .filter((file) => file.type === "route")
    .map((file) => inferSymbolFromFile(file.path));
  const packageEntries = packageRecords.map((record) => `${toPascalCase(record.name)}Package`);

  return `/**
 * @generated true
 */
${[...packageImports, ...directImports].join("\n")}

export const registry = {
  packages: [${packageEntries.join(", ")}],
  controllers: [${directControllers.join(", ")}],
  routes: [${directRoutes.join(", ")}],
  services: [${directServices.join(", ")}],
  repositories: [${directRepositories.join(", ")}],
  middlewares: [${directMiddlewares.join(", ")}]
};
`;
};

export const syncRootRegistryForPackages = (rootDir: string): string => {
  const srcRoot = getSrcRoot(rootDir);
  const registryPath = path.join(rootDir, srcRoot, "registry.ts");
  const registry = loadPackageRegistry(rootDir);

  if (Object.keys(registry.packages).length === 0 && registry.files.length === 0 && !fs.existsSync(registryPath)) {
    return registryPath;
  }

  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  const next = renderRegistryRootFile(rootDir, registry);
  fs.writeFileSync(registryPath, next, "utf8");
  return registryPath;
};

export const upsertFileIntoRegistry = (
  registry: PackageRegistryArtifact,
  filePath: string
): PackageRegistryArtifact => {
  const normalizedPath = normalizeRelativePath(filePath);
  const fileType = inferFileType(normalizedPath);
  const helperTags = isHelperLikeFile(normalizedPath) ? ["helper"] : [];

  for (const record of Object.values(registry.packages)) {
    if (normalizedPath === record.index) {
      return registry;
    }

    if (!isFileOwnedByPackage(record, normalizedPath)) {
      continue;
    }

    const existingIndex = record.files.findIndex((entry) => entry.path === normalizedPath);
    const nextFile = createPackageFileRecord(fileType, normalizedPath, true, helperTags);

    if (existingIndex >= 0) {
      record.files[existingIndex] = nextFile;
    } else {
      record.files.push(nextFile);
    }

    return registry;
  }

  const existing = registry.files.findIndex((entry) => entry.path === normalizedPath);
  const nextFile = createPackageFileRecord(fileType, normalizedPath, true, helperTags);

  if (existing >= 0) {
    registry.files[existing] = nextFile;
  } else {
    registry.files.push(nextFile);
  }

  return registry;
};

export const unregisterFileFromRegistry = (
  registry: PackageRegistryArtifact,
  filePath: string
): PackageRegistryArtifact => {
  const normalizedPath = normalizeRelativePath(filePath);
  const helperTags = isHelperLikeFile(normalizedPath) ? ["helper"] : [];

  for (const record of Object.values(registry.packages)) {
    if (normalizedPath === record.index) {
      return registry;
    }

    if (!isFileOwnedByPackage(record, normalizedPath)) {
      continue;
    }

    const existingIndex = record.files.findIndex((entry) => entry.path === normalizedPath);
    if (existingIndex >= 0) {
      record.files[existingIndex] = {
        ...record.files[existingIndex]!,
        registered: false,
        tags: [...new Set([...(record.files[existingIndex]?.tags ?? []), ...helperTags])]
      };
    } else {
      record.files.push(
        createPackageFileRecord(inferFileType(normalizedPath), normalizedPath, false, helperTags)
      );
    }

    return registry;
  }

  const existingIndex = registry.files.findIndex((entry) => entry.path === normalizedPath);
  if (existingIndex >= 0) {
    registry.files[existingIndex] = {
      ...registry.files[existingIndex]!,
      registered: false,
      tags: [...new Set([...(registry.files[existingIndex]?.tags ?? []), ...helperTags])]
    };
    return registry;
  }

  registry.files.push(createPackageFileRecord(inferFileType(normalizedPath), normalizedPath, false, helperTags));
  return registry;
};

export const deleteFileFromRegistry = (
  registry: PackageRegistryArtifact,
  filePath: string
): PackageRegistryArtifact => {
  const normalizedPath = normalizeRelativePath(filePath);

  for (const record of Object.values(registry.packages)) {
    if (normalizedPath === record.index) {
      return registry;
    }

    if (!isFileOwnedByPackage(record, normalizedPath)) {
      continue;
    }

    record.files = record.files.filter((entry) => entry.path !== normalizedPath);
    return registry;
  }

  registry.files = registry.files.filter((entry) => entry.path !== normalizedPath);
  return registry;
};

export const getOwningPackage = (
  registry: PackageRegistryArtifact,
  filePath: string
): PackageRecord | undefined => {
  const normalizedPath = normalizeRelativePath(filePath);
  return Object.values(registry.packages).find((record) => isFileOwnedByPackage(record, normalizedPath));
};

export const renderPackageIndexForRecord = (record: PackageRecord): string =>
  renderPackageIndex(record, inferPackageIndexStyle(record));

const generatedMarkers = {
  imports: {
    start: "// [sculptor:imports:start]",
    end: "// [sculptor:imports:end]"
  },
  exports: {
    start: "// [sculptor:exports:start]",
    end: "// [sculptor:exports:end]"
  },
  package: {
    start: "// [sculptor:package:start]",
    end: "// [sculptor:package:end]"
  }
} as const;

const replaceMarkerBlock = (source: string, section: keyof typeof generatedMarkers, content: string): string => {
  const { start, end } = generatedMarkers[section];
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);

  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`Malformed package index markers for ${section}.`);
  }

  if (source.indexOf(start, startIndex + start.length) !== -1 || source.indexOf(end, endIndex + end.length) !== -1) {
    throw new Error(`Malformed package index markers for ${section}.`);
  }

  return `${source.slice(0, startIndex + start.length)}\n${content}\n${source.slice(endIndex)}`;
};

const inferPackageIndexStyle = (record: PackageRecord, sourceText?: string): PackageIndexStyle => {
  if (sourceText?.includes("SculptorFunctionalPackage")) {
    return "functional";
  }

  const hasControllers = record.files.some((file) => file.path.endsWith(".controller.ts"));
  const hasRoutes = record.files.some((file) => file.path.endsWith(".route.ts") || file.path.endsWith(".route.handler.ts"));

  if (hasControllers && hasRoutes) {
    return "hybrid";
  }

  if (hasControllers) {
    return "decorator";
  }

  return "functional";
};

const renderPackageIndexSections = (
  record: PackageRecord,
  style: PackageIndexStyle = "decorator"
): Record<keyof typeof generatedMarkers, string> => {
  const sections = derivePackageIndexView(record, style);

  return {
    imports: sections.imports,
    exports: sections.exports,
    package: sections.packageBlock
  };
};

export const updatePackageIndexForRecord = (filePath: string, record: PackageRecord): void => {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, renderPackageIndex(record, inferPackageIndexStyle(record)), "utf8");
    return;
  }

  const current = fs.readFileSync(filePath, "utf8");
  const style = inferPackageIndexStyle(record, current);

  for (const section of Object.keys(generatedMarkers) as Array<keyof typeof generatedMarkers>) {
    if (!current.includes(generatedMarkers[section].start) || !current.includes(generatedMarkers[section].end)) {
      throw new Error(
        `Package index markers are missing or malformed in ${filePath}. Refusing to rewrite the file unsafely.`
      );
    }
  }

  let updated = current;
  const sections = renderPackageIndexSections(record, style);
  updated = replaceMarkerBlock(updated, "imports", sections.imports);
  updated = replaceMarkerBlock(updated, "exports", sections.exports);
  updated = replaceMarkerBlock(updated, "package", sections.package);

  if (updated !== current) {
    fs.writeFileSync(filePath, updated, "utf8");
  }
};
