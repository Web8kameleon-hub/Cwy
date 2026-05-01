"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExtension = registerExtension;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function registerExtension(workspaceRoot = process.cwd()) {
    const extensionPkgPath = path_1.default.join(workspaceRoot, "vscode-extension", "package.json");
    if (!fs_1.default.existsSync(extensionPkgPath)) {
        throw new Error("VS Code extension package not found at vscode-extension/package.json");
    }
    const raw = fs_1.default.readFileSync(extensionPkgPath, "utf8");
    const pkg = JSON.parse(raw);
    const commands = (pkg.contributes?.commands || [])
        .map((c) => c.command)
        .filter((c) => Boolean(c));
    return {
        name: pkg.name || "cwy-extension",
        version: pkg.version || "0.0.0",
        commandCount: commands.length,
        commands,
        activationEvents: pkg.activationEvents || [],
        healthy: commands.length > 0,
    };
}
//# sourceMappingURL=extension.js.map