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

export class PluginLoadError extends Error {
  override name = "PluginLoadError";
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

const isMissingModuleError = (error: unknown, pluginName: string): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";

  return (
    code === "ERR_MODULE_NOT_FOUND" ||
    code === "MODULE_NOT_FOUND" ||
    message.includes(pluginName) ||
    message.includes("Cannot find module") ||
    message.includes("Cannot find package")
  );
};

export const loadPluginModule = async (pluginName: string): Promise<PluginModule> => {
  try {
    return (await import(pluginName)) as PluginModule;
  } catch (error) {
    if (isMissingModuleError(error, pluginName)) {
      throw new PluginLoadError(`Unable to load plugin "${pluginName}". Is it installed?`);
    }

    throw error;
  }
};

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
