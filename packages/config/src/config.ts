import fs from "node:fs";
import path from "node:path";

import { getValueAtPath, resolveInterpolations } from "./interpolation.js";
import { redactConfig } from "./redact.js";

export interface FrameworkConfig {
  project?: {
    srcRoot?: string;
    entryFile?: string;
    devServer?: "tsx" | "nodemon";
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
  plugins?: {
    enabled?: boolean;
    registry?: string[];
  };
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

export interface ConfigOverrides {
  framework?: Partial<FrameworkConfig>;
  runtime?: Partial<RuntimeConfig>;
}

export class ConfigError extends Error {
  override name = "ConfigError";
}

export class ConfigInterpolationError extends ConfigError {
  override name = "ConfigInterpolationError";
}

const defaultFrameworkConfig: FrameworkConfig = {
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

const defaultRuntimeConfig: RuntimeConfig = {
  app: {
    port: 3000,
    prefix: ""
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJsonFile = <T extends object>(filePath: string): Partial<T> => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");

  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw) as Partial<T>;
};

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

const parseDotEnvValue = (value: string): string => {
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

const parseDotEnvFile = (
  filePath: string,
  existing: Record<string, string>
): Record<string, string> => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const result: Record<string, string> = {};
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

    const placeholderResolver = (token: string): string | undefined => {
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

const buildEnvMap = (dotenvValues: Record<string, string>): Record<string, string> => ({
  ...dotenvValues,
  ...Object.fromEntries(
    Object.entries(process.env).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, String(value)]]
    )
  )
});

const resolveConfigPath = (
  root: Record<string, unknown>,
  envMap: Record<string, string>,
  pathExpression: string,
  trail: string[] = []
): unknown => {
  if (trail.includes(pathExpression)) {
    throw new ConfigInterpolationError(
      `Circular interpolation detected for "${pathExpression}".`
    );
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

  const resolved: Record<string, unknown> = {};

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
      const nestedResolved: Record<string, unknown> = {};
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

const resolveConfigObject = <T extends Record<string, unknown>>(
  input: T,
  envMap: Record<string, string>
): T => {
  const root = input as Record<string, unknown>;
  const resolved: Record<string, unknown> = {};

  for (const key of Object.keys(root)) {
    resolved[key] = resolveConfigPath(root, envMap, key, []);
  }

  return resolved as T;
};

export const loadConfig = (
  rootDir = process.cwd(),
  overrides: ConfigOverrides = {}
): LoadedConfig => {
  const frameworkPath = path.join(rootDir, "sculptor.json");
  const runtimePath = path.join(rootDir, "props.json");
  const envPath = path.join(rootDir, ".env");

  const frameworkFile = readJsonFile<FrameworkConfig>(frameworkPath);
  const runtimeFile = readJsonFile<RuntimeConfig>(runtimePath);

  const frameworkWithDefaults = deepMerge(
    defaultFrameworkConfig as Record<string, unknown>,
    frameworkFile as Record<string, unknown>
  ) as FrameworkConfig;
  const runtimeWithDefaults = deepMerge(
    defaultRuntimeConfig as Record<string, unknown>,
    runtimeFile as Record<string, unknown>
  ) as RuntimeConfig;

  const dotenvValues = parseDotEnvFile(envPath, { ...process.env } as Record<string, string>);
  const envMap = buildEnvMap(dotenvValues);
  const mergedBeforeInterpolation = deepMerge(
    deepMerge(
      frameworkWithDefaults as Record<string, unknown>,
      runtimeWithDefaults as Record<string, unknown>
    ),
    {}
  );

  const resolvedMerged = resolveConfigObject(mergedBeforeInterpolation, envMap);
  const mergedAfterOverrides = deepMerge(
    resolvedMerged,
    deepMerge(
      (overrides.framework ?? {}) as Record<string, unknown>,
      (overrides.runtime ?? {}) as Record<string, unknown>
    )
  );

  const loaded: LoadedConfig = {
    framework: resolveConfigObject(
      frameworkWithDefaults as Record<string, unknown>,
      envMap
    ) as FrameworkConfig,
    runtime: resolveConfigObject(
      runtimeWithDefaults as Record<string, unknown>,
      envMap
    ) as RuntimeConfig,
    merged: mergedAfterOverrides as FrameworkConfig & RuntimeConfig,
    rootDir
  };

  return loaded;
};

export const getConfig = (
  pathExpression: string,
  rootDir = process.cwd(),
  overrides: ConfigOverrides = {}
): unknown => {
  const config = loadConfig(rootDir, overrides).merged;
  return getValueAtPath(config, pathExpression);
};

export { redactConfig };
