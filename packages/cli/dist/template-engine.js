export class TemplateRegistry {
    constructor() {
        this.templates = new Map();
    }
    register(template) {
        this.templates.set(template.id, template);
    }
    registerPackage(templatePackage) {
        for (const template of templatePackage.templates) {
            this.register(template);
        }
    }
    get(id) {
        return this.templates.get(id);
    }
    list() {
        return [...this.templates.values()];
    }
}
const toPascalCase = (value) => value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
const toCamelCase = (value) => {
    const pascal = toPascalCase(value);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};
const toKebabCase = (value) => value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
const transformValue = (transform, value) => {
    const raw = String(value ?? "");
    switch (transform) {
        case "camel":
            return toCamelCase(raw);
        case "pascal":
            return toPascalCase(raw);
        case "kebab":
            return toKebabCase(raw);
        default:
            return raw;
    }
};
const resolveToken = (token, context) => {
    const ifMatch = token.match(/^if\s+(.+)$/);
    if (ifMatch) {
        const key = ifMatch[1]?.trim();
        return context[key] ? "true" : "";
    }
    if (["camel", "pascal", "kebab"].includes(token) && context.name !== undefined) {
        return transformValue(token, context.name);
    }
    const [name, transform] = token.split(".");
    const value = context[name];
    if (transform) {
        return transformValue(transform, value);
    }
    if (["camel", "pascal", "kebab"].includes(name) && context.name !== undefined) {
        return transformValue(name, context.name);
    }
    if (value === undefined || value === null) {
        return "";
    }
    return String(value);
};
export const renderTemplate = (template, context) => {
    const conditionalPattern = /\{\{if\s+([a-zA-Z0-9_.-]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    const interpolationPattern = /\{\{([a-zA-Z0-9_.\s-]+)\}\}/g;
    const withConditionals = template.replace(conditionalPattern, (_match, key, block) => (context[key] ? block : ""));
    return withConditionals.replace(interpolationPattern, (_match, token) => resolveToken(token.trim(), context));
};
export const createTemplateRegistry = (...packages) => {
    const registry = new TemplateRegistry();
    for (const templatePackage of packages) {
        registry.registerPackage(templatePackage);
    }
    return registry;
};
//# sourceMappingURL=template-engine.js.map