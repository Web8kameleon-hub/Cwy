// Topology engine: scan workspace, extract imports, build FileModule + DependencyEdge graph.
import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, relative, sep, parse, dirname } from "path";
import type { FileModule, DependencyEdge, Layer } from "../../schema/types";
import { scanDirectory, detectLanguage, countLOC } from "../scanner/enhanced";

export interface TopologyResult {
  modules: FileModule[];
  edges: DependencyEdge[];
}

// Enhanced: reads files, extracts imports, uses real LOC/language data
export function buildTopology(workspaceRoot: string, onProgress?: (current: number, total: number, file: string) => void): TopologyResult {
  const modules: FileModule[] = [];
  const edges: DependencyEdge[] = [];

  // Use enhanced scanner for accurate file info
  const fileInfos = scanDirectory(workspaceRoot, ["node_modules", ".git", "dist", "build"], onProgress);

  // Filter to code files only
  const codeFiles = fileInfos.filter(f => 
    f.language !== "Unknown" && f.language !== "JSON" && f.language !== "Markdown"
  );

  for (const fileInfo of codeFiles) {
    const { path: relPath, language, loc } = fileInfo;
    const { name } = parse(relPath);
    const id = relPath;

    const layer = inferLayer(relPath);
    const mod: FileModule = {
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
        const absPath = join(workspaceRoot, dirname(relPath), imp);
        const resolved = resolveImportPath(dirname(join(workspaceRoot, relPath)), imp, workspaceRoot);
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

function walkFiles(dir: string, exts: string[]): string[] {
  let results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const abs = join(dir, entry);
      const stat = statSync(abs);
      if (stat.isDirectory()) {
        if (entry === "node_modules" || entry === ".git" || entry === "dist") continue;
        results = results.concat(walkFiles(abs, exts));
      } else if (stat.isFile()) {
        if (exts.some((ext) => entry.endsWith(ext))) {
          results.push(abs);
        }
      }
    }
  } catch {}
  return results;
}

function inferLayer(relPath: string): Layer {
  const lower = relPath.toLowerCase();
  
  // Entry points: CLI, main files, gateways, servers
  if (
    lower.includes("cli/") || 
    lower.includes("gateway") || 
    lower.includes("entry") || 
    lower.includes("main") ||
    lower.endsWith("main.ts") ||
    lower.endsWith("index.ts") ||
    lower.endsWith("server.ts") ||
    lower.endsWith("app.ts")
  ) {
    return "entry";
  }
  
  // Infrastructure layer
  if (lower.includes("infra") || lower.includes("db") || lower.includes("cache")) {
    return "infra";
  }
  
  // Business logic layer
  if (
    lower.includes("business") ||
    lower.includes("service") ||
    lower.includes("logic")
  ) {
    return "business";
  }
  
  return "unknown";
}

function inferPackage(relPath: string): string {
  // Extract package/module name from path
  const parts = relPath.split("/");
  if (parts.length > 1) {
    return parts[0]; // Top-level directory
  }
  return "root";
}

function extractImports(source: string, fromFilePath: string, workspaceRoot: string): string[] {
  const imports: string[] = [];
  const fromDir = dirname(fromFilePath);
  
  // Match ES6 imports: import ... from "path"
  const es6ImportRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = es6ImportRegex.exec(source)) !== null) {
    const spec = match[1];
    if (spec.startsWith(".") || spec.startsWith("..")) {
      const resolved = resolveImportPath(fromDir, spec, workspaceRoot);
      if (resolved) imports.push(resolved);
    }
  }
  
  // Match CommonJS require: require("path")
  const cjsRequireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = cjsRequireRegex.exec(source)) !== null) {
    const spec = match[1];
    if (spec.startsWith(".") || spec.startsWith("..")) {
      const resolved = resolveImportPath(fromDir, spec, workspaceRoot);
      if (resolved) imports.push(resolved);
    }
  }
  
  return imports;
}

function resolveImportPath(fromDir: string, importSpec: string, workspaceRoot: string): string | null {
  // Try to resolve import path with/without extensions
  const candidates = [
    join(fromDir, importSpec),
    join(fromDir, `${importSpec}.ts`),
    join(fromDir, `${importSpec}.js`),
    join(fromDir, `${importSpec}.tsx`),
    join(fromDir, `${importSpec}.jsx`),
    join(fromDir, importSpec, "index.ts"),
    join(fromDir, importSpec, "index.js"),
  ];
  
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return relative(workspaceRoot, candidate).split(sep).join("/");
    }
  }
  
  // If can't resolve, return as-is (will be caught by integrity engine)
  return relative(workspaceRoot, join(fromDir, importSpec)).split(sep).join("/");
}
