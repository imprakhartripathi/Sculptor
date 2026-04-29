import { inspect } from "node:util";

export type LogLevel = "log" | "system" | "warn" | "error";
export type LoggerMode = "dog" | "standard";

const inspectOptions = {
  depth: null,
  colors: false,
  breakLength: Infinity,
  compact: true,
  sorted: false
} satisfies Parameters<typeof inspect>[1];

export const formatValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.stack ?? value.message;
  }

  return inspect(value, inspectOptions);
};

export const formatMessage = (values: readonly unknown[]): string =>
  values.length === 0 ? "" : values.map(formatValue).join(" ");
