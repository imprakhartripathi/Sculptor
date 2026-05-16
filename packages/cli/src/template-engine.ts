export interface TemplateMetadata {
  name: string;
  description?: string;
  package?: string;
}

export interface TemplateDefinition {
  id: string;
  metadata: TemplateMetadata;
  template: string;
}

export interface TemplatePackage {
  name: string;
  templates: TemplateDefinition[];
}

export interface TemplateRenderContext {
  [key: string]: unknown;
}

export class TemplateRegistry {
  private readonly templates = new Map<string, TemplateDefinition>();

  register(template: TemplateDefinition): void {
    this.templates.set(template.id, template);
  }

  registerPackage(templatePackage: TemplatePackage): void {
    for (const template of templatePackage.templates) {
      this.register(template);
    }
  }

  get(id: string): TemplateDefinition | undefined {
    return this.templates.get(id);
  }

  list(): TemplateDefinition[] {
    return [...this.templates.values()];
  }
}

const toPascalCase = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const toCamelCase = (value: string): string => {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const transformValue = (transform: string, value: unknown): string => {
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

const resolveToken = (token: string, context: TemplateRenderContext): string => {
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

export const renderTemplate = (
  template: string,
  context: TemplateRenderContext
): string => {
  const conditionalPattern = /\{\{if\s+([a-zA-Z0-9_.-]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  const interpolationPattern = /\{\{([a-zA-Z0-9_.\s-]+)\}\}/g;

  const withConditionals = template.replace(
    conditionalPattern,
    (_match, key: string, block: string) => (context[key] ? block : "")
  );

  return withConditionals.replace(interpolationPattern, (_match, token: string) =>
    resolveToken(token.trim(), context)
  );
};

export const createTemplateRegistry = (...packages: TemplatePackage[]): TemplateRegistry => {
  const registry = new TemplateRegistry();
  for (const templatePackage of packages) {
    registry.registerPackage(templatePackage);
  }
  return registry;
};
