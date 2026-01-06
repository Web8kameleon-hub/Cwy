// Core data types for CWY graph: modules, edges, conflicts, cycles, metrics.

export type Layer = "entry" | "business" | "infra" | "unknown";

export type EdgeKind = "import" | "runtime" | "http" | "queue" | "db" | "event";

export type EdgeStatus = "ok" | "missing" | "degraded" | "conflict";

export type ConflictType =
  | "package_version"
  | "duplicate_symbol"
  | "peer_mismatch"
  | "lockfile_split";

export type Severity = "low" | "med" | "high";

export interface ModuleMetrics {
  load?: number; // 0..1
  latency_ms?: number;
  error_rate?: number; // 0..1
  throughput_rps?: number;
}

export interface FileModule {
  id: string;
  path: string;
  name: string;
  package: string;
  version: string;
  layer: Layer;
  tags?: string[];
  metrics?: ModuleMetrics;
  metadata?: {
    language?: string;
    loc?: number;
    size?: number;
  };
}

export interface EdgeSignals {
  load?: number;
  latency_ms?: number;
  error_rate?: number;
  gap?: boolean;
}

export interface DependencyEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  required: boolean;
  status: EdgeStatus;
  signals?: EdgeSignals;
}

export interface Conflict {
  type: ConflictType;
  severity: Severity;
  modules: string[];
  packages: string[];
}

export interface Cycle {
  nodes: string[];
  edges: string[];
}

export interface GraphSnapshot {
  generatedAt: string;
  modules: FileModule[];
  edges: DependencyEdge[];
  conflicts: Conflict[];
  cycles: Cycle[];
}

export interface PathView {
  targetId: string;
  nodes: string[];
  edges: string[];
  notes?: string[];
}
