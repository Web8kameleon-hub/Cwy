"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTopology = buildTopology;
// Topology engine: scan workspace, extract imports, build FileModule + DependencyEdge graph.
const fs_1 = require("fs");
const path_1 = require("path");
// Minimal stub: reads .ts/.js files, extracts import statements, builds graph.
function buildTopology(workspaceRoot) {
    const modules = [];
    const edges = [];
    const files = walkFiles(workspaceRoot, [".ts", ".js", ".tsx", ".jsx"]);
    for (const absPath of files) {
        const relPath = (0, path_1.relative)(workspaceRoot, absPath).split(path_1.sep).join("/");
        const { name } = (0, path_1.parse)(absPath);
        const id = relPath;
        const layer = inferLayer(relPath);
        const mod = {
            id,
            path: relPath,
            name,
            package: "unknown", // could parse package.json context
            version: "0.0.0",
            layer,
        };
        modules.push(mod);
        // Extract imports
        const content = (0, fs_1.readFileSync)(absPath, "utf8");
        const imports = extractImports(content, absPath, workspaceRoot);
        for (const imp of imports) {
            edges.push({
                id: `${id}->${imp}`,
                from: id,
                to: imp,
                kind: "import",
                required: true,
                status: "ok", // will be validated by integrity engine
            });
        }
    }
    return { modules, edges };
}
function walkFiles(dir, exts) {
    let results = [];
    try {
        const entries = (0, fs_1.readdirSync)(dir);
        for (const entry of entries) {
            const abs = (0, path_1.join)(dir, entry);
            const stat = (0, fs_1.statSync)(abs);
            if (stat.isDirectory()) {
                if (entry === "node_modules" || entry === ".git" || entry === "dist")
                    continue;
                results = results.concat(walkFiles(abs, exts));
            }
            else if (stat.isFile()) {
                if (exts.some((ext) => entry.endsWith(ext))) {
                    results.push(abs);
                }
            }
        }
    }
    catch { }
    return results;
}
function inferLayer(relPath) {
    const lower = relPath.toLowerCase();
    if (lower.includes("gateway") || lower.includes("entry") || lower.includes("main")) {
        return "entry";
    }
    if (lower.includes("infra") || lower.includes("db") || lower.includes("cache")) {
        return "infra";
    }
    if (lower.includes("business") ||
        lower.includes("service") ||
        lower.includes("logic")) {
        return "business";
    }
    return "unknown";
}
function extractImports(source, fromFilePath, workspaceRoot) {
    const imports = [];
    const fromDir = (0, path_1.dirname)(fromFilePath);
    // Match ES6 imports: import ... from "path"
    const es6ImportRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/g;
    let match;
    while ((match = es6ImportRegex.exec(source)) !== null) {
        const spec = match[1];
        if (spec.startsWith(".") || spec.startsWith("..")) {
            const resolved = resolveImportPath(fromDir, spec, workspaceRoot);
            if (resolved)
                imports.push(resolved);
        }
    }
    // Match CommonJS require: require("path")
    const cjsRequireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((match = cjsRequireRegex.exec(source)) !== null) {
        const spec = match[1];
        if (spec.startsWith(".") || spec.startsWith("..")) {
            const resolved = resolveImportPath(fromDir, spec, workspaceRoot);
            if (resolved)
                imports.push(resolved);
        }
    }
    return imports;
}
function resolveImportPath(fromDir, importSpec, workspaceRoot) {
    // Try to resolve import path with/without extensions
    const candidates = [
        (0, path_1.join)(fromDir, importSpec),
        (0, path_1.join)(fromDir, `${importSpec}.ts`),
        (0, path_1.join)(fromDir, `${importSpec}.js`),
        (0, path_1.join)(fromDir, `${importSpec}.tsx`),
        (0, path_1.join)(fromDir, `${importSpec}.jsx`),
        (0, path_1.join)(fromDir, importSpec, "index.ts"),
        (0, path_1.join)(fromDir, importSpec, "index.js"),
    ];
    for (const candidate of candidates) {
        if ((0, fs_1.existsSync)(candidate) && (0, fs_1.statSync)(candidate).isFile()) {
            return (0, path_1.relative)(workspaceRoot, candidate).split(path_1.sep).join("/");
        }
    }
    // If can't resolve, return as-is (will be caught by integrity engine)
    return (0, path_1.relative)(workspaceRoot, (0, path_1.join)(fromDir, importSpec)).split(path_1.sep).join("/");
}
//# sourceMappingURL=topology.js.map