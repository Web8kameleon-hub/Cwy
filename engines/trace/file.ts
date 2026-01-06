import { GraphSnapshot, FileModule, DependencyEdge } from "../../schema/types";
import { findPathTo } from "../topology/pathfinder";
import path from "path";

export interface FileTrace {
  file: {
    path: string;
    node: string;
    language: string;
    loc: number;
  };
  routes: string[];
  usedBy: string[];
  imports: string[];
  impact: {
    connectivity: number;
    structure: number;
    cwy: number;
  };
}

export function traceFile(snapshot: GraphSnapshot, filePath: string): FileTrace | null {
  // Normalize path
  const normalizedPath = path.normalize(filePath).replace(/\\/g, "/");
  
  // Find module containing this file
  const module = snapshot.modules.find((m: FileModule) => 
    m.path === normalizedPath || m.path.endsWith(normalizedPath)
  );

  if (!module) {
    return null;
  }

  // Find routes to this module
  const pathResult = findPathTo(module.id, snapshot.modules, snapshot.edges);
  
  if (!pathResult) {
    return null;
  }
  
  const routes = pathResult.nodes.length > 0 
    ? [pathResult.nodes.join(" → ")]
    : [];

  // Find what uses this module (reverse edges)
  const usedBy = snapshot.edges
    .filter((e: DependencyEdge) => e.to === module.id)
    .map((e: DependencyEdge) => {
      const fromModule = snapshot.modules.find((m: FileModule) => m.id === e.from);
      return fromModule ? fromModule.name : e.from;
    });

  // Get imports
  const imports = snapshot.edges
    .filter((e: DependencyEdge) => e.from === module.id)
    .map((e: DependencyEdge) => {
      const toModule = snapshot.modules.find((m: FileModule) => m.id === e.to);
      return toModule ? toModule.name : e.to;
    });

  // Calculate impact (estimate)
  const connectivityImpact = usedBy.length * 0.8 - routes.length * 0.2;
  const structureImpact = imports.length * 0.3 - (usedBy.length === 0 ? 2 : 0);
  const cwyImpact = connectivityImpact * 0.6 + structureImpact * 0.4;

  return {
    file: {
      path: module.path,
      node: module.name,
      language: module.metadata?.language || "Unknown",
      loc: module.metadata?.loc || 0,
    },
    routes,
    usedBy,
    imports,
    impact: {
      connectivity: Math.max(-5, Math.min(5, connectivityImpact)),
      structure: Math.max(-5, Math.min(5, structureImpact)),
      cwy: Math.max(-5, Math.min(5, cwyImpact)),
    },
  };
}

export function formatFileTrace(trace: FileTrace): string {
  const lines = [
    "FILE TRACE\n",
    `File: ${trace.file.path}`,
    `Node: ${trace.file.node}`,
    `Language: ${trace.file.language}`,
    `LOC: ${trace.file.loc}\n`,
    "Routes (entry → ... → this file):",
  ];

  if (trace.routes.length === 0) {
    lines.push("  (none - orphan file)");
  } else {
    trace.routes.forEach((r, i) => {
      lines.push(`  ${i + 1}) ${r}`);
    });
  }

  lines.push("\nUsed by:");
  if (trace.usedBy.length === 0) {
    lines.push("  (none)");
  } else {
    trace.usedBy.slice(0, 5).forEach((u) => {
      lines.push(`  - ${u}`);
    });
    if (trace.usedBy.length > 5) {
      lines.push(`  ... and ${trace.usedBy.length - 5} more`);
    }
  }

  lines.push("\nImports:");
  if (trace.imports.length === 0) {
    lines.push("  (none)");
  } else {
    trace.imports.slice(0, 5).forEach((imp) => {
      lines.push(`  - ${imp}`);
    });
    if (trace.imports.length > 5) {
      lines.push(`  ... and ${trace.imports.length - 5} more`);
    }
  }

  lines.push("\nValue impact (estimate):");
  lines.push(`  Connectivity: ${trace.impact.connectivity.toFixed(1)}`);
  lines.push(`  Structure: ${trace.impact.structure.toFixed(1)}`);
  lines.push(`  → cwy impact: ${trace.impact.cwy.toFixed(1)}`);

  return lines.join("\n");
}
