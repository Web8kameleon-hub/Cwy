"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMemory = registerMemory;
const memory_1 = require("../memory/memory");
function registerMemory() {
    const state = (0, memory_1.loadMemory)();
    const get = (key) => {
        const current = (0, memory_1.loadMemory)();
        return current[key];
    };
    const set = (key, value) => {
        const current = (0, memory_1.loadMemory)();
        current[key] = value;
        (0, memory_1.saveMemory)(current);
    };
    const remove = (key) => {
        const current = (0, memory_1.loadMemory)();
        if (key in current) {
            delete current[key];
            (0, memory_1.saveMemory)(current);
        }
    };
    return {
        healthy: true,
        keys: Object.keys(state),
        get,
        set,
        remove,
    };
}
//# sourceMappingURL=memory.js.map