// Cycle detector: Tarjan's SCC algorithm to find strongly connected components.
import type { DependencyEdge, Cycle } from "../../schema/types";

export function detectCycles(
  moduleIds: string[],
  edges: DependencyEdge[]
): Cycle[] {
  const graph = buildAdjacencyList(moduleIds, edges);
  const sccs = tarjanSCC(graph);

  // SCC with size > 1 = cycle; also check for self-loops
  const cycles: Cycle[] = [];
  for (const scc of sccs) {
    if (scc.length > 1) {
      const cycleEdges = edges
        .filter((e) => scc.includes(e.from) && scc.includes(e.to))
        .map((e) => e.id);
      cycles.push({ nodes: scc, edges: cycleEdges });
    } else if (scc.length === 1) {
      const self = edges.find((e) => e.from === scc[0] && e.to === scc[0]);
      if (self) {
        cycles.push({ nodes: scc, edges: [self.id] });
      }
    }
  }
  return cycles;
}

function buildAdjacencyList(
  nodes: string[],
  edges: DependencyEdge[]
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n, []);
  for (const e of edges) {
    if (adj.has(e.from)) {
      adj.get(e.from)!.push(e.to);
    }
  }
  return adj;
}

function tarjanSCC(graph: Map<string, string[]>): string[][] {
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let indexCounter = 0;
  const sccs: string[][] = [];

  function strongConnect(v: string) {
    index.set(v, indexCounter);
    lowlink.set(v, indexCounter);
    indexCounter++;
    stack.push(v);
    onStack.add(v);

    for (const w of graph.get(v) || []) {
      if (!index.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
      }
    }

    if (lowlink.get(v) === index.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const v of graph.keys()) {
    if (!index.has(v)) {
      strongConnect(v);
    }
  }

  return sccs;
}
