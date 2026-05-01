"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWatcher = void 0;
exports.startWatch = startWatch;
const fs_1 = require("fs");
const topology_1 = require("../topology/topology");
const cycles_1 = require("../topology/cycles");
const integrity_1 = require("../integrity/integrity");
const score_1 = require("../scoring/score");
class FileWatcher {
    constructor(workspaceRoot, options = {}) {
        this.debounceTimer = null;
        this.scanning = false;
        this.watcher = null;
        this.workspaceRoot = workspaceRoot;
        this.options = {
            debounceMs: 2000,
            ...options,
        };
    }
    start() {
        console.log("👀 Watching workspace for changes...");
        console.log("Press Ctrl+C to stop\n");
        // Initial scan
        this.scan();
        // Watch for file changes
        this.watcher = (0, fs_1.watch)(this.workspaceRoot, { recursive: true }, (eventType, filename) => {
            if (!filename)
                return;
            // Ignore changes in:
            // - node_modules
            // - .git
            // - .cwy (our own database)
            // - dist/build folders
            if (filename.includes("node_modules") ||
                filename.includes(".git") ||
                filename.includes(".cwy") ||
                filename.includes("dist") ||
                filename.includes("build")) {
                return;
            }
            // Ignore non-code files
            if (!filename.endsWith(".ts") &&
                !filename.endsWith(".js") &&
                !filename.endsWith(".tsx") &&
                !filename.endsWith(".jsx") &&
                !filename.endsWith(".py") &&
                !filename.endsWith(".go")) {
                return;
            }
            this.scheduleRescan(filename);
        });
    }
    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        console.log("\n👋 Watch stopped");
    }
    scheduleRescan(filename) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            console.log(`\n📝 Change detected: ${filename}`);
            this.scan();
        }, this.options.debounceMs);
    }
    async scan() {
        if (this.scanning) {
            return;
        }
        this.scanning = true;
        try {
            const startTime = Date.now();
            // Build topology (silent - no progress)
            const { modules, edges } = (0, topology_1.buildTopology)(this.workspaceRoot);
            // Detect cycles
            const cycles = (0, cycles_1.detectCycles)(modules.map((m) => m.id), edges);
            // Check integrity
            const { orphans, missingLinks, conflicts } = (0, integrity_1.checkIntegrity)(modules, edges);
            // Calculate score
            const metrics = {
                modules: modules.length,
                routes: 0,
                depth: 3,
                cycles: cycles.length,
                conflicts: conflicts.length,
                historyDays: 1,
                agents: 0,
                docs: 0,
            };
            const { score } = (0, score_1.evaluateProject)(metrics);
            // Calculate CWY value (simplified)
            const structure = 100 - (orphans.length * 2 + cycles.length * 5 + conflicts.length * 3);
            const connectivity = modules.length > 0 ? ((modules.length - orphans.length) / modules.length) * 100 : 0;
            const cwy = (structure * 0.5 + connectivity * 0.5);
            const elapsed = Date.now() - startTime;
            const result = {
                timestamp: new Date().toISOString(),
                files: modules.length,
                modules: modules.length,
                score: Math.round(score * 10) / 10,
                cwy: Math.round(cwy * 10) / 10,
                orphans: orphans.length,
                cycles: cycles.length,
                conflicts: conflicts.length,
            };
            // Display result
            this.displayResult(result, elapsed);
            // Callback
            if (this.options.onScan) {
                this.options.onScan(result);
            }
        }
        catch (error) {
            if (this.options.onError) {
                this.options.onError(error);
            }
            else {
                console.error("❌ Scan error:", error);
            }
        }
        finally {
            this.scanning = false;
        }
    }
    displayResult(result, elapsed) {
        const time = new Date(result.timestamp).toLocaleTimeString();
        // Clear line and move up
        process.stdout.write("\r\x1b[K");
        // Display compact status
        console.log(`[${time}] cwy = ${result.cwy} | files: ${result.files} | orphans: ${result.orphans} | cycles: ${result.cycles} | (${elapsed}ms)`);
        // Alert on issues
        if (result.orphans > 10) {
            console.log(`\u26A0  High orphan count: ${result.orphans}`);
        }
        if (result.cycles > 0) {
            console.log(`🔄 Cycles detected: ${result.cycles}`);
        }
        if (result.cwy < 50) {
            console.log(`📉 Low CWY value: ${result.cwy}`);
        }
        else if (result.cwy > 80) {
            console.log(`🎉 High CWY value: ${result.cwy}`);
        }
    }
}
exports.FileWatcher = FileWatcher;
function startWatch(workspaceRoot, options) {
    const watcher = new FileWatcher(workspaceRoot, options);
    watcher.start();
    return watcher;
}
//# sourceMappingURL=watch.js.map