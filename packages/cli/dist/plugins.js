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
export const loadPluginModule = async (pluginName) => (await import(pluginName));
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