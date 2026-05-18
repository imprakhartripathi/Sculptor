import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeTextFile } from "../fs.js";
import { normalizeRelativePath, resolveFileStem, resolveGeneratorOutputDir } from "./utils.js";
import { eslintConfigTemplate, healthControllerSpecTemplate, healthControllerTemplate, healthModuleTemplate, healthRouteHandlerTemplate, healthRouteSpecTemplate, healthRouteTemplate, healthServiceTemplate, mainSpecTemplate, mainTemplate, rootGitignoreTemplate, propsTemplate, registryTemplate, rootPackageJsonTemplate, rootReadmeTemplate, rootTsconfigTemplate, sculptorTemplate, testHarnessSpecTemplate, testRegistryTemplate, testRunnerTemplate, vitestConfigTemplate } from "./templates/scaffold.js";
import { controllerSpecTemplate, createDecoratorController, createFunctionalArtifacts, createMiddlewareResource, createModuleResource, createRouteResource, createServiceResource, createTypeResource, middlewareSpecTemplate, routeSpecTemplate, serviceSpecTemplate } from "./templates/resources.js";
import { controllerHelp, generateHelp, middlewareHelp, moduleHelp, routeHelp, typeHelp } from "./templates/help.js";
export { controllerHelp, generateHelp, middlewareHelp, moduleHelp, routeHelp, typeHelp };
const collectSpecPaths = (dir, rootDir = dir) => {
    if (!fs.existsSync(dir)) {
        return [];
    }
    const specs = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            specs.push(...collectSpecPaths(fullPath, rootDir));
            continue;
        }
        if (!entry.isFile() || !entry.name.endsWith(".spec.ts")) {
            continue;
        }
        const relativePath = normalizeRelativePath(path.relative(rootDir, fullPath));
        if (["registry.ts", "runner.ts", "runner.spec.ts"].includes(relativePath)) {
            continue;
        }
        specs.push(`./${relativePath.replace(/\.ts$/, ".js")}`);
    }
    return specs.sort();
};
export const syncTestHarness = (targetDir) => {
    const testsDir = path.join(targetDir, "src", "tests");
    ensureDir(testsDir);
    const specs = collectSpecPaths(testsDir);
    writeTextFile(path.join(testsDir, "registry.ts"), testRegistryTemplate(specs));
    writeTextFile(path.join(testsDir, "runner.ts"), testRunnerTemplate());
    writeTextFile(path.join(testsDir, "runner.spec.ts"), testHarnessSpecTemplate());
};
const appShellFiles = (metadata) => ({
    "package.json": rootPackageJsonTemplate(metadata.appName, metadata.version, metadata.devServer),
    "README.md": rootReadmeTemplate(metadata.appName),
    "tsconfig.json": rootTsconfigTemplate,
    "sculptor.json": sculptorTemplate(metadata.mode, metadata.devServer, metadata.frameworkLock, metadata.testing),
    "props.json": propsTemplate,
    "src/main.ts": mainTemplate,
    "src/registry.ts": registryTemplate(metadata.mode)
});
export const scaffoldProject = (metadata, targetDir) => {
    ensureDir(targetDir);
    const rootFiles = {
        ...appShellFiles(metadata),
        "eslint.config.js": eslintConfigTemplate,
        "vitest.config.ts": vitestConfigTemplate,
        ".gitignore": rootGitignoreTemplate,
        "src/app/services/health.service.ts": healthServiceTemplate,
        "src/app/modules/health.module.ts": healthModuleTemplate
    };
    if (metadata.mode === "decorator" || metadata.mode === "hybrid") {
        rootFiles["src/app/controllers/health.controller.ts"] = healthControllerTemplate;
    }
    if (metadata.mode === "functional" || metadata.mode === "hybrid") {
        rootFiles["src/app/routes/health.route.ts"] = healthRouteTemplate;
        rootFiles["src/app/handlers/health.route.handler.ts"] = healthRouteHandlerTemplate;
    }
    if (metadata.testing.generate) {
        rootFiles["src/tests/main.spec.ts"] = mainSpecTemplate;
        if (metadata.mode === "decorator" || metadata.mode === "hybrid") {
            rootFiles["src/tests/health.controller.spec.ts"] = healthControllerSpecTemplate;
        }
        if (metadata.mode === "functional" || metadata.mode === "hybrid") {
            rootFiles["src/tests/health.route.spec.ts"] = healthRouteSpecTemplate;
        }
    }
    for (const [relativePath, content] of Object.entries(rootFiles)) {
        writeTextFile(path.join(targetDir, relativePath), content);
    }
    for (const dir of [
        "src/app/controllers",
        "src/app/routes",
        "src/app/services",
        "src/app/modules",
        "src/app/middlewares",
        "src/app/handlers",
        "src/tests"
    ]) {
        ensureDir(path.join(targetDir, dir));
    }
    if (metadata.testing.generate) {
        syncTestHarness(targetDir);
    }
};
export const generateResourceFiles = (kind, name, _mode, _devServer = "tsx", outputDir, typeVariant = "type", functionalRoutes = false, testingGenerate = false) => {
    const resolvedOutputDir = resolveGeneratorOutputDir(kind, outputDir);
    const resolvedName = resolveFileStem(name, resolvedOutputDir);
    const sourceFiles = {};
    switch (kind) {
        case "controller":
            Object.assign(sourceFiles, createDecoratorController(resolvedName, resolvedOutputDir));
            if (functionalRoutes) {
                Object.assign(sourceFiles, createFunctionalArtifacts(resolvedName));
            }
            break;
        case "service":
            Object.assign(sourceFiles, {
                [`${resolvedOutputDir}/${resolvedName}.service.ts`]: createServiceResource(resolvedName)[`src/app/services/${resolvedName}.service.ts`]
            });
            break;
        case "module":
            Object.assign(sourceFiles, {
                [`${resolvedOutputDir}/${resolvedName}.module.ts`]: createModuleResource(resolvedName)[`src/app/modules/${resolvedName}.module.ts`]
            });
            break;
        case "middleware":
            Object.assign(sourceFiles, {
                [`${resolvedOutputDir}/${resolvedName}.middleware.ts`]: createMiddlewareResource(resolvedName)[`src/app/middlewares/${resolvedName}.middleware.ts`]
            });
            break;
        case "type":
            Object.assign(sourceFiles, createTypeResource(resolvedName, typeVariant, resolvedOutputDir));
            break;
        case "route":
            Object.assign(sourceFiles, createRouteResource(resolvedName, resolvedOutputDir));
            break;
    }
    if (!testingGenerate) {
        return sourceFiles;
    }
    const testFiles = {};
    for (const [filePath] of Object.entries(sourceFiles)) {
        const normalizedPath = normalizeRelativePath(filePath);
        const baseName = path.posix.basename(normalizedPath, ".ts");
        if (normalizedPath.endsWith(".controller.ts")) {
            const resourceName = baseName.replace(/\.controller$/, "");
            testFiles[`src/tests/${resourceName}.controller.spec.ts`] =
                controllerSpecTemplate(resourceName, normalizedPath);
            continue;
        }
        if (normalizedPath.endsWith(".service.ts")) {
            const resourceName = baseName.replace(/\.service$/, "");
            testFiles[`src/tests/${resourceName}.service.spec.ts`] =
                serviceSpecTemplate(resourceName, normalizedPath);
            continue;
        }
        if (normalizedPath.endsWith(".route.ts")) {
            const resourceName = baseName.replace(/\.route$/, "");
            testFiles[`src/tests/${resourceName}.route.spec.ts`] =
                routeSpecTemplate(resourceName, normalizedPath);
            continue;
        }
        if (normalizedPath.endsWith(".middleware.ts")) {
            const resourceName = baseName.replace(/\.middleware$/, "");
            testFiles[`src/tests/${resourceName}.middleware.spec.ts`] =
                middlewareSpecTemplate(resourceName, normalizedPath);
        }
    }
    return { ...sourceFiles, ...testFiles };
};
export const writeGeneratedFiles = (targetDir, files) => {
    for (const [relativePath, content] of Object.entries(files)) {
        writeTextFile(path.join(targetDir, relativePath), content);
    }
};
export const readModeFromFlags = (flags, fallback) => {
    if (flags.includes("--functional")) {
        return "functional";
    }
    if (flags.includes("--decorator")) {
        return "decorator";
    }
    if (flags.includes("--hybrid")) {
        return "hybrid";
    }
    return fallback;
};
export const parseGenerateMode = (mode, fallback) => mode === "functional" || mode === "decorator" || mode === "hybrid" ? mode : fallback;
//# sourceMappingURL=index.js.map