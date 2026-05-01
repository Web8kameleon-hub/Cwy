import { getLastSnapshot } from "../memory/db";
import { search, SearchableItem } from "../engines/search/search";

export interface SearchRegistration {
  healthy: boolean;
  run: (query: string, limit?: number) => SearchableItem[];
}

export function registerSearch(): SearchRegistration {
  const snapshot = getLastSnapshot();
  if (!snapshot) {
    throw new Error("No snapshot available. Run `cwy scan` before search registration.");
  }

  return {
    healthy: true,
    run: (query: string, limit: number = 20) => {
      const files = snapshot.modules.map((m: any) => ({
        path: m.path,
        language: m.metadata?.language || "Unknown",
        loc: m.metadata?.loc || 0,
      }));
      const nodes = snapshot.modules.map((m: any) => ({
        id: m.id,
        label: m.name,
      }));

      return search(query, files, nodes, { limit });
    },
  };
}
