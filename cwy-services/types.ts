import type { GraphSnapshot, FileModule, DependencyEdge } from "../schema/types";

export interface TypesRegistration {
  healthy: boolean;
  isFileModule: (value: unknown) => value is FileModule;
  isDependencyEdge: (value: unknown) => value is DependencyEdge;
  isGraphSnapshot: (value: unknown) => value is GraphSnapshot;
}

export function registerTypes(): TypesRegistration {
  const isObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  const isFileModule = (value: unknown): value is FileModule => {
    if (!isObject(value)) return false;
    return (
      typeof value.id === "string" &&
      typeof value.path === "string" &&
      typeof value.name === "string" &&
      typeof value.package === "string" &&
      typeof value.version === "string" &&
      typeof value.layer === "string"
    );
  };

  const isDependencyEdge = (value: unknown): value is DependencyEdge => {
    if (!isObject(value)) return false;
    return (
      typeof value.id === "string" &&
      typeof value.from === "string" &&
      typeof value.to === "string" &&
      typeof value.kind === "string" &&
      typeof value.required === "boolean" &&
      typeof value.status === "string"
    );
  };

  const isGraphSnapshot = (value: unknown): value is GraphSnapshot => {
    if (!isObject(value)) return false;
    const modules = (value as any).modules;
    const edges = (value as any).edges;
    const conflicts = (value as any).conflicts;
    const cycles = (value as any).cycles;

    return (
      typeof (value as any).generatedAt === "string" &&
      Array.isArray(modules) &&
      modules.every(isFileModule) &&
      Array.isArray(edges) &&
      edges.every(isDependencyEdge) &&
      Array.isArray(conflicts) &&
      Array.isArray(cycles)
    );
  };

  return {
    healthy: true,
    isFileModule,
    isDependencyEdge,
    isGraphSnapshot,
  };
}
