import { watch } from "fs";
import { join } from "path";
import { buildTopology } from "../topology/topology";
import { detectCycles } from "../topology/cycles";
import { checkIntegrity } from "../integrity/integrity";
import { evaluateProject } from "../scoring/score";
import { GraphSnapshot } from "../../schema/types";

export interface WatchOptions {
  debounceMs?: number;
  onScan?: (result: WatchResult) => void;
  onError?: (error: Error) => void;
}

export interface WatchResult {
  timestamp: string;
  files: number;
  modules: number;
  score: number;
  cwy: number;
  orphans: number;
  cycles: number;
  conflicts: number;
}

export class FileWatcher {
  private workspaceRoot: string;
  private options: WatchOptions;
  private debounceTimer: NodeJS.Timeout | null = null;
  private scanning = false;
  private watcher: any = null;

  constructor(workspaceRoot: string, options: WatchOptions = {}) {
    this.workspaceRoot = workspaceRoot;
    this.options = {
      debounceMs: 2000,
      ...options,
    };
  }

  start(): void {
    console.log("👀 Watching workspace for changes...");
    console.log("Press Ctrl+C to stop\n");

    // Initial scan
    this.scan();

    // Watch for file changes
    this.watcher = watch(
      this.workspaceRoot,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;

        // Ignore changes in:
        // - node_modules
        // - .git
        // - .cwy (our own database)
        // - dist/build folders
        if (
          filename.includes("node_modules") ||
          filename.includes(".git") ||
          filename.includes(".cwy") ||
          filename.includes("dist") ||
          filename.includes("build")
        ) {
          return;
        }

        // Ignore non-code files
        if (
          !filename.endsWith(".ts") &&
          !filename.endsWith(".js") &&
          !filename.endsWith(".tsx") &&
          !filename.endsWith(".jsx") &&
          !filename.endsWith(".py") &&
          !filename.endsWith(".go")
        ) {
          return;
        }

        this.scheduleRescan(filename);
      }
    );
  }

  stop(): void {
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

  private scheduleRescan(filename: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      console.log(`\n📝 Change detected: ${filename}`);
      this.scan();
    }, this.options.debounceMs);
  }

  private async scan(): Promise<void> {
    if (this.scanning) {
      return;
    }

    this.scanning = true;

    try {
      const startTime = Date.now();

      // Build topology (silent - no progress)
      const { modules, edges } = buildTopology(this.workspaceRoot);

      // Detect cycles
      const cycles = detectCycles(
        modules.map((m) => m.id),
        edges
      );

      // Check integrity
      const { orphans, missingLinks, conflicts } = checkIntegrity(modules, edges);

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

      const { score } = evaluateProject(metrics);

      // Calculate CWY value (simplified)
      const structure = 100 - (orphans.length * 2 + cycles.length * 5 + conflicts.length * 3);
      const connectivity = modules.length > 0 ? ((modules.length - orphans.length) / modules.length) * 100 : 0;
      const cwy = (structure * 0.5 + connectivity * 0.5);

      const elapsed = Date.now() - startTime;

      const result: WatchResult = {
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
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error as Error);
      } else {
        console.error("❌ Scan error:", error);
      }
    } finally {
      this.scanning = false;
    }
  }

  private displayResult(result: WatchResult, elapsed: number): void {
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
    } else if (result.cwy > 80) {
      console.log(`🎉 High CWY value: ${result.cwy}`);
    }
  }
}

export function startWatch(workspaceRoot: string, options?: WatchOptions): FileWatcher {
  const watcher = new FileWatcher(workspaceRoot, options);
  watcher.start();
  return watcher;
}
