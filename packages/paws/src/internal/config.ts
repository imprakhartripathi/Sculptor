import { getConfig } from "@sculptor/config";
import type { LoggerMode } from "./format.js";

export interface LoggingConfig {
  enabled: boolean;
  dogMode: boolean;
}

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

export const resolveLoggingConfig = (
  rootDir = process.env.SCULPTOR_ROOT_DIR ?? process.cwd()
): LoggingConfig => ({
  enabled: asBoolean(getConfig("logging.enabled", rootDir), true),
  dogMode: asBoolean(getConfig("logging.dogMode", rootDir), false)
});

export const resolveLoggerMode = (
  rootDir = process.env.SCULPTOR_ROOT_DIR ?? process.cwd()
): LoggerMode =>
  resolveLoggingConfig(rootDir).dogMode ? "dog" : "standard";
