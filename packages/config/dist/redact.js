const sensitivePattern = /(password|token|secret|apiKey|auth)/i;
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export const redactConfig = (config) => {
    if (Array.isArray(config)) {
        return config.map((entry) => redactConfig(entry));
    }
    if (!isPlainObject(config)) {
        return config;
    }
    const redacted = {};
    for (const [key, value] of Object.entries(config)) {
        if (sensitivePattern.test(key)) {
            redacted[key] = "***REDACTED***";
            continue;
        }
        redacted[key] = redactConfig(value);
    }
    return redacted;
};
//# sourceMappingURL=redact.js.map