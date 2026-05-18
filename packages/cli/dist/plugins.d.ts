export interface PluginManifest {
    name: string;
    version?: string;
    templates?: string[];
    generators?: string[];
    dependencies?: Record<string, string>;
    configPatch?: Record<string, unknown>;
    middleware?: string[];
    runtimeHooks?: string[];
}
export interface PluginModule {
    manifest?: PluginManifest;
    default?: PluginManifest | PluginModule;
    templates?: string[];
    generators?: string[];
}
export declare class PluginLoadError extends Error {
    name: string;
}
export declare class PluginRegistry {
    private readonly plugins;
    register(manifest: PluginManifest): void;
    get(name: string): PluginManifest | undefined;
    list(): PluginManifest[];
}
export declare const loadPluginModule: (pluginName: string) => Promise<PluginModule>;
export declare const resolvePluginManifest: (module: PluginModule, fallbackName: string) => PluginManifest;
