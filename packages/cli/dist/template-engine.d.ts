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
export declare class TemplateRegistry {
    private readonly templates;
    register(template: TemplateDefinition): void;
    registerPackage(templatePackage: TemplatePackage): void;
    get(id: string): TemplateDefinition | undefined;
    list(): TemplateDefinition[];
}
export declare const renderTemplate: (template: string, context: TemplateRenderContext) => string;
export declare const createTemplateRegistry: (...packages: TemplatePackage[]) => TemplateRegistry;
