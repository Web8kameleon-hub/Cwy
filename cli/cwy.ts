#!/usr/bin/env node

// CWY CLI - Offline-first, local memory, ethical monetization
import { verifyBinarySignature } from "../engines/integrity/signing";
import { buildTopology } from "../engines/topology/topology";
import { checkIntegrity } from "../engines/integrity/integrity";
import { detectCycles } from "../engines/topology/cycles";
import { findPathTo } from "../engines/topology/pathfinder";
import {
  getDB,
  closeDB,
  initProject,
  getProject,
  saveSnapshot,
  getLastSnapshot,
  getSnapshotDaysAgo,
  recordContribution,
  getTotalContributed,
  logIntegrityEvent,
  getSystemState,
  setSystemState,
} from "../memory/db";
import { evaluateProject } from "../engines/scoring/score";
import { runIntegrityChecks } from "../engines/integrity/detection";
import { determineMode, getModeConfig, isOperationAllowed } from "../engines/integrity/modes";
import { FileModule, GraphSnapshot } from "../schema/types";

type CommandHandler = (args: string[]) => Promise<void> | void;

const commands: Record<string, CommandHandler> = {
  init: async () => {
    const project = getProject();
    if (project) {
      console.log("CWY is already initialized.");
      console.log("Local memory is present.");
      return;
    }
    const projectName = process.cwd().split(/[\\/]/).pop() || "project";
    initProject(projectName, process.cwd());
    console.log("CWY initialized.");
    console.log("This project now has local memory.");
    console.log("Nothing is sent anywhere.");
  },

  scan: async () => {
    // Check mode
    const mode = getSystemState("mode") || "NORMAL";
    if (!isOperationAllowed(mode as any, "scan")) {
      const config = getModeConfig(mode as any);
      console.log(config.message);
      return;
    }

    const { startProgress, startSpinner } = await import("../engines/progress/progress");
    
    const workspaceRoot = process.cwd();
    
    // Progress indicator for file scanning
    let progress: any = null;
    const onProgress = (current: number, total: number, file: string) => {
      if (!progress) {
        progress = startProgress("Scanning files", total);
      }
      progress.update(current, file);
    };
    
    const { modules, edges } = buildTopology(workspaceRoot, onProgress);
    
    if (progress) {
      progress.finish(`Scanned ${modules.length} files`);
    }
    
    const spinner = startSpinner("Detecting cycles");
    const cycles = detectCycles(
      modules.map((m) => m.id),
      edges
    );
    spinner.stop(`Found ${cycles.length} cycles`);
    
    const spinner2 = startSpinner("Checking integrity");
    const { orphans, missingLinks, conflicts } = checkIntegrity(modules, edges);
    spinner2.stop(`Integrity check complete`);
    const snapshot: GraphSnapshot = {
      generatedAt: new Date().toISOString(),
      modules,
      edges,
      conflicts,
      cycles,
    };

    // Calculate score
    const entryPoints = modules.filter(m => m.layer === "entry").length;
    const avgDepth = modules.length > 0 ? Math.ceil(edges.length / modules.length) : 0;
    const project = getProject();
    const firstScanDate = project?.created_at ? new Date(project.created_at) : new Date();
    const daysSinceFirst = Math.floor((Date.now() - firstScanDate.getTime()) / (1000 * 60 * 60 * 24));
    const agentModules = modules.filter(m => /agent|ai|llm|prompt/.test(m.path.toLowerCase())).length;
    
    const metrics = {
      modules: modules.length,
      routes: entryPoints,
      depth: avgDepth,
      cycles: cycles.length,
      conflicts: conflicts.length,
      historyDays: daysSinceFirst,
      agents: agentModules,
    };
    const { score, category } = evaluateProject(metrics);

    // Save snapshot with score
    const spinner3 = startSpinner("Saving snapshot");
    saveSnapshot(snapshot, score);
    spinner3.stop("Snapshot saved");

    // Run integrity checks
    const bypassAttempts = Number(getSystemState("bypass_attempts") || "0");
    const integrityCheck = runIntegrityChecks(score, bypassAttempts);
    if (!integrityCheck.passed) {
      for (const v of integrityCheck.violations) {
        logIntegrityEvent(v.type, v.severity, v.details);
      }
    }

    // Update mode
    const totalContributed = getTotalContributed();
    const integrityViolations = Number(getSystemState("integrity_violations") || "0");
    const newMode = determineMode(score, totalContributed, integrityViolations);
    setSystemState("mode", newMode);

    // Summary with better formatting
    console.log("\n\u2713 Scan complete");
    console.log(`  Files: ${modules.length}`);
    console.log(`  Modules: ${snapshot.modules.filter((m: any) => m.package).length}`);
    console.log(`  Entry points: ${snapshot.modules.filter((m: any) => m.layer === "entry").length}`);
    console.log(`  Score: ${score.toFixed(1)}%`);
    
    if (orphans.length > 0 || missingLinks.length > 0 || cycles.length > 0) {
      console.log("\n\u26A0 Integrity issues detected:");
      if (orphans.length > 0) console.log(`  - ${orphans.length} orphan modules`);
      if (cycles.length > 0) console.log(`  - ${cycles.length} cycles`);
      if (missingLinks.length > 0) console.log(`  - ${missingLinks.length} missing links`);
      console.log("\nRun: cwy integrity");
    }
  },

  icon: async () => {
    const snapshot = getLastSnapshot();
    if (!snapshot) {
      console.log("No snapshot. Run `cwy scan` first.");
      return;
    }
    
    const db = getDB();
    const row = db.prepare(`SELECT score FROM snapshots ORDER BY generated_at DESC LIMIT 1`).get() as { score: number } | undefined;
    const { category } = row ? evaluateProject({
      modules: snapshot.modules.length,
      routes: 0,
      depth: 3,
      cycles: snapshot.cycles.length,
      conflicts: snapshot.conflicts.length,
      historyDays: 1,
      agents: 0,
    }) : { category: "Small" };
    
    console.log("\nSYSTEM ICON");
    console.log("Core: 1");
    console.log(`Modules: ${snapshot.modules.filter((m: any) => m.package).length}`);
    console.log(`Entry points: ${snapshot.modules.filter((m: any) => m.layer === "entry").length}`);
    console.log(`\nProduces:`);
    console.log(`  • Edges: ${snapshot.edges.length}`);
    console.log(`  • Routes: (calculated on demand)`);
    
    const { orphans } = checkIntegrity(snapshot.modules, snapshot.edges);
    const integrityPercent = ((snapshot.modules.length - orphans.length) / snapshot.modules.length * 100).toFixed(0);
    console.log(`\nIntegrity: ${integrityPercent}%`);
    
    if (category === "Small") {
      console.log("\nThis system is simple.");
      console.log("Growth is possible.");
    } else if (category === "Growing" || category === "Substantial" || category === "Large") {
      console.log("\nThis system is substantial.");
      console.log("You have built something real.");
    }
  },

  route: async (args: string[]) => {
    const snapshot = getLastSnapshot();
    if (!snapshot) {
      console.log("No snapshot. Run `cwy scan` first.");
      return;
    }
    const target = args[0];
    if (!target) {
      console.log("Usage: cwy route <target>");
      return;
    }
    const pathView = findPathTo(target, snapshot.modules, snapshot.edges);
    if (!pathView) {
      console.log(`\nNo complete route found.`);
      console.log(`Missing link to: ${target}`);
      return;
    }
    console.log(`\nWAY TO: ${target}`);
    const pathStr = pathView.nodes.join(" → ");
    console.log(pathStr);
    console.log("\nLoad: (to be calculated)");
    console.log(`Conflicts: ${snapshot.conflicts.length > 0 ? snapshot.conflicts.length : "none"}`);
    
    const { missingLinks } = checkIntegrity(snapshot.modules, snapshot.edges);
    console.log(`Missing links: ${missingLinks.length}`);
  },

  integrity: async () => {
    const snapshot = getLastSnapshot();
    if (!snapshot) {
      console.log("No snapshot. Run `cwy scan` first.");
      return;
    }
    const { orphans, missingLinks } = checkIntegrity(
      snapshot.modules,
      snapshot.edges
    );
    
    if (orphans.length === 0 && missingLinks.length === 0 && snapshot.cycles.length === 0 && snapshot.conflicts.length === 0) {
      console.log("\nSystem integrity is clean.");
      return;
    }
    
    console.log("\nINTEGRITY REPORT");
    console.log(`Orphan modules: ${orphans.length}`);
    console.log(`Missing links: ${missingLinks.length}`);
    console.log(`Cycles: ${snapshot.cycles.length}`);
    console.log(`Conflicts: ${snapshot.conflicts.length}`);
    
    if (orphans.length > 0) {
      console.log("\nOrphans:");
      orphans.forEach((id: string) => {
        const module = snapshot.modules.find((m: any) => m.id === id);
        console.log(`  - ${module ? module.name : id}`);
      });
    }
    if (missingLinks.length > 0) {
      console.log("\nMissing links:");
      missingLinks.forEach((e: any) => console.log(`  - ${e.from} → ${e.to}`));
    }
  },

  signals: async () => {
    const snapshot = getLastSnapshot();
    if (!snapshot) {
      console.log("No snapshot. Run `cwy scan` first.");
      return;
    }
    
    const { orphans, missingLinks } = checkIntegrity(snapshot.modules, snapshot.edges);
    const packageConflicts = snapshot.conflicts.filter((c: any) => c.type === "package_version");
    
    const activeSignals: { type: string; severity: string; count: number; details?: any }[] = [];
    if (missingLinks.length > 0) {
      activeSignals.push({
        type: "missing_link",
        severity: "high",
        count: missingLinks.length,
        details: missingLinks[0]
      });
    }
    if (packageConflicts.length > 0) {
      activeSignals.push({
        type: "package_conflict",
        severity: "medium",
        count: packageConflicts.length
      });
    }
    if (snapshot.cycles.length > 0) {
      activeSignals.push({
        type: "cycle_detected",
        severity: "medium",
        count: snapshot.cycles.length
      });
    }
    
    if (activeSignals.length === 0) {
      console.log("\nNo active signals.");
      return;
    }
    
    console.log(`\nActive signals: ${activeSignals.length}`);
    activeSignals.forEach(sig => {
      console.log(`  • ${sig.type} (${sig.severity})`);
      if (sig.type === "missing_link" && sig.details && typeof sig.details === 'object') {
        console.log(`    ${(sig.details as any).from} → ${(sig.details as any).to}`);
      }
    });
  },

  status: async () => {
    const project = getProject();
    if (!project) {
      console.log("No project initialized. Run `cwy init` first.");
      return;
    }

    const snapshot = getLastSnapshot();
    const mode = getSystemState("mode") || "NORMAL";
    const config = getModeConfig(mode as any);
    const totalContributed = getTotalContributed();

    console.log("\nPROJECT STATUS");
    
    if (snapshot) {
      const db = getDB();
      const row = db.prepare(`SELECT score FROM snapshots ORDER BY generated_at DESC LIMIT 1`).get() as { score: number } | undefined;
      if (row) {
        const { category } = evaluateProject({
          modules: snapshot.modules.length,
          routes: 0,
          depth: 3,
          cycles: snapshot.cycles.length,
          conflicts: snapshot.conflicts.length,
          historyDays: 1,
          agents: 0,
        });
        console.log(`Size: ${category}`);
        
        if (mode === "NORMAL") {
          console.log("CWY is fully available.");
        } else if (mode === "ADAPTIVE_LIMIT") {
          console.log("CWY adapts as the project grows.");
        } else if (mode === "SILENT_DEGRADE" || mode === "INTEGRITY") {
          // Message will be shown from config below
        }
      }
    }
    
    if (config.message) {
      console.log();
      console.log(config.message);
    }
  },

  contribute: async (args: string[]) => {
    const amount = parseFloat(args[0] || "0");
    if (amount <= 0) {
      console.log("\nThis project has grown.");
      const snapshot = getLastSnapshot();
      if (snapshot) {
        const db = getDB();
        const row = db.prepare(`SELECT score FROM snapshots ORDER BY generated_at DESC LIMIT 1`).get() as { score: number } | undefined;
        if (row) {
          const { suggestedContribution } = evaluateProject({
            modules: snapshot.modules.length,
            routes: 0,
            depth: 3,
            cycles: snapshot.cycles.length,
            conflicts: snapshot.conflicts.length,
            historyDays: 1,
            agents: 0,
          });
          console.log(`Suggested contribution: ${suggestedContribution} €`);
        }
      }
      console.log("You choose the amount.");
      console.log("You choose the time.");
      console.log("No account required.");
      console.log("\nUsage: cwy contribute <amount>");
      return;
    }

    recordContribution(amount);
    console.log("\nThank you.");
    console.log("Support is acknowledged.");

    // Reset mode if contribution clears threshold
    const totalContributed = getTotalContributed();
    const snapshot = getLastSnapshot();
    if (snapshot) {
      const db = getDB();
      const row = db.prepare(`SELECT score FROM snapshots ORDER BY generated_at DESC LIMIT 1`).get() as { score: number } | undefined;
      if (row) {
        const integrityViolations = Number(getSystemState("integrity_violations") || "0");
        const newMode = determineMode(row.score, totalContributed, integrityViolations);
        setSystemState("mode", newMode);
      }
    }
  },

  diff: async (args: string[]) => {
    const daysAgo = parseInt(args[0] || "1", 10);
    const current = getLastSnapshot();
    const past = getSnapshotDaysAgo(daysAgo);

    if (!current) {
      console.log("No current snapshot. Run `cwy scan` first.");
      return;
    }
    if (!past) {
      console.log(`No snapshot found from ${daysAgo} day(s) ago.`);
      return;
    }

    console.log(`\n=== DIFF (${daysAgo} day(s) ago → today) ===`);
    console.log(`Modules: ${past.modules.length} → ${current.modules.length} (${current.modules.length - past.modules.length > 0 ? '+' : ''}${current.modules.length - past.modules.length})`);
    console.log(`Edges: ${past.edges.length} → ${current.edges.length} (${current.edges.length - past.edges.length > 0 ? '+' : ''}${current.edges.length - past.edges.length})`);
    console.log(`Cycles: ${past.cycles.length} → ${current.cycles.length} (${current.cycles.length - past.cycles.length > 0 ? '+' : ''}${current.cycles.length - past.cycles.length})`);
    console.log(`Conflicts: ${past.conflicts.length} → ${current.conflicts.length} (${current.conflicts.length - past.conflicts.length > 0 ? '+' : ''}${current.conflicts.length - past.conflicts.length})`);
  },

  overview: async (args: string[]) => {
    const snapshot = getLastSnapshot();
    if (!snapshot) {
      console.log("No system data available.");
      console.log("Run: cwy scan");
      return;
    }

    const { generateOverview, formatOverview } = await import("../engines/overview/overview");
    const overview = generateOverview(snapshot);

    // JSON output for UI/automation
    if (args.includes("--json")) {
      console.log(JSON.stringify(overview, null, 2));
      return;
    }

    // Human-readable output
    console.log(formatOverview(overview));
  },

  search: async (args: string[]) => {
    if (args.length === 0) {
      console.log("Usage: cwy search <query> [--files] [--nodes]");
      return;
    }

    const snapshot = getLastSnapshot();
    if (!snapshot) {
      console.log("No system data available.");
      console.log("Run: cwy scan");
      return;
    }

    const query = args[0];
    const filesOnly = args.includes("--files");
    const nodesOnly = args.includes("--nodes");
    const asJson = args.includes("--json");

    const { search: searchEngine, formatSearchResult } = await import("../engines/search/search");

    // Prepare searchable data
    const files = snapshot.modules.map((m: FileModule) => ({
      path: m.path,
      language: m.metadata?.language || "Unknown",
      loc: m.metadata?.loc || 0,
    }));

    const nodes = snapshot.modules.map((m: FileModule) => ({
      id: m.id,
      label: m.name,
    }));

    const results = searchEngine(query, files, nodes, {
      filesOnly,
      nodesOnly,
      limit: 20,
    });

    if (asJson) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      console.log(`No results for "${query}"`);
      return;
    }

    console.log(`\nSearch results for "${query}":\n`);
    results.forEach((item, i) => {
      console.log(`${i + 1}. ${formatSearchResult(item)}`);
    });
    console.log(`\nFound ${results.length} result(s)`);
  },

  trace: async (args: string[]) => {
    if (args.length < 2) {
      console.log("Usage: cwy trace file <path>");
      console.log("       cwy trace node <pkg>");
      return;
    }

    const snapshot = getLastSnapshot();
    if (!snapshot) {
      console.log("No system data available.");
      console.log("Run: cwy scan");
      return;
    }

    const subcommand = args[0];
    const target = args[1];
    const asJson = args.includes("--json");

    if (subcommand === "file") {
      const { traceFile, formatFileTrace } = await import("../engines/trace/file");
      const trace = traceFile(snapshot, target);

      if (!trace) {
        console.log(`File not found: ${target}`);
        return;
      }

      if (asJson) {
        console.log(JSON.stringify(trace, null, 2));
        return;
      }

      console.log(formatFileTrace(trace));
    } else if (subcommand === "node") {
      console.log("Node tracing coming soon...");
    } else {
      console.log("Unknown trace subcommand. Use 'file' or 'node'.");
    }
  },

  fix: async (args: string[]) => {
    const snapshot = getLastSnapshot();
    if (!snapshot) {
      console.log("No system data available.");
      console.log("Run: cwy scan");
      return;
    }

    const shouldApply = args.includes("--apply");
    const asJson = args.includes("--json");

    const { detectFixes, formatFixReport } = await import("../engines/fix/detect");
    const report = detectFixes(snapshot, process.cwd());

    if (shouldApply) {
      const { applyFixes, formatApplyResult } = await import("../engines/fix/apply");
      const result = applyFixes(report, process.cwd(), false);

      if (asJson) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(formatApplyResult(result));
    } else {
      if (asJson) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log(formatFixReport(report));
    }
  },

  watch: async () => {
    const snapshot = getLastSnapshot();
    if (!snapshot) {
      console.log("No system data available.");
      console.log("Run: cwy scan");
      return;
    }

    const { startWatch } = await import("../engines/watch/watch");
    const watcher = startWatch(process.cwd());

    // Handle Ctrl+C gracefully
    process.on("SIGINT", () => {
      watcher.stop();
      process.exit(0);
    });
  },
};

function printHelp() {
  console.log(`
CWY - Offline-first system mapping

COMMANDS:
  init           Initialize CWY in this project
  scan           Scan workspace and build graph
  icon           Show system icon (what you built)
  route <target> Find path to target module
  integrity      Show orphans, cycles, conflicts
  signals        Show active signals
  status         Show project status and mode
  overview       Complete system snapshot (chart + Postman view contract)
  search <query> Find files and nodes (--files, --nodes, --json)
  trace file|node <target>  Show routes, impact, usage (--json)
  fix            Detect missing routes, unused files, docs (--apply, --json)
  watch          Watch for file changes and show live cwy value
  contribute <€> Record contribution (local)
  diff [days]    Compare snapshot with N days ago (default: 1)

PHILOSOPHY:
  - Local memory, always
  - No server required
  - Support when ready
  - Mutual respect
  `);
}

async function main() {
  // Verify binary signature on startup (production only)
  const signatureCheck = verifyBinarySignature();
  if (!signatureCheck.valid) {
    console.error("\n\u26A0  CWY integrity verification failed.");
    console.error(`Reason: ${signatureCheck.reason}`);
    console.error("\nThis binary may be:");
    console.error("  - Modified without authorization");
    console.error("  - Corrupted during download");
    console.error("  - Not an official CWY distribution");
    console.error("\nFor your protection, CWY will not run.");
    console.error("Download official version from: https://cwy.io/download\n");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.log(`Unknown command: ${command}`);
    console.log(`Run "cwy help" for usage.`);
    process.exit(1);
  }

  try {
    await handler(args.slice(1));
  } catch (err: any) {
    console.error("\nOperation could not be completed.");
    console.error("Nothing was changed.");
    if (process.env.CWY_DEBUG) {
      console.error("\nDebug info:", err.message);
    }
    process.exit(1);
  } finally {
    closeDB();
  }
}

main();
