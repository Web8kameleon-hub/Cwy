// Integrity engine: detect orphans, missing links, package conflicts.
import type {
  FileModule,
  DependencyEdge,
  Conflict,
  Severity,
} from "../../schema/types";

export interface IntegrityReport {
  orphans: string[];
  missingLinks: string[];
  conflicts: Conflict[];
}

export function checkIntegrity(
  modules: FileModule[],
  edges: DependencyEdge[]
): IntegrityReport {
  const orphans: string[] = [];
  const missingLinks: string[] = [];
  const conflicts: Conflict[] = [];

  const moduleIds = new Set(modules.map((m) => m.id));
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  for (const m of modules) {
    inDegree.set(m.id, 0);
    outDegree.set(m.id, 0);
  }

  for (const e of edges) {
    if (!moduleIds.has(e.to)) {
      missingLinks.push(`${e.from} → ${e.to}`);
      continue;
    }
    outDegree.set(e.from, (outDegree.get(e.from) || 0) + 1);
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
  }

  for (const m of modules) {
    const inD = inDegree.get(m.id) || 0;
    const outD = outDegree.get(m.id) || 0;
    if (inD === 0 && outD === 0) {
      orphans.push(m.id);
    } else if (inD === 0 && m.layer !== "entry") {
      orphans.push(m.id); // unreachable
    }
  }

  // Detect package version conflicts (stub: check for duplicates in package names with different versions)
  const pkgMap = new Map<string, Set<string>>();
  for (const m of modules) {
    if (!pkgMap.has(m.package)) {
      pkgMap.set(m.package, new Set());
    }
    pkgMap.get(m.package)!.add(m.version);
  }
  for (const [pkg, versions] of pkgMap.entries()) {
    if (versions.size > 1) {
      const severity: Severity = versions.size === 2 ? "med" : "high";
      conflicts.push({
        type: "package_version",
        severity,
        modules: modules.filter((m) => m.package === pkg).map((m) => m.id),
        packages: Array.from(versions).map((v) => `${pkg}@${v}`),
      });
    }
  }

  return { orphans, missingLinks, conflicts };
}
