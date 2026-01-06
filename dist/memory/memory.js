"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadMemory = loadMemory;
exports.saveMemory = saveMemory;
const fs_1 = require("fs");
const path_1 = require("path");
const DIR = ".cwy";
const FILE = "memory.json";
function ensureStore() {
    const dir = (0, path_1.join)(process.cwd(), DIR);
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir);
    }
    const file = (0, path_1.join)(dir, FILE);
    if (!(0, fs_1.existsSync)(file)) {
        (0, fs_1.writeFileSync)(file, "{}", "utf8");
    }
    return file;
}
function loadMemory() {
    const file = ensureStore();
    const raw = (0, fs_1.readFileSync)(file, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
}
function saveMemory(data) {
    const file = ensureStore();
    (0, fs_1.writeFileSync)(file, JSON.stringify(data, null, 2), "utf8");
}
//# sourceMappingURL=memory.js.map