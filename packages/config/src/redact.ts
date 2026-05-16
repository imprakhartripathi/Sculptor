const sensitivePattern = /(password|token|secret|apiKey|auth)/i;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const redactConfig = <T>(config: T): T => {
  if (Array.isArray(config)) {
    return config.map((entry) => redactConfig(entry)) as T;
  }

  if (!isPlainObject(config)) {
    return config;
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (sensitivePattern.test(key)) {
      redacted[key] = "***REDACTED***";
      continue;
    }

    redacted[key] = redactConfig(value);
  }

  return redacted as T;
};

