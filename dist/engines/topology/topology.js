"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTopology = buildTopology;
// Topology engine: scan workspace, extract imports, build FileModule + DependencyEdge graph.
const fs_1 = require("fs");
const path_1 = require("path");
const enhanced_1 = require("../scanner/enhanced");
// Enhanced: reads files, extracts imports, uses real LOC/language data
function buildTopology(workspaceRoot, onProgress) {
    const modules = [];
    const edges = [];
    // Use enhanced scanner for accurate file info
    const fileInfos = (0, enhanced_1.scanDirectory)(workspaceRoot, ["node_modules", ".git", "dist", "build"], onProgress);
    // Filter to code files only
    const codeFiles = fileInfos.filter(f => f.language !== "Unknown" && f.language !== "JSON" && f.language !== "Markdown");
    for (const fileInfo of codeFiles) {
        const { path: relPath, language, loc } = fileInfo;
        const { name } = (0, path_1.parse)(relPath);
        const id = relPath;
        const layer = inferLayer(relPath);
        const mod = {
            id,
            path: relPath,
            name,
            package: inferPackage(relPath),
            version: "0.0.0",
            layer,
            // Store metadata for later use
            metadata: {
                language,
                loc,
                size: fileInfo.size,
            },
        };
        modules.push(mod);
        // Use imports from enhanced scanner
        for (const imp of fileInfo.imports) {
            if (imp.startsWith(".") || imp.startsWith("..")) {
                const absPath = (0, path_1.join)(workspaceRoot, (0, path_1.dirname)(relPath), imp);
                const resolved = resolveImportPath((0, path_1.dirname)((0, path_1.join)(workspaceRoot, relPath)), imp, workspaceRoot);
                if (resolved) {
                    edges.push({
                        id: `${id}->${resolved}`,
                        from: id,
                        to: resolved,
                        kind: "import",
                        required: true,
                        status: "ok",
                    });
                }
            }
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
    // Entry points: CLI, main files, gateways, servers
    if (lower.includes("cli/") ||
        lower.includes("gateway") ||
        lower.includes("entry") ||
        lower.includes("main") ||
        lower.endsWith("main.ts") ||
        lower.endsWith("index.ts") ||
        lower.endsWith("server.ts") ||
        lower.endsWith("app.ts")) {
        return "entry";
    }
    // Infrastructure layer
    if (lower.includes("infra") || lower.includes("db") || lower.includes("cache")) {
        return "infra";
    }
    // Business logic layer
    if (lower.includes("business") ||
        lower.includes("service") ||
        lower.includes("logic")) {
        return "business";
    }
    return "unknown";
}
function inferPackage(relPath) {
    // Extract package/module name from path
    const parts = relPath.split("/");
    if (parts.length > 1) {
        return parts[0]; // Top-level directory
    }
    return "root";
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