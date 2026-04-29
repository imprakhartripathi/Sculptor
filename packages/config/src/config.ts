import fs from "node:fs";
import path from "node:path";

export interface FrameworkConfig {
  project?: {
    srcRoot?: string;
    entryFile?: string;
    devServer?: "tsnode" | "nodemon";
  };
  logging?: {
    enabled?: boolean;
    dogMode?: boolean;
  };
  routing?: {
    style?: "decorator" | "functional" | "hybrid";
  };
  testing?: {
    generate?: boolean;
    framework?: "vitest";
  };
  frameworkLock?: boolean;
}

export interface RuntimeConfig {
  app?: {
    port?: number;
    prefix?: string;
  };
}

export interface LoadedConfig {
  framework: FrameworkConfig;
  runtime: RuntimeConfig;
  merged: FrameworkConfig & RuntimeConfig;
  rootDir: string;
}

const cache = new Map<string, LoadedConfig>();

const readJsonFile = <T extends object>(filePath: string): T => {
  if (!fs.existsSync(filePath)) {
    return {} as T;
  }

  const raw = fs.readFileSync(filePath, "utf8");

  if (!raw.trim()) {
    return {} as T;
  }

  return JSON.parse(raw) as T;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const deepMerge = <T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>
): T => {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value
      );
      continue;
    }

    result[key] = value;
  }

  return result as T;
};

export const loadConfig = (rootDir = process.cwd()): LoadedConfig => {
  const cached = cache.get(rootDir);

  if (cached) {
    return cached;
  }

  const frameworkPath = path.join(rootDir, "sculptor.json");
  const runtimePath = path.join(rootDir, "props.json");

  const framework = readJsonFile<FrameworkConfig>(frameworkPath);
  const runtime = readJsonFile<RuntimeConfig>(runtimePath);
  const merged = deepMerge(
    framework as Record<string, unknown>,
    runtime as Record<string, unknown>
  );

  const loaded: LoadedConfig = {
    framework,
    runtime,
    merged: merged as FrameworkConfig & RuntimeConfig,
    rootDir
  };

  cache.set(rootDir, loaded);
  return loaded;
};

export const getConfig = (pathExpression: string, rootDir = process.cwd()): unknown => {
  const config = loadConfig(rootDir).merged;
  const segments = pathExpression.split(".").filter(Boolean);

  let cursor: unknown = config;

  for (const segment of segments) {
    if (!isPlainObject(cursor) || !(segment in cursor)) {
      return undefined;
    }

    cursor = cursor[segment];
  }

  return cursor;
};
