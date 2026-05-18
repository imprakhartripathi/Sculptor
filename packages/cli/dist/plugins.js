export class PluginLoadError extends Error {
    constructor() {
        super(...arguments);
        this.name = "PluginLoadError";
    }
}
export class PluginRegistry {
    constructor() {
        this.plugins = new Map();
    }
    register(manifest) {
        this.plugins.set(manifest.name, manifest);
    }
    get(name) {
        return this.plugins.get(name);
    }
    list() {
        return [...this.plugins.values()];
    }
}
const isMissingModuleError = (error, pluginName) => {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    const code = "code" in error ? String(error.code ?? "") : "";
    const message = "message" in error ? String(error.message ?? "") : "";
    return (code === "ERR_MODULE_NOT_FOUND" ||
        code === "MODULE_NOT_FOUND" ||
        message.includes(pluginName) ||
        message.includes("Cannot find module") ||
        message.includes("Cannot find package"));
};
export const loadPluginModule = async (pluginName) => {
    try {
        return (await import(pluginName));
    }
    catch (error) {
        if (isMissingModuleError(error, pluginName)) {
            throw new PluginLoadError(`Unable to load plugin "${pluginName}". Is it installed?`);
        }
        throw error;
    }
};
export const resolvePluginManifest = (module, fallbackName) => {
    const direct = module.manifest;
    if (direct) {
        return direct;
    }
    if (module.default && "name" in module.default) {
        return module.default;
    }
    return { name: fallbackName };
};
//# sourceMappingURL=plugins.js.map