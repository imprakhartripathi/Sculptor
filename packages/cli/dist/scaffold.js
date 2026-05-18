import { detectPackageManager, globalInstallArgsFor } from "./package-manager.js";
export const controllerHelp = `# Controller Generator

## Usage

\`\`\`bash
sc generate controller user
sc g c user
sc generate controller user in src/app/controllers
sc g c user --functional
\`\`\`

## Output

- \`controllers/*.controller.ts\`
- controller-first by default
- pass \`--functional\` to opt into paired functional route and handler files
`;
export const moduleHelp = `# Module Generator

## Usage

\`\`\`bash
sc generate module user
sc g mo user
\`\`\`
`;
export const middlewareHelp = `# Middleware Generator

## Usage

\`\`\`bash
sc generate middleware auth
sc g mw auth
\`\`\`
`;
export const typeHelp = `# Type Generator

## Usage

\`\`\`bash
sc generate type user
sc g t user
sc g t user -i
sc g t user -c
sc g t user -e
\`\`\`

## Flags

- \`-i\`, \`-interface\` => \`*.interface.ts\`
- \`-c\`, \`-class\` => \`*.class.ts\`
- \`-e\`, \`-enum\` => \`*.enum.ts\`
- default => \`*.type.ts\`
`;
export const routeHelp = `# Route Generator

## Usage

\`\`\`bash
sc generate route user
sc g r user
\`\`\`

## Output

- \`*.route.ts\`
- \`*.route.handler.ts\`
- uses \`FunctionalRouter(prefix)\`
- generates a paired handler with try/catch and error middleware boilerplate
`;
export const generateHelp = `# Generate

## Usage

\`\`\`bash
sc generate controller user
sc generate service user
sc generate module user
sc generate middleware auth
sc generate type user
sc generate route user
\`\`\`

## Aliases

- \`sc g\`
- \`controller\` -> \`c\`
- \`service\` -> \`s\`
- \`module\` -> \`m\` / \`mo\`
- \`middleware\` -> \`mw\`
- \`type\` -> \`t\`
- \`route\` -> \`r\`

## Path

- append \`in <path>\` to write into a custom directory
- default output for types is \`src/app/types\`
- controller generators are controller-first by default; pass \`--functional\` only when you want the paired functional route files
- route generators always emit the paired functional route and handler files
`;
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
const TEMPLATE_REGISTRY_PACKAGE = "@sculptor/template-registry";
const WORKSPACE_TEMPLATE_REGISTRY_PATH = "../../template-registry/dist/index.js";
const missingDependencyMessage = `Sculptor template registry is not installed.`;
const isMissingTemplateRegistryError = (error) => {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    const code = "code" in error ? String(error.code ?? "") : "";
    const message = "message" in error ? String(error.message ?? "") : "";
    return (code === "ERR_MODULE_NOT_FOUND" ||
        code === "MODULE_NOT_FOUND" ||
        message.includes(TEMPLATE_REGISTRY_PACKAGE) ||
        message.includes("Cannot find module") ||
        message.includes("Cannot find package"));
};
export const loadScaffoldTemplateRegistry = async (context, importer = async () => {
    try {
        return (await import(TEMPLATE_REGISTRY_PACKAGE));
    }
    catch {
        return (await import(WORKSPACE_TEMPLATE_REGISTRY_PATH));
    }
}) => {
    try {
        return await importer();
    }
    catch (error) {
        if (!isMissingTemplateRegistryError(error)) {
            throw error;
        }
        if (!context) {
            throw new Error(`${missingDependencyMessage} Install it with npm install -g @sculptor/template-registry.`);
        }
        const answer = await context.prompt(`${missingDependencyMessage}\n\nWould you like to install it and rerun the command? (y/n)`, "n");
        if (!answer.trim().toLowerCase().startsWith("y")) {
            context.log("Skipped installing @sculptor/template-registry.");
            process.exitCode = 1;
            return null;
        }
        const packageManager = detectPackageManager();
        context.log(`Installing ${TEMPLATE_REGISTRY_PACKAGE} with ${packageManager}...`);
        const installResult = context.spawn(packageManager, globalInstallArgsFor(packageManager, [TEMPLATE_REGISTRY_PACKAGE]), {
            cwd: context.cwd,
            stdio: "inherit",
            shell: process.platform === "win32",
            env: {
                ...process.env
            }
        });
        if (installResult.status !== 0) {
            throw new Error(`Failed to install ${TEMPLATE_REGISTRY_PACKAGE} with ${packageManager}.`);
        }
        try {
            return await importer();
        }
        catch {
            throw new Error(`${missingDependencyMessage} The package was installed, but it could not be loaded afterward.`);
        }
    }
};
export const scaffoldProject = async (metadata, targetDir, context) => {
    const registry = await loadScaffoldTemplateRegistry(context);
    if (!registry) {
        return false;
    }
    registry.scaffoldProject(metadata, targetDir);
    return true;
};
export const generateResourceFiles = async (kind, name, mode, devServer = "tsx", outputDir, typeVariant = "type", functionalRoutes = false, testingGenerate = false, context) => {
    const registry = await loadScaffoldTemplateRegistry(context);
    if (!registry) {
        return null;
    }
    return registry.generateResourceFiles(kind, name, mode, devServer, outputDir, typeVariant, functionalRoutes, testingGenerate);
};
export const writeGeneratedFiles = async (targetDir, files, context) => {
    const registry = await loadScaffoldTemplateRegistry(context);
    if (!registry) {
        return false;
    }
    registry.writeGeneratedFiles(targetDir, files);
    return true;
};
export const syncTestHarness = async (targetDir, context) => {
    const registry = await loadScaffoldTemplateRegistry(context);
    if (!registry) {
        return false;
    }
    registry.syncTestHarness(targetDir);
    return true;
};
//# sourceMappingURL=scaffold.js.map