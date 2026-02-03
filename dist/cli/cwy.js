#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// CWY CLI - Offline-first, local memory, ethical monetization
const signing_1 = require("../engines/integrity/signing");
const topology_1 = require("../engines/topology/topology");
const integrity_1 = require("../engines/integrity/integrity");
const cycles_1 = require("../engines/topology/cycles");
const pathfinder_1 = require("../engines/topology/pathfinder");
const db_1 = require("../memory/db");
const score_1 = require("../engines/scoring/score");
const detection_1 = require("../engines/integrity/detection");
const modes_1 = require("../engines/integrity/modes");
const commands = {
    init: async () => {
        const project = (0, db_1.getProject)();
        if (project) {
            console.log("CWY is already initialized.");
            console.log("Local memory is present.");
            return;
        }
        const projectName = process.cwd().split(/[\\/]/).pop() || "project";
        (0, db_1.initProject)(projectName, process.cwd());
        console.log("CWY initialized.");
        console.log("This project now has local memory.");
        console.log("Nothing is sent anywhere.");
    },
    scan: async () => {
        // Check mode
        const mode = (0, db_1.getSystemState)("mode") || "NORMAL";
        if (!(0, modes_1.isOperationAllowed)(mode, "scan")) {
            const config = (0, modes_1.getModeConfig)(mode);
            console.log(config.message);
            return;
        }
        const { startProgress, startSpinner } = await Promise.resolve().then(() => __importStar(require("../engines/progress/progress")));
        const workspaceRoot = process.cwd();
        // Progress indicator for file scanning
        let progress = null;
        const onProgress = (current, total, file) => {
            if (!progress) {
                progress = startProgress("Scanning files", total);
            }
            progress.update(current, file);
        };
        const { modules, edges } = (0, topology_1.buildTopology)(workspaceRoot, onProgress);
        if (progress) {
            progress.finish(`Scanned ${modules.length} files`);
        }
        const spinner = startSpinner("Detecting cycles");
        const cycles = (0, cycles_1.detectCycles)(modules.map((m) => m.id), edges);
        spinner.stop(`Found ${cycles.length} cycles`);
        const spinner2 = startSpinner("Checking integrity");
        const { orphans, missingLinks, conflicts } = (0, integrity_1.checkIntegrity)(modules, edges);
        spinner2.stop(`Integrity check complete`);
        const snapshot = {
            generatedAt: new Date().toISOString(),
            modules,
            edges,
            conflicts,
            cycles,
        };
        // Calculate score
        const entryPoints = modules.filter(m => m.layer === "entry").length;
        const avgDepth = modules.length > 0 ? Math.ceil(edges.length / modules.length) : 0;
        const project = (0, db_1.getProject)();
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
        const { score, category } = (0, score_1.evaluateProject)(metrics);
        // Save snapshot with score
        const spinner3 = startSpinner("Saving snapshot");
        (0, db_1.saveSnapshot)(snapshot, score);
        spinner3.stop("Snapshot saved");
        // Run integrity checks
        const bypassAttempts = Number((0, db_1.getSystemState)("bypass_attempts") || "0");
        const integrityCheck = (0, detection_1.runIntegrityChecks)(score, bypassAttempts);
        if (!integrityCheck.passed) {
            for (const v of integrityCheck.violations) {
                (0, db_1.logIntegrityEvent)(v.type, v.severity, v.details);
            }
        }
        // Update mode
        const totalContributed = (0, db_1.getTotalContributed)();
        const integrityViolations = Number((0, db_1.getSystemState)("integrity_violations") || "0");
        const newMode = (0, modes_1.determineMode)(score, totalContributed, integrityViolations);
        (0, db_1.setSystemState)("mode", newMode);
        // Summary with better formatting
        console.log("\n\u2713 Scan complete");
        console.log(`  Files: ${modules.length}`);
        console.log(`  Modules: ${snapshot.modules.filter((m) => m.package).length}`);
        console.log(`  Entry points: ${snapshot.modules.filter((m) => m.layer === "entry").length}`);
        console.log(`  Score: ${score.toFixed(1)}%`);
        if (orphans.length > 0 || missingLinks.length > 0 || cycles.length > 0) {
            console.log("\n\u26A0 Integrity issues detected:");
            if (orphans.length > 0)
                console.log(`  - ${orphans.length} orphan modules`);
            if (cycles.length > 0)
                console.log(`  - ${cycles.length} cycles`);
            if (missingLinks.length > 0)
                console.log(`  - ${missingLinks.length} missing links`);
            console.log("\nRun: cwy integrity");
        }
    },
    icon: async () => {
        const snapshot = (0, db_1.getLastSnapshot)();
        if (!snapshot) {
            console.log("No snapshot. Run `cwy scan` first.");
            return;
        }
        const db = (0, db_1.getDB)();
        const row = db.prepare(`SELECT score FROM snapshots ORDER BY generated_at DESC LIMIT 1`).get();
        const { category } = row ? (0, score_1.evaluateProject)({
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
        console.log(`Modules: ${snapshot.modules.filter((m) => m.package).length}`);
        console.log(`Entry points: ${snapshot.modules.filter((m) => m.layer === "entry").length}`);
        console.log(`\nProduces:`);
        console.log(`  • Edges: ${snapshot.edges.length}`);
        console.log(`  • Routes: (calculated on demand)`);
        const { orphans } = (0, integrity_1.checkIntegrity)(snapshot.modules, snapshot.edges);
        const integrityPercent = ((snapshot.modules.length - orphans.length) / snapshot.modules.length * 100).toFixed(0);
        console.log(`\nIntegrity: ${integrityPercent}%`);
        if (category === "Small") {
            console.log("\nThis system is simple.");
            console.log("Growth is possible.");
        }
        else if (category === "Growing" || category === "Substantial" || category === "Large") {
            console.log("\nThis system is substantial.");
            console.log("You have built something real.");
        }
    },
    route: async (args) => {
        const snapshot = (0, db_1.getLastSnapshot)();
        if (!snapshot) {
            console.log("No snapshot. Run `cwy scan` first.");
            return;
        }
        const target = args[0];
        if (!target) {
            console.log("Usage: cwy route <target>");
            return;
        }
        const pathView = (0, pathfinder_1.findPathTo)(target, snapshot.modules, snapshot.edges);
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
        const { missingLinks } = (0, integrity_1.checkIntegrity)(snapshot.modules, snapshot.edges);
        console.log(`Missing links: ${missingLinks.length}`);
    },
    integrity: async () => {
        const snapshot = (0, db_1.getLastSnapshot)();
        if (!snapshot) {
            console.log("No snapshot. Run `cwy scan` first.");
            return;
        }
        const { orphans, missingLinks } = (0, integrity_1.checkIntegrity)(snapshot.modules, snapshot.edges);
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
            orphans.forEach((id) => {
                const module = snapshot.modules.find((m) => m.id === id);
                console.log(`  - ${module ? module.name : id}`);
            });
        }
        if (missingLinks.length > 0) {
            console.log("\nMissing links:");
            missingLinks.forEach((e) => console.log(`  - ${e.from} → ${e.to}`));
        }
    },
    signals: async () => {
        const snapshot = (0, db_1.getLastSnapshot)();
        if (!snapshot) {
            console.log("No snapshot. Run `cwy scan` first.");
            return;
        }
        const { orphans, missingLinks } = (0, integrity_1.checkIntegrity)(snapshot.modules, snapshot.edges);
        const packageConflicts = snapshot.conflicts.filter((c) => c.type === "package_version");
        const activeSignals = [];
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
                console.log(`    ${sig.details.from} → ${sig.details.to}`);
            }
        });
    },
    status: async () => {
        const project = (0, db_1.getProject)();
        if (!project) {
            console.log("No project initialized. Run `cwy init` first.");
            return;
        }
        const snapshot = (0, db_1.getLastSnapshot)();
        const mode = (0, db_1.getSystemState)("mode") || "NORMAL";
        const config = (0, modes_1.getModeConfig)(mode);
        const totalContributed = (0, db_1.getTotalContributed)();
        console.log("\nPROJECT STATUS");
        if (snapshot) {
            const db = (0, db_1.getDB)();
            const row = db.prepare(`SELECT score FROM snapshots ORDER BY generated_at DESC LIMIT 1`).get();
            if (row) {
                const { category } = (0, score_1.evaluateProject)({
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
                }
                else if (mode === "ADAPTIVE_LIMIT") {
                    console.log("CWY adapts as the project grows.");
                }
                else if (mode === "SILENT_DEGRADE" || mode === "INTEGRITY") {
                    // Message will be shown from config below
                }
            }
        }
        if (config.message) {
            console.log();
            console.log(config.message);
        }
    },
    contribute: async (args) => {
        const amount = parseFloat(args[0] || "0");
        if (amount <= 0) {
            console.log("\nThis project has grown.");
            const snapshot = (0, db_1.getLastSnapshot)();
            if (snapshot) {
                const db = (0, db_1.getDB)();
                const row = db.prepare(`SELECT score FROM snapshots ORDER BY generated_at DESC LIMIT 1`).get();
                if (row) {
                    const { suggestedContribution } = (0, score_1.evaluateProject)({
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
        (0, db_1.recordContribution)(amount);
        console.log("\nThank you.");
        console.log("Support is acknowledged.");
        // Reset mode if contribution clears threshold
        const totalContributed = (0, db_1.getTotalContributed)();
        const snapshot = (0, db_1.getLastSnapshot)();
        if (snapshot) {
            const db = (0, db_1.getDB)();
            const row = db.prepare(`SELECT score FROM snapshots ORDER BY generated_at DESC LIMIT 1`).get();
            if (row) {
                const integrityViolations = Number((0, db_1.getSystemState)("integrity_violations") || "0");
                const newMode = (0, modes_1.determineMode)(row.score, totalContributed, integrityViolations);
                (0, db_1.setSystemState)("mode", newMode);
            }
        }
    },
    diff: async (args) => {
        const daysAgo = parseInt(args[0] || "1", 10);
        const current = (0, db_1.getLastSnapshot)();
        const past = (0, db_1.getSnapshotDaysAgo)(daysAgo);
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
    overview: async (args) => {
        const snapshot = (0, db_1.getLastSnapshot)();
        if (!snapshot) {
            console.log("No system data available.");
            console.log("Run: cwy scan");
            return;
        }
        const { generateOverview, formatOverview } = await Promise.resolve().then(() => __importStar(require("../engines/overview/overview")));
        const overview = generateOverview(snapshot);
        // JSON output for UI/automation
        if (args.includes("--json")) {
            console.log(JSON.stringify(overview, null, 2));
            return;
        }
        // Human-readable output
        console.log(formatOverview(overview));
    },
    search: async (args) => {
        if (args.length === 0) {
            console.log("Usage: cwy search <query> [--files] [--nodes]");
            return;
        }
        const snapshot = (0, db_1.getLastSnapshot)();
        if (!snapshot) {
            console.log("No system data available.");
            console.log("Run: cwy scan");
            return;
        }
        const query = args[0];
        const filesOnly = args.includes("--files");
        const nodesOnly = args.includes("--nodes");
        const asJson = args.includes("--json");
        const { search: searchEngine, formatSearchResult } = await Promise.resolve().then(() => __importStar(require("../engines/search/search")));
        // Prepare searchable data
        const files = snapshot.modules.map((m) => ({
            path: m.path,
            language: m.metadata?.language || "Unknown",
            loc: m.metadata?.loc || 0,
        }));
        const nodes = snapshot.modules.map((m) => ({
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
    trace: async (args) => {
        if (args.length < 2) {
            console.log("Usage: cwy trace file <path>");
            console.log("       cwy trace node <pkg>");
            return;
        }
        const snapshot = (0, db_1.getLastSnapshot)();
        if (!snapshot) {
            console.log("No system data available.");
            console.log("Run: cwy scan");
            return;
        }
        const subcommand = args[0];
        const target = args[1];
        const asJson = args.includes("--json");
        if (subcommand === "file") {
            const { traceFile, formatFileTrace } = await Promise.resolve().then(() => __importStar(require("../engines/trace/file")));
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
        }
        else if (subcommand === "node") {
            console.log("Node tracing coming soon...");
        }
        else {
            console.log("Unknown trace subcommand. Use 'file' or 'node'.");
        }
    },
    fix: async (args) => {
        const snapshot = (0, db_1.getLastSnapshot)();
        if (!snapshot) {
            console.log("No system data available.");
            console.log("Run: cwy scan");
            return;
        }
        const shouldApply = args.includes("--apply");
        const asJson = args.includes("--json");
        const { detectFixes, formatFixReport } = await Promise.resolve().then(() => __importStar(require("../engines/fix/detect")));
        const report = detectFixes(snapshot, process.cwd());
        if (shouldApply) {
            const { applyFixes, formatApplyResult } = await Promise.resolve().then(() => __importStar(require("../engines/fix/apply")));
            const result = applyFixes(report, process.cwd(), false);
            if (asJson) {
                console.log(JSON.stringify(result, null, 2));
                return;
            }
            console.log(formatApplyResult(result));
        }
        else {
            if (asJson) {
                console.log(JSON.stringify(report, null, 2));
                return;
            }
            console.log(formatFixReport(report));
        }
    },
    watch: async () => {
        const snapshot = (0, db_1.getLastSnapshot)();
        if (!snapshot) {
            console.log("No system data available.");
            console.log("Run: cwy scan");
            return;
        }
        const { startWatch } = await Promise.resolve().then(() => __importStar(require("../engines/watch/watch")));
        const watcher = startWatch(process.cwd());
        // Handle Ctrl+C gracefully
        process.on("SIGINT", () => {
            watcher.stop();
            process.exit(0);
        });
    },
    ultrawebthinking: async () => {
        console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      ULTRAWEBTHINKING — FILOSOFIA                        ║
║                     Zero Noise · Maximum Clarity · Absolute Efficiency   ║
╚═══════════════════════════════════════════════════════════════════════════╝

🧠 PARIMET THEMELORE:

  1. Minimalizëm i Qëllimshëm
     → Vetëm ajo që është e nevojshme
     → E bardha si bazë, teksti i zi
     → Zero animacione (përveç linewaves)

  2. Qartësi Mbi Kompleksitet
     → Hierarki e qartë informacioni
     → Kontekst i bazuar në tabs
     → Ngjyra vetëm për probleme

  3. Vetëdije për Sistemin
     → Hartë e gjallë e projektit
     → Integrity si prioritet
     → Rrugët "way-to-X"

  4. Offline-First, Zero Cloud
     → Të dhënat janë lokalë
     → Asnjë telemetri
     → Kontrolli i plotë

  5. Etikë në Monetizim
     → 1 ditë provë falas
     → Nudge i butë pas 24h
     → Asnjë bllokadë

🎯 SI TË MENDOSH ULTRA-EFEKTIV:

  • Pyet veten: "A është kjo e nevojshme?"
  • Prioritizo informacionin: Entry points → Problems → Load
  • Menaxho kompleksitetin: Layers → Cycles → Paths
  • Vizualizo me kuptim: Nodes → Edges → Linewaves

🚀 ALGORITMET:

  • Tarjan SCC — Zbulon cycles në O(V + E)
  • BFS Pathfinding — Gjen rrugën më të shkurtër
  • Integrity Checks — Orphans, missing links, conflicts

🎨 LINEWAVE RENDERING:

  • Quiet (load të ulët) → Amplitude 2-5px, frequency 0.5-0.8 Hz
  • Electric (load të lartë) → Amplitude 10-20px, frequency 1.5-2.5 Hz
  • Gap (missing link) → Vijë e kuqe me pika, 12-20px break
  • Conflict (version mismatch) → Vijë me shirita 2-3 ngjyrash

📚 DOKUMENTIMI I PLOTË:

  Lexo ULTRAWEBTHINKING.md për detaje të plota:
  • Shembuj praktikë të rendering
  • Formula të amplitude/frequency/jaggedness
  • Struktura e projektit ultra-efektiv
  • Skenarë të veçantë (quiet, electric, gap, conflict)

╔═══════════════════════════════════════════════════════════════════════════╗
║  "Zero noise, maximum clarity, absolute efficiency."                     ║
║  Ky është rruga për të ndërtuar mjete që i shërbejnë zhvilluesit.       ║
╚═══════════════════════════════════════════════════════════════════════════╝
    `);
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
  ultrawebthinking  Show the ultra-effective philosophy & principles

PHILOSOPHY:
  - Local memory, always
  - No server required
  - Support when ready
  - Mutual respect
  `);
}
async function main() {
    // Verify binary signature on startup (production only)
    const signatureCheck = (0, signing_1.verifyBinarySignature)();
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
    }
    catch (err) {
        console.error("\nOperation could not be completed.");
        console.error("Nothing was changed.");
        if (process.env.CWY_DEBUG) {
            console.error("\nDebug info:", err.message);
        }
        process.exit(1);
    }
    finally {
        (0, db_1.closeDB)();
    }
}
main();
//# sourceMappingURL=cwy.js.map