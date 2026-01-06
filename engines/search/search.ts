// Search & Jump functionality for CWY TUI
// Allows fast navigation to files/nodes (like Postman's search)

export interface SearchableItem {
  kind: "file" | "node";
  key: string; // path or node id
  meta: string; // additional info for display
  score: number; // search relevance score
}

/**
 * Search through files and nodes
 * Fuzzy matching with relevance scoring
 */
export function search(
  query: string,
  files: Array<{ path: string; language: string; loc: number }>,
  nodes: Array<{ id: string; label: string }>,
  options: {
    filesOnly?: boolean;
    nodesOnly?: boolean;
    limit?: number;
  } = {}
): SearchableItem[] {
  const results: SearchableItem[] = [];
  const lowerQuery = query.toLowerCase();

  // Search files
  if (!options.nodesOnly) {
    files.forEach((file) => {
      const score = calculateScore(lowerQuery, file.path.toLowerCase());
      if (score > 0) {
        results.push({
          kind: "file",
          key: file.path,
          meta: `${file.language}, ${file.loc} LOC`,
          score,
        });
      }
    });
  }

  // Search nodes
  if (!options.filesOnly) {
    nodes.forEach((node) => {
      const score = calculateScore(lowerQuery, node.label.toLowerCase());
      if (score > 0) {
        results.push({
          kind: "node",
          key: node.id,
          meta: "package",
          score,
        });
      }
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Limit results
  if (options.limit) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Calculate relevance score for search match
 * Higher score = better match
 */
function calculateScore(query: string, target: string): number {
  if (!query || !target) return 0;

  // Exact match
  if (target === query) return 100;

  // Starts with query
  if (target.startsWith(query)) return 80;

  // Contains query as word
  if (target.includes(`/${query}/`) || target.includes(`/${query}`)) return 70;

  // Contains query anywhere
  const index = target.indexOf(query);
  if (index >= 0) {
    // Closer to start = higher score
    return 50 - index;
  }

  // Fuzzy match (simple subsequence)
  if (isFuzzyMatch(query, target)) return 30;

  return 0;
}

/**
 * Check if query chars appear in order in target
 * Example: "pmt" matches "payments"
 */
function isFuzzyMatch(query: string, target: string): boolean {
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) {
      qi++;
    }
  }
  return qi === query.length;
}

/**
 * Format search result for display
 */
export function formatSearchResult(item: SearchableItem, maxWidth: number = 60): string {
  const icon = item.kind === "file" ? "📄" : "📦";
  const key = item.key.length > maxWidth - 10 ? `...${item.key.slice(-(maxWidth - 13))}` : item.key;
  const meta = item.meta;
  
  return `${icon} ${key} (${meta})`;
}

/**
 * Group search results by kind
 */
export function groupResults(results: SearchableItem[]): {
  files: SearchableItem[];
  nodes: SearchableItem[];
} {
  return {
    files: results.filter((r) => r.kind === "file"),
    nodes: results.filter((r) => r.kind === "node"),
  };
}
