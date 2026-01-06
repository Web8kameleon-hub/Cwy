"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectCycles = detectCycles;
function detectCycles(moduleIds, edges) {
    const graph = buildAdjacencyList(moduleIds, edges);
    const sccs = tarjanSCC(graph);
    // SCC with size > 1 = cycle; also check for self-loops
    const cycles = [];
    for (const scc of sccs) {
        if (scc.length > 1) {
            const cycleEdges = edges
                .filter((e) => scc.includes(e.from) && scc.includes(e.to))
                .map((e) => e.id);
            cycles.push({ nodes: scc, edges: cycleEdges });
        }
        else if (scc.length === 1) {
            const self = edges.find((e) => e.from === scc[0] && e.to === scc[0]);
            if (self) {
                cycles.push({ nodes: scc, edges: [self.id] });
            }
        }
    }
    return cycles;
}
function buildAdjacencyList(nodes, edges) {
    const adj = new Map();
    for (const n of nodes)
        adj.set(n, []);
    for (const e of edges) {
        if (adj.has(e.from)) {
            adj.get(e.from).push(e.to);
        }
    }
    return adj;
}
function tarjanSCC(graph) {
    const index = new Map();
    const lowlink = new Map();
    const onStack = new Set();
    const stack = [];
    let indexCounter = 0;
    const sccs = [];
    function strongConnect(v) {
        index.set(v, indexCounter);
        lowlink.set(v, indexCounter);
        indexCounter++;
        stack.push(v);
        onStack.add(v);
        for (const w of graph.get(v) || []) {
            if (!index.has(w)) {
                strongConnect(w);
                lowlink.set(v, Math.min(lowlink.get(v), lowlink.get(w)));
            }
            else if (onStack.has(w)) {
                lowlink.set(v, Math.min(lowlink.get(v), index.get(w)));
            }
        }
        if (lowlink.get(v) === index.get(v)) {
            const scc = [];
            let w;
            do {
                w = stack.pop();
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
//# sourceMappingURL=cycles.js.map