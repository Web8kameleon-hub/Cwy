"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = detectLanguage;
exports.countLOC = countLOC;
exports.analyzeFile = analyzeFile;
exports.scanDirectory = scanDirectory;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LANGUAGE_MAP = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".py": "Python",
    ".go": "Go",
    ".java": "Java",
    ".rs": "Rust",
    ".c": "C",
    ".cpp": "C++",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".sql": "SQL",
    ".md": "Markdown",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
};
function detectLanguage(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    return LANGUAGE_MAP[ext] || "Unknown";
}
function countLOC(content, language) {
    const lines = content.split("\n");
    let loc = 0;
    for (let line of lines) {
        const trimmed = line.trim();
        // Skip empty lines
        if (trimmed.length === 0)
            continue;
        // Skip common comment patterns
        if (language === "TypeScript" || language === "JavaScript") {
            if (trimmed.startsWith("//"))
                continue;
            if (trimmed.startsWith("/*"))
                continue;
            if (trimmed.startsWith("*"))
                continue;
            if (trimmed === "*/")
                continue;
        }
        else if (language === "Python") {
            if (trimmed.startsWith("#"))
                continue;
            if (trimmed.startsWith('"""'))
                continue;
            if (trimmed.startsWith("'''"))
                continue;
        }
        else if (language === "Go") {
            if (trimmed.startsWith("//"))
                continue;
            if (trimmed.startsWith("/*"))
                continue;
        }
        loc++;
    }
    return loc;
}
function analyzeFile(filePath, content) {
    const language = detectLanguage(filePath);
    const loc = countLOC(content, language);
    const size = Buffer.byteLength(content, "utf-8");
    // Extract imports (basic pattern matching)
    const imports = [];
    if (language === "TypeScript" || language === "JavaScript") {
        const importRegex = /(?:import|require)\s*\(?["']([^"']+)["']\)?/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
    }
    else if (language === "Python") {
        const importRegex = /(?:from\s+(\S+)\s+)?import\s+([^\n;]+)/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const module = match[1] || match[2].split(",")[0].trim();
            imports.push(module);
        }
    }
    else if (language === "Go") {
        const importRegex = /import\s+(?:"([^"]+)"|`([^`]+)`)/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1] || match[2]);
        }
    }
    return {
        path: filePath,
        language,
        loc,
        size,
        imports,
    };
}
function scanDirectory(rootPath, ignorePatterns = ["node_modules", ".git", "dist", "build"], onProgress) {
    const results = [];
    // First pass: count files
    let totalFiles = 0;
    function countFiles(dir) {
        try {
            const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(dir, entry.name);
                const relativePath = path_1.default.relative(rootPath, fullPath).replace(/\\/g, "/");
                if (ignorePatterns.some((pattern) => relativePath.includes(pattern))) {
                    continue;
                }
                if (entry.isDirectory()) {
                    countFiles(fullPath);
                }
                else if (entry.isFile()) {
                    totalFiles++;
                }
            }
        }
        catch { }
    }
    countFiles(rootPath);
    let processedFiles = 0;
    function walk(dir) {
        const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dir, entry.name);
            const relativePath = path_1.default.relative(rootPath, fullPath).replace(/\\/g, "/");
            // Skip ignored directories
            if (ignorePatterns.some((pattern) => relativePath.includes(pattern))) {
                continue;
            }
            if (entry.isDirectory()) {
                walk(fullPath);
            }
            else if (entry.isFile()) {
                processedFiles++;
                if (onProgress) {
                    onProgress(processedFiles, totalFiles, relativePath);
                }
                try {
                    const content = fs_1.default.readFileSync(fullPath, "utf-8");
                    const info = analyzeFile(relativePath, content);
                    results.push(info);
                }
                catch (err) {
                    // Skip files that can't be read
                }
            }
        }
    }
    walk(rootPath);
    return results;
}
//# sourceMappingURL=enhanced.js.map