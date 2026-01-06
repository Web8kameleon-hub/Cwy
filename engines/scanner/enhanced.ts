import fs from "fs";
import path from "path";

export interface FileInfo {
  path: string;
  language: string;
  loc: number;
  size: number;
  imports: string[];
}

const LANGUAGE_MAP: Record<string, string> = {
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

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || "Unknown";
}

export function countLOC(content: string, language: string): number {
  const lines = content.split("\n");
  let loc = 0;

  for (let line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (trimmed.length === 0) continue;
    
    // Skip common comment patterns
    if (language === "TypeScript" || language === "JavaScript") {
      if (trimmed.startsWith("//")) continue;
      if (trimmed.startsWith("/*")) continue;
      if (trimmed.startsWith("*")) continue;
      if (trimmed === "*/") continue;
    } else if (language === "Python") {
      if (trimmed.startsWith("#")) continue;
      if (trimmed.startsWith('"""')) continue;
      if (trimmed.startsWith("'''")) continue;
    } else if (language === "Go") {
      if (trimmed.startsWith("//")) continue;
      if (trimmed.startsWith("/*")) continue;
    }
    
    loc++;
  }

  return loc;
}

export function analyzeFile(filePath: string, content: string): FileInfo {
  const language = detectLanguage(filePath);
  const loc = countLOC(content, language);
  const size = Buffer.byteLength(content, "utf-8");
  
  // Extract imports (basic pattern matching)
  const imports: string[] = [];
  
  if (language === "TypeScript" || language === "JavaScript") {
    const importRegex = /(?:import|require)\s*\(?["']([^"']+)["']\)?/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
  } else if (language === "Python") {
    const importRegex = /(?:from\s+(\S+)\s+)?import\s+([^\n;]+)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const module = match[1] || match[2].split(",")[0].trim();
      imports.push(module);
    }
  } else if (language === "Go") {
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

export function scanDirectory(rootPath: string, ignorePatterns: string[] = ["node_modules", ".git", "dist", "build"], onProgress?: (current: number, total: number, file: string) => void): FileInfo[] {
  const results: FileInfo[] = [];
  
  // First pass: count files
  let totalFiles = 0;
  function countFiles(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, "/");
        
        if (ignorePatterns.some((pattern) => relativePath.includes(pattern))) {
          continue;
        }
        
        if (entry.isDirectory()) {
          countFiles(fullPath);
        } else if (entry.isFile()) {
          totalFiles++;
        }
      }
    } catch {}
  }
  
  countFiles(rootPath);
  
  let processedFiles = 0;
  
  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, "/");
      
      // Skip ignored directories
      if (ignorePatterns.some((pattern) => relativePath.includes(pattern))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        processedFiles++;
        
        if (onProgress) {
          onProgress(processedFiles, totalFiles, relativePath);
        }
        
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const info = analyzeFile(relativePath, content);
          results.push(info);
        } catch (err) {
          // Skip files that can't be read
        }
      }
    }
  }
  
  walk(rootPath);
  return results;
}
