import path from "node:path";
export const toPascalCase = (value) => value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
export const toCamelCase = (value) => {
    const pascal = toPascalCase(value);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};
export const toKebabCase = (value) => value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
export const normalizeRelativePath = (value) => value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
export const resolveFileStem = (name, outputDir) => {
    if (name) {
        return name;
    }
    const trimmedDir = normalizeRelativePath(outputDir);
    const parts = trimmedDir.split("/").filter(Boolean);
    const inferred = parts[parts.length - 1];
    return inferred ?? "index";
};
export const controllerFileName = (name) => `${name}.controller.ts`;
export const serviceFileName = (name) => `${name}.service.ts`;
export const moduleFileName = (name) => `${name}.module.ts`;
export const middlewareFileName = (name) => `${name}.middleware.ts`;
export const routeFileName = (name) => `${name}.route.ts`;
export const routeHandlerFileName = (name) => `${name}.route.handler.ts`;
export const typeFileName = (name, variant) => {
    const suffix = variant === "type" ? "type" : variant;
    return `${name}.${suffix}.ts`;
};
export const specFileName = (name, suffix) => `${name}.${suffix}.spec.ts`;
export const toRoutePath = (value) => {
    const kebab = toKebabCase(value);
    if (kebab.endsWith("y") && !/[aeiou]y$/.test(kebab)) {
        return `${kebab.slice(0, -1)}ies`;
    }
    if (/(s|x|z|ch|sh)$/.test(kebab)) {
        return `${kebab}es`;
    }
    return `${kebab}s`;
};
export const specImportPath = (sourcePath) => normalizeRelativePath(path.posix.relative("src/tests", sourcePath)).replace(/\.ts$/, ".js");
export const resolveGeneratorOutputDir = (kind, outputDir, name) => {
    if (outputDir) {
        return normalizeRelativePath(outputDir);
    }
    switch (kind) {
        case "pkg":
            return normalizeRelativePath("src/app");
        case "controller":
            return "src/app/controllers";
        case "service":
            return "src/app/services";
        case "repository":
            return "src/app/repositories";
        case "dto":
            return "src/app/dtos";
        case "module":
            return "src/app/modules";
        case "middleware":
            return "src/app/middlewares";
        case "type":
            return "src/app/types";
        case "route":
            return "src/app/routes";
    }
};
export const devScriptFor = (devServer) => devServer === "tsx"
    ? "tsx src/main.ts"
    : "nodemon --watch src --ext ts --exec tsx src/main.ts";
export const devDependenciesFor = (devServer) => devServer === "tsx"
    ? ""
    : `    "nodemon": "^3.1.9",\n`;
//# sourceMappingURL=utils.js.map