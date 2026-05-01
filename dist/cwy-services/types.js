"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTypes = registerTypes;
function registerTypes() {
    const isObject = (v) => typeof v === "object" && v !== null;
    const isFileModule = (value) => {
        if (!isObject(value))
            return false;
        return (typeof value.id === "string" &&
            typeof value.path === "string" &&
            typeof value.name === "string" &&
            typeof value.package === "string" &&
            typeof value.version === "string" &&
            typeof value.layer === "string");
    };
    const isDependencyEdge = (value) => {
        if (!isObject(value))
            return false;
        return (typeof value.id === "string" &&
            typeof value.from === "string" &&
            typeof value.to === "string" &&
            typeof value.kind === "string" &&
            typeof value.required === "boolean" &&
            typeof value.status === "string");
    };
    const isGraphSnapshot = (value) => {
        if (!isObject(value))
            return false;
        const modules = value.modules;
        const edges = value.edges;
        const conflicts = value.conflicts;
        const cycles = value.cycles;
        return (typeof value.generatedAt === "string" &&
            Array.isArray(modules) &&
            modules.every(isFileModule) &&
            Array.isArray(edges) &&
            edges.every(isDependencyEdge) &&
            Array.isArray(conflicts) &&
            Array.isArray(cycles));
    };
    return {
        healthy: true,
        isFileModule,
        isDependencyEdge,
        isGraphSnapshot,
    };
}
//# sourceMappingURL=types.js.map