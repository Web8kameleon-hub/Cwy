# CWY Core — Visual System Graph & Integrity Engine

**CWY** ndërton një hartë të gjallë të projektit tënd: module, lidhje, cycles, orphans, conflicts, dhe "way-to-X" paths—me UI minimal, white panel, black text, dhe "electric linewaves" që lëvizin vetëm kur ka ngarkesë.

---

## 🚀 Quick Start

```bash
cd cwy-core
npm install
npx ts-node ./cli/cwy.ts init
npx ts-node ./cli/cwy.ts scan
npx ts-node ./cli/cwy.ts icon
npx ts-node ./cli/cwy.ts integrity
npx ts-node ./cli/cwy.ts route <module-name>
```

---

## 📦 Structure

```
cwy-core/
├─ cli/
│  └─ cwy.ts               # CLI entrypoint (init, scan, icon, route, integrity, signals, status)
├─ memory/
│  └─ memory.ts            # Local JSON store (.cwy/memory.json)
├─ schema/
│  └─ types.ts             # TypeScript types: FileModule, DependencyEdge, Conflict, Cycle, GraphSnapshot
├─ engines/
│  ├─ topology/
│  │  ├─ topology.ts       # Scan files, extract imports, build graph
│  │  ├─ cycles.ts         # Tarjan SCC cycle detection
│  │  └─ pathfinder.ts     # BFS "way-to-X" path finder
│  ├─ integrity/
│  │  └─ integrity.ts      # Orphan/missing-link/conflict detector
│  └─ signals/
│     └─ linewave.ts       # Compute amplitude/frequency/jaggedness for electric wave rendering
└─ vscode-extension/
   ├─ package.json
   ├─ tsconfig.json
   └─ src/
      ├─ extension.ts
      └─ panels/
         └─ overview.ts    # White-panel webview (waves, signals, CWY score)
```

---

## 🎯 Core Concepts

1. **FileModule**: every `.ts/.js` file, with `id`, `path`, `name`, `package`, `version`, `layer` (entry/business/infra/unknown), optional `metrics` (load, latency, error).
2. **DependencyEdge**: `from → to`, `kind` (import/runtime/http/queue/db/event), `required`, `status` (ok/missing/degraded/conflict), optional `signals` (load, latency, error, gap).
3. **Conflict**: package version mismatches, duplicate symbols, peer conflicts → rendered with **striped 2-3 color edges**.
4. **Cycle**: strongly connected components (SCC > 1) → detected via **Tarjan's algorithm**.
5. **Orphan**: module with no incoming/outgoing edges, or unreachable from entry.
6. **Way-to-X**: BFS from entry nodes to target → minimal path.
7. **Linewave**: edges animate with **amplitude/frequency/jaggedness** based on load/error/latency:
   - **Quiet** (low load) → minimal wave.
   - **Electric** (high load) → sharp, fast oscillation.
   - **Gap** (missing link) → red dashed line with visual break.
   - **Conflict** (package mismatch) → striped 2-3 colors.

---

## 🧩 CLI Commands

| Command | Purpose |
|---------|---------|
| `cwy init` | Create `.cwy/memory.json`, no cloud. |
| `cwy scan` | Walk files, extract imports, detect cycles/orphans/conflicts → save GraphSnapshot. |
| `cwy icon` | Print System Icon: files, modules, entry points, edges, cycles, conflicts. |
| `cwy route <module>` | Show BFS path from entry → target. |
| `cwy integrity` | List orphans, missing links, cycles, conflicts. |
| `cwy signals` | Print package conflicts & cycles count. |
| `cwy status` | Trial/monetization message. |

---

## 🎨 UI Philosophy (Ultra-Effective)

- **White background**, **black text** → zero noise.
- **Tabs** (like IDE) for each file/module → context-based focus.
- **Graph canvas**: nodes = simple rectangles, edges = thin lines.
- **Color** only for **problems**:
  - **Red dashed** → missing link (gap).
  - **Striped 2-3 colors** → package conflict.
  - **Quiet wave** → normal, **electric wave** → high load.
- **No animations** except linewave (subtle, controlled).
- **Inspector panel** (right/bottom) appears on click → shows module details, incoming/outgoing, missing links.

---

## 📐 OpenAPI Spec (Minimal)

```yaml
openapi: 3.0.3
info:
  title: CWY Graph API
  version: 1.0.0
paths:
  /graph/snapshot:
    get:
      summary: Full graph snapshot
      parameters:
        - in: query
          name: workspace
          required: true
          schema: { type: string }
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GraphSnapshot'
  /graph/path:
    get:
      summary: Way-to-X path
      parameters:
        - in: query
          name: workspace
          required: true
        - in: query
          name: targetId
          required: true
        - in: query
          name: mode
          schema: { type: string, enum: [shortest, highest_load] }
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PathView'
components:
  schemas:
    GraphSnapshot:
      type: object
      required: [generatedAt, modules, edges, conflicts, cycles]
      properties:
        generatedAt: { type: string, format: date-time }
        modules: { type: array, items: { $ref: '#/components/schemas/Module' } }
        edges: { type: array, items: { $ref: '#/components/schemas/Edge' } }
        conflicts: { type: array, items: { $ref: '#/components/schemas/Conflict' } }
        cycles: { type: array, items: { $ref: '#/components/schemas/Cycle' } }
    Module:
      type: object
      required: [id, path, name, package, version, layer]
      properties:
        id: { type: string }
        path: { type: string }
        name: { type: string }
        package: { type: string }
        version: { type: string }
        layer: { type: string, enum: [entry, business, infra, unknown] }
        tags: { type: array, items: { type: string } }
        metrics:
          type: object
          properties:
            load: { type: number, minimum: 0, maximum: 1 }
            latency_ms: { type: number }
            error_rate: { type: number, minimum: 0, maximum: 1 }
            throughput_rps: { type: number }
    Edge:
      type: object
      required: [id, from, to, kind, required, status]
      properties:
        id: { type: string }
        from: { type: string }
        to: { type: string }
        kind: { type: string, enum: [import, runtime, http, queue, db, event] }
        required: { type: boolean }
        status: { type: string, enum: [ok, missing, degraded, conflict] }
        signals:
          type: object
          properties:
            load: { type: number }
            latency_ms: { type: number }
            error_rate: { type: number }
            gap: { type: boolean }
    Conflict:
      type: object
      required: [type, severity, modules, packages]
      properties:
        type: { type: string, enum: [package_version, duplicate_symbol, peer_mismatch, lockfile_split] }
        severity: { type: string, enum: [low, med, high] }
        modules: { type: array, items: { type: string } }
        packages: { type: array, items: { type: string } }
    Cycle:
      type: object
      required: [nodes]
      properties:
        nodes: { type: array, items: { type: string } }
        edges: { type: array, items: { type: string } }
    PathView:
      type: object
      required: [targetId, nodes, edges]
      properties:
        targetId: { type: string }
        nodes: { type: array, items: { type: string } }
        edges: { type: array, items: { type: string } }
        notes: { type: array, items: { type: string } }
```

---

## 🔥 Linewave Rendering (Electric)

For each edge `e`, given `signals`:

```ts
const { load = 0, error_rate = 0 } = e.signals || {};
const amplitude = 2 + 12 * load + 8 * Math.min(error_rate * 2, 1);
const frequency = 0.5 + 1.5 * load;
const jaggedness = smoothstep(0.6, 1.0, load); // kicks in when load > 0.6
```

- **Gap** (missing link): render two edge segments with a visual break (12–20px), dashed red.
- **Conflict**: stripe edge with 2 or 3 colors (use SVG pattern or canvas gradient).

---

## 🧠 Algorithms

1. **Tarjan SCC** (`engines/topology/cycles.ts`) → detects cycles.
2. **BFS pathfinding** (`engines/topology/pathfinder.ts`) → way-to-X.
3. **Integrity rules** (`engines/integrity/integrity.ts`):
   - orphan = `inDegree === 0 && outDegree === 0`
   - unreachable = `inDegree === 0 && layer !== "entry"`
   - missing link = `edge.required && !moduleExists(edge.to)`
   - conflict = multiple versions of same package.

---

## 📊 VS Code Extension

- **Command**: `CWY: Show Overview`
- **Panel**: white, black text, waves (sparkline), signals, CWY score.
- **Data source**: `.cwy/memory.json` → `lastSnapshot`.
- **Future**: tabs for each module, graph canvas, inspector panel.

---

## 💰 Monetization (Etik)

- 1 day free trial → full experience.
- After 24h: "Trial expired. Support when ready. Suggested: 2–10 €"
- No blocking → soft nudge.
- Payment = unlock unlimited scans, history, sync (optional).

---

## 📚 Next Steps

1. **Feed VS Code panel** from `.cwy/memory.json` instead of placeholders.
2. **Add history snapshots** (`history/yyyymmdd.json`) for temporal model (dje vs sot).
3. **Swap memory** to SQLite/LMDB for scale.
4. **Implement Sugiyama layering** for large graph layout.
5. **Add OpenAPI server** (Express/Fastify) for remote access.
6. **Export/import** GraphSnapshot as CBOR/JSON for portability.

---

**Tani ke gjithçka: spec, algorithms, CLI, engines, schema, UI philosophy, OpenAPI, linewave rules, monetization.**  
Është gati për implementim, shkallëzim, dhe përdorim real. 🚀
