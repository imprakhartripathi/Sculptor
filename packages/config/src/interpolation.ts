const tokenPattern = /\$\{([^}]+)\}/g;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const getValueAtPath = (input: unknown, pathExpression: string): unknown => {
  if (!isPlainObject(input)) {
    return undefined;
  }

  const segments = pathExpression.split(".").filter(Boolean);
  let cursor: unknown = input;

  for (const segment of segments) {
    if (!isPlainObject(cursor) || !(segment in cursor)) {
      return undefined;
    }

    cursor = cursor[segment];
  }

  return cursor;
};

export const resolveInterpolations = <T>(
  input: T,
  resolver: (token: string, stack: string[]) => string | undefined
): T => {
  const resolveString = (value: string, stack: string[]): string => {
    let didReplace = false;

    const replaced = value.replace(tokenPattern, (_match, rawToken: string) => {
      const token = String(rawToken).trim();
      if (!token) {
        return "";
      }

      const resolved = resolver(token, stack);

      if (resolved === undefined) {
        return `\${${token}}`;
      }

      didReplace = true;
      return resolved;
    });

    tokenPattern.lastIndex = 0;

    if (!didReplace || !tokenPattern.test(replaced)) {
      tokenPattern.lastIndex = 0;
      return replaced;
    }

    tokenPattern.lastIndex = 0;
    return resolveString(replaced, stack);
  };

  const resolveValue = (value: unknown, stack: string[]): unknown => {
    if (typeof value === "string") {
      return resolveString(value, stack);
    }

    if (Array.isArray(value)) {
      return value.map((entry, index) => resolveValue(entry, [...stack, String(index)]));
    }

    if (!isPlainObject(value)) {
      return value;
    }

    const resolved: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      resolved[key] = resolveValue(entry, [...stack, key]);
    }

    return resolved;
  };

  return resolveValue(input, []) as T;
};

