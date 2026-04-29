import { getConfig } from "@sculptor/config";
const asBoolean = (value, fallback) => typeof value === "boolean" ? value : fallback;
export const resolveLoggingConfig = (rootDir = process.env.SCULPTOR_ROOT_DIR ?? process.cwd()) => ({
    enabled: asBoolean(getConfig("logging.enabled", rootDir), true),
    dogMode: asBoolean(getConfig("logging.dogMode", rootDir), false)
});
export const resolveLoggerMode = (rootDir = process.env.SCULPTOR_ROOT_DIR ?? process.cwd()) => resolveLoggingConfig(rootDir).dogMode ? "dog" : "standard";
//# sourceMappingURL=config.js.map