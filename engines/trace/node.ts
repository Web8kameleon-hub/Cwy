import type { GraphSnapshot, FileModule, DependencyEdge } from "../../schema/types";
import { findPathTo } from "../topology/pathfinder";

export interface NodeTrace {
  packageName: string;
  totalModules: number;
  modules: Array<{
    id: string;
    path: string;
    layer: string;
  }>;
  usedByPackages: string[];
  dependsOnPackages: string[];
  entryRoutes: string[];
  impact: {
    incomingEdges: number;
    outgoingEdges: number;
    packageReach: number;
  };
}

export function traceNode(snapshot: GraphSnapshot, query: string): NodeTrace | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const targetModules = snapshot.modules.filter((m) => {
    const pkg = (m.package || "").toLowerCase();
    const name = (m.name || "").toLowerCase();
    const p = (m.path || "").toLowerCase();
    return pkg === q || pkg.includes(q) || name.includes(q) || p.includes(q);
  });

  if (targetModules.length === 0) {
    return null;
  }

  const targetIds = new Set(targetModules.map((m) => m.id));
  const incoming = snapshot.edges.filter((e) => targetIds.has(e.to));
  const outgoing = snapshot.edges.filter((e) => targetIds.has(e.from));

  const moduleById = new Map(snapshot.modules.map((m) => [m.id, m] as const));

  const usedByPackages = uniquePackages(
    incoming
      .map((e) => moduleById.get(e.from))
      .filter((m): m is FileModule => Boolean(m))
      .map((m) => m.package)
  );

  const dependsOnPackages = uniquePackages(
    outgoing
      .map((e) => moduleById.get(e.to))
      .filter((m): m is FileModule => Boolean(m))
      .map((m) => m.package)
  );

  const entryRoutes: string[] = [];
  for (const m of targetModules.slice(0, 10)) {
    const path = findPathTo(m.id, snapshot.modules, snapshot.edges);
    if (path && path.nodes.length > 0) {
      entryRoutes.push(path.nodes.join(" -> "));
    }
  }

  const packageName = targetModules[0].package || query;

  return {
    packageName,
    totalModules: targetModules.length,
    modules: targetModules.slice(0, 30).map((m) => ({
      id: m.id,
      path: m.path,
      layer: m.layer,
    })),
    usedByPackages,
    dependsOnPackages,
    entryRoutes: Array.from(new Set(entryRoutes)).slice(0, 10),
    impact: {
      incomingEdges: incoming.length,
      outgoingEdges: outgoing.length,
      packageReach: usedByPackages.length + dependsOnPackages.length,
    },
  };
}

export function formatNodeTrace(trace: NodeTrace): string {
  const lines: string[] = [];
  lines.push("NODE TRACE\n");
  lines.push(`Package: ${trace.packageName}`);
  lines.push(`Modules: ${trace.totalModules}`);
  lines.push(`Incoming edges: ${trace.impact.incomingEdges}`);
  lines.push(`Outgoing edges: ${trace.impact.outgoingEdges}`);
  lines.push(`Package reach: ${trace.impact.packageReach}\n`);

  lines.push("Modules:");
  if (trace.modules.length === 0) {
    lines.push("  (none)");
  } else {
    for (const m of trace.modules.slice(0, 10)) {
      lines.push(`  - ${m.path} [${m.layer}]`);
    }
    if (trace.modules.length > 10) {
      lines.push(`  ... and ${trace.modules.length - 10} more`);
    }
  }

  lines.push("\nUsed by packages:");
  if (trace.usedByPackages.length === 0) {
    lines.push("  (none)");
  } else {
    for (const p of trace.usedByPackages.slice(0, 10)) {
      lines.push(`  - ${p}`);
    }
    if (trace.usedByPackages.length > 10) {
      lines.push(`  ... and ${trace.usedByPackages.length - 10} more`);
    }
  }

  lines.push("\nDepends on packages:");
  if (trace.dependsOnPackages.length === 0) {
    lines.push("  (none)");
  } else {
    for (const p of trace.dependsOnPackages.slice(0, 10)) {
      lines.push(`  - ${p}`);
    }
    if (trace.dependsOnPackages.length > 10) {
      lines.push(`  ... and ${trace.dependsOnPackages.length - 10} more`);
    }
  }

  lines.push("\nEntry routes:");
  if (trace.entryRoutes.length === 0) {
    lines.push("  (no entry route found)");
  } else {
    for (const r of trace.entryRoutes.slice(0, 5)) {
      lines.push(`  - ${r}`);
    }
    if (trace.entryRoutes.length > 5) {
      lines.push(`  ... and ${trace.entryRoutes.length - 5} more`);
    }
  }

  return lines.join("\n");
}

function uniquePackages(values: string[]): string[] {
  const filtered = values.filter((v) => Boolean(v));
  return Array.from(new Set(filtered));
}
