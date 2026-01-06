// Way-to-X: find path(s) from entry nodes to a target module.
import type { DependencyEdge, FileModule, PathView } from "../../schema/types";

export function findPathTo(
  targetId: string,
  modules: FileModule[],
  edges: DependencyEdge[],
  mode: "shortest" | "highest_load" = "shortest"
): PathView | null {
  let entryNodes = modules.filter((m) => m.layer === "entry").map((m) => m.id);
  
  // Fallback: if no entry nodes, use CLI or orphans as starting points
  if (entryNodes.length === 0) {
    const cliModule = modules.find((m) => m.name === "cwy" || m.path.includes("cli"));
    if (cliModule) {
      entryNodes = [cliModule.id];
    } else {
      // Use modules with no incoming edges as pseudo-entries
      const inDegree = new Map<string, number>();
      modules.forEach((m) => inDegree.set(m.id, 0));
      edges.forEach((e) => inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1));
      entryNodes = modules.filter((m) => inDegree.get(m.id) === 0).map((m) => m.id);
    }
  }
  
  const adj = buildForwardAdjacency(modules, edges);

  if (!adj.has(targetId)) {
    return { targetId, nodes: [], edges: [], notes: ["Target not found in graph"] };
  }

  // BFS from all entry nodes
  let bestPath: string[] | null = null;

  for (const entry of entryNodes) {
    // If target is itself an entry, return immediately
    if (entry === targetId) {
      return { targetId, nodes: [targetId], edges: [], notes: ["Target is an entry point"] };
    }
    
    const path = bfs(entry, targetId, adj);
    if (path) {
      if (!bestPath || path.length < bestPath.length) {
        bestPath = path;
      }
    }
  }

  if (!bestPath) {
    return { targetId, nodes: [], edges: [], notes: ["No path found from entry"] };
  }

  const pathEdges: string[] = [];
  for (let i = 0; i < bestPath.length - 1; i++) {
    const from = bestPath[i];
    const to = bestPath[i + 1];
    const edge = edges.find((e) => e.from === from && e.to === to);
    if (edge) pathEdges.push(edge.id);
  }

  return { targetId, nodes: bestPath, edges: pathEdges };
}

function buildForwardAdjacency(
  modules: FileModule[],
  edges: DependencyEdge[]
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const m of modules) adj.set(m.id, []);
  for (const e of edges) {
    if (adj.has(e.from)) {
      adj.get(e.from)!.push(e.to);
    }
  }
  return adj;
}

function bfs(start: string, target: string, adj: Map<string, string[]>): string[] | null {
  const queue: string[] = [start];
  const visited = new Set<string>([start]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === target) {
      // reconstruct path
      const path: string[] = [];
      let cur: string | undefined = target;
      while (cur) {
        path.unshift(cur);
        cur = parent.get(cur);
      }
      return path;
    }
    for (const neighbor of adj.get(node) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, node);
        queue.push(neighbor);
      }
    }
  }
  return null;
}
