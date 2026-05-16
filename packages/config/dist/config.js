import fs from "node:fs";
import path from "node:path";
import { getValueAtPath, resolveInterpolations } from "./interpolation.js";
import { redactConfig } from "./redact.js";
export class ConfigError extends Error {
    constructor() {
        super(...arguments);
        this.name = "ConfigError";
    }
}
export class ConfigInterpolationError extends ConfigError {
    constructor() {
        super(...arguments);
        this.name = "ConfigInterpolationError";
    }
}
const defaultFrameworkConfig = {
    project: {
        srcRoot: "src",
        entryFile: "main.ts",
        devServer: "tsx"
    },
    logging: {
        enabled: true,
        dogMode: false
    },
    routing: {
        style: "decorator"
    },
    testing: {
        generate: true,
        framework: "vitest"
    },
    frameworkLock: false,
    plugins: {
        enabled: false,
        registry: []
    }
};
const defaultRuntimeConfig = {
    app: {
        port: 3000,
        prefix: ""
    }
};
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const readJsonFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return {};
    }
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) {
        return {};
    }
    return JSON.parse(raw);
};
const deepMerge = (base, override) => {
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (isPlainObject(value) && isPlainObject(result[key])) {
            result[key] = deepMerge(result[key], value);
            continue;
        }
        result[key] = value;
    }
    return result;
};
const parseDotEnvValue = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }
    const first = trimmed.charAt(0);
    const last = trimmed.charAt(trimmed.length - 1);
    if ((first === `"` || first === `'`) && first === last) {
        const body = trimmed.slice(1, -1);
        return body
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\"/g, `"`)
            .replace(/\\'/g, `'`)
            .replace(/\\\\/g, `\\`);
    }
    return trimmed;
};
const parseDotEnvFile = (filePath, existing) => {
    if (!fs.existsSync(filePath)) {
        return {};
    }
    const result = {};
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
            continue;
        }
        const normalized = line.startsWith("export ") ? line.slice("export ".length) : line;
        const equalsIndex = normalized.indexOf("=");
        if (equalsIndex < 0) {
            continue;
        }
        const key = normalized.slice(0, equalsIndex).trim();
        const rawValue = normalized.slice(equalsIndex + 1);
        if (!key) {
            continue;
        }
        const placeholderResolver = (token) => {
            if (token in result) {
                return result[token];
            }
            if (token in existing) {
                return existing[token];
            }
            return undefined;
        };
        const parsed = parseDotEnvValue(rawValue);
        const interpolated = resolveInterpolations(parsed, (token) => placeholderResolver(token));
        result[key] = interpolated;
        existing[key] = interpolated;
    }
    return result;
};
const buildEnvMap = (dotenvValues) => ({
    ...dotenvValues,
    ...Object.fromEntries(Object.entries(process.env).flatMap(([key, value]) => value === undefined ? [] : [[key, String(value)]]))
});
const resolveConfigPath = (root, envMap, pathExpression, trail = []) => {
    if (trail.includes(pathExpression)) {
        throw new ConfigInterpolationError(`Circular interpolation detected for "${pathExpression}".`);
    }
    const value = getValueAtPath(root, pathExpression);
    if (typeof value === "string") {
        return resolveInterpolations(value, (token) => {
            if (token in envMap) {
                return envMap[token];
            }
            if (getValueAtPath(root, token) === undefined) {
                return undefined;
            }
            const resolved = resolveConfigPath(root, envMap, token, [...trail, pathExpression]);
            if (resolved === undefined || resolved === null) {
                return undefined;
            }
            return typeof resolved === "string" ? resolved : String(resolved);
        });
    }
    if (Array.isArray(value)) {
        return value.map((entry, index) => {
            const nestedPath = `${pathExpression}.${index}`;
            return resolveInterpolations(entry, (token) => {
                if (token in envMap) {
                    return envMap[token];
                }
                if (getValueAtPath(root, token) === undefined) {
                    return undefined;
                }
                const resolved = resolveConfigPath(root, envMap, token, [...trail, nestedPath]);
                return resolved === undefined || resolved === null
                    ? undefined
                    : typeof resolved === "string"
                        ? resolved
                        : String(resolved);
            });
        });
    }
    if (!isPlainObject(value)) {
        return value;
    }
    const resolved = {};
    for (const [key, entry] of Object.entries(value)) {
        const nestedPath = `${pathExpression}.${key}`;
        if (typeof entry === "string") {
            resolved[key] = resolveInterpolations(entry, (token) => {
                if (token in envMap) {
                    return envMap[token];
                }
                if (getValueAtPath(root, token) === undefined) {
                    return undefined;
                }
                const resolvedToken = resolveConfigPath(root, envMap, token, [...trail, nestedPath]);
                return resolvedToken === undefined || resolvedToken === null
                    ? undefined
                    : typeof resolvedToken === "string"
                        ? resolvedToken
                        : String(resolvedToken);
            });
            continue;
        }
        if (Array.isArray(entry)) {
            resolved[key] = resolveConfigPath(root, envMap, nestedPath, [...trail, pathExpression]);
            continue;
        }
        if (isPlainObject(entry)) {
            const nestedResolved = {};
            for (const [nestedKey, nestedValue] of Object.entries(entry)) {
                const deepPath = `${nestedPath}.${nestedKey}`;
                nestedResolved[nestedKey] = resolveConfigPath(root, envMap, deepPath, [
                    ...trail,
                    pathExpression
                ]);
            }
            resolved[key] = nestedResolved;
            continue;
        }
        resolved[key] = entry;
    }
    return resolved;
};
const resolveConfigObject = (input, envMap) => {
    const root = input;
    const resolved = {};
    for (const key of Object.keys(root)) {
        resolved[key] = resolveConfigPath(root, envMap, key, []);
    }
    return resolved;
};
export const loadConfig = (rootDir = process.cwd(), overrides = {}) => {
    const frameworkPath = path.join(rootDir, "sculptor.json");
    const runtimePath = path.join(rootDir, "props.json");
    const envPath = path.join(rootDir, ".env");
    const frameworkFile = readJsonFile(frameworkPath);
    const runtimeFile = readJsonFile(runtimePath);
    const frameworkWithDefaults = deepMerge(defaultFrameworkConfig, frameworkFile);
    const runtimeWithDefaults = deepMerge(defaultRuntimeConfig, runtimeFile);
    const dotenvValues = parseDotEnvFile(envPath, { ...process.env });
    const envMap = buildEnvMap(dotenvValues);
    const mergedBeforeInterpolation = deepMerge(deepMerge(frameworkWithDefaults, runtimeWithDefaults), {});
    const resolvedMerged = resolveConfigObject(mergedBeforeInterpolation, envMap);
    const mergedAfterOverrides = deepMerge(resolvedMerged, deepMerge((overrides.framework ?? {}), (overrides.runtime ?? {})));
    const loaded = {
        framework: resolveConfigObject(frameworkWithDefaults, envMap),
        runtime: resolveConfigObject(runtimeWithDefaults, envMap),
        merged: mergedAfterOverrides,
        rootDir
    };
    return loaded;
};
export const getConfig = (pathExpression, rootDir = process.cwd(), overrides = {}) => {
    const config = loadConfig(rootDir, overrides).merged;
    return getValueAtPath(config, pathExpression);
};
export { redactConfig };
//# sourceMappingURL=config.js.map