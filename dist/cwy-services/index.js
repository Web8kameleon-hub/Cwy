"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerServices = registerServices;
const extension_1 = require("./extension");
const memory_1 = require("./memory");
const overview_1 = require("./overview");
const search_1 = require("./search");
const linewave_1 = require("./linewave");
const types_1 = require("./types");
function registerServices(workspaceRoot = process.cwd()) {
    const services = {
        extension: (0, extension_1.registerExtension)(workspaceRoot),
        memory: (0, memory_1.registerMemory)(),
        overview: (0, overview_1.registerOverview)(),
        search: (0, search_1.registerSearch)(),
        linewave: (0, linewave_1.registerLinewave)(),
        types: (0, types_1.registerTypes)(),
    };
    return {
        healthy: Object.values(services).every((s) => s.healthy),
        services,
    };
}
//# sourceMappingURL=index.js.map