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

export class PluginRegistry {
  private readonly plugins = new Map<string, PluginManifest>();

  register(manifest: PluginManifest): void {
    this.plugins.set(manifest.name, manifest);
  }

  get(name: string): PluginManifest | undefined {
    return this.plugins.get(name);
  }

  list(): PluginManifest[] {
    return [...this.plugins.values()];
  }
}

export const loadPluginModule = async (pluginName: string): Promise<PluginModule> =>
  (await import(pluginName)) as PluginModule;

export const resolvePluginManifest = (module: PluginModule, fallbackName: string): PluginManifest => {
  const direct = module.manifest;
  if (direct) {
    return direct;
  }

  if (module.default && "name" in module.default) {
    return module.default as PluginManifest;
  }

  return { name: fallbackName };
};

