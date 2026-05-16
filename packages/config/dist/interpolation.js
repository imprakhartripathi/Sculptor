const tokenPattern = /\$\{([^}]+)\}/g;
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export const getValueAtPath = (input, pathExpression) => {
    if (!isPlainObject(input)) {
        return undefined;
    }
    const segments = pathExpression.split(".").filter(Boolean);
    let cursor = input;
    for (const segment of segments) {
        if (!isPlainObject(cursor) || !(segment in cursor)) {
            return undefined;
        }
        cursor = cursor[segment];
    }
    return cursor;
};
export const resolveInterpolations = (input, resolver) => {
    const resolveString = (value, stack) => {
        let didReplace = false;
        const replaced = value.replace(tokenPattern, (_match, rawToken) => {
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
    const resolveValue = (value, stack) => {
        if (typeof value === "string") {
            return resolveString(value, stack);
        }
        if (Array.isArray(value)) {
            return value.map((entry, index) => resolveValue(entry, [...stack, String(index)]));
        }
        if (!isPlainObject(value)) {
            return value;
        }
        const resolved = {};
        for (const [key, entry] of Object.entries(value)) {
            resolved[key] = resolveValue(entry, [...stack, key]);
        }
        return resolved;
    };
    return resolveValue(input, []);
};
//# sourceMappingURL=interpolation.js.map