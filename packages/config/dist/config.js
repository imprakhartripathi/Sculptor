import fs from "node:fs";
import path from "node:path";
const cache = new Map();
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
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
export const loadConfig = (rootDir = process.cwd()) => {
    const cached = cache.get(rootDir);
    if (cached) {
        return cached;
    }
    const frameworkPath = path.join(rootDir, "sculptor.json");
    const runtimePath = path.join(rootDir, "props.json");
    const framework = readJsonFile(frameworkPath);
    const runtime = readJsonFile(runtimePath);
    const merged = deepMerge(framework, runtime);
    const loaded = {
        framework,
        runtime,
        merged: merged,
        rootDir
    };
    cache.set(rootDir, loaded);
    return loaded;
};
export const getConfig = (pathExpression, rootDir = process.cwd()) => {
    const config = loadConfig(rootDir).merged;
    const segments = pathExpression.split(".").filter(Boolean);
    let cursor = config;
    for (const segment of segments) {
        if (!isPlainObject(cursor) || !(segment in cursor)) {
            return undefined;
        }
        cursor = cursor[segment];
    }
    return cursor;
};
//# sourceMappingURL=config.js.map