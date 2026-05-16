import fs from "node:fs";
import path from "node:path";

import { getConfig, loadConfig } from "@sculptor/config";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseConfigPath = (expression: string): string[] =>
  expression.split(".").map((segment) => segment.trim()).filter(Boolean);

const parseValue = (raw: string): unknown => {
  const trimmed = raw.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (trimmed === "null") {
    return null;
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
};

const detectIndent = (raw: string): number | string => {
  const match = raw.match(/^\s+"[^"]+":/m);
  if (!match) {
    return 2;
  }

  const leading = match[0].match(/^\s+/)?.[0].length ?? 2;
  return leading || 2;
};

const readJson = (filePath: string): Record<string, unknown> => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw) as Record<string, unknown>;
};

const writeJson = (filePath: string, value: Record<string, unknown>): void => {
  const raw = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const indent = detectIndent(raw);
  const newline = raw.includes("\r\n") ? "\r\n" : "\n";
  const content = `${JSON.stringify(value, null, indent)}${newline}`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
};

const assignPath = (
  target: Record<string, unknown>,
  segments: string[],
  value: unknown
): Record<string, unknown> => {
  if (segments.length === 0) {
    return target;
  }

  const [head, ...tail] = segments;

  if (tail.length === 0) {
    target[head] = value;
    return target;
  }

  const next = isPlainObject(target[head]) ? (target[head] as Record<string, unknown>) : {};
  target[head] = assignPath(next, tail, value);
  return target;
};

const flattenConfig = (
  value: unknown,
  prefix = ""
): Array<{ path: string; value: unknown }> => {
  if (!isPlainObject(value) && !Array.isArray(value)) {
    return [{ path: prefix, value }];
  }

  const entries: Array<{ path: string; value: unknown }> = [];

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const nextPrefix = prefix ? `${prefix}.${index}` : String(index);
      entries.push(...flattenConfig(entry, nextPrefix));
    });
    return entries;
  }

  for (const [key, entry] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    entries.push(...flattenConfig(entry, nextPrefix));
  }

  return entries;
};

const resolveConfigFile = (rootDir: string, pathExpression: string): string => {
  return pathExpression.startsWith("app.") ? path.join(rootDir, "props.json") : path.join(rootDir, "sculptor.json");
};

export const getConfigValue = (rootDir: string, pathExpression: string): unknown =>
  getConfig(pathExpression, rootDir);

export const listConfigEntries = (rootDir: string): Array<{ path: string; value: unknown }> =>
  flattenConfig(loadConfig(rootDir).merged);

export const setConfigValue = (rootDir: string, expression: string): void => {
  const separatorIndex = expression.indexOf("=");

  if (separatorIndex < 0) {
    throw new Error(`Invalid config assignment "${expression}". Use path=value.`);
  }

  const pathExpression = expression.slice(0, separatorIndex).trim();
  const rawValue = expression.slice(separatorIndex + 1);

  const segments = parseConfigPath(pathExpression);
  const value = parseValue(rawValue);
  const filePath = resolveConfigFile(rootDir, pathExpression);
  const data = readJson(filePath);
  assignPath(data, segments, value);
  writeJson(filePath, data);
};
