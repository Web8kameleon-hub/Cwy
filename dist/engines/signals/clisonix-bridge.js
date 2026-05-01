"use strict";
/**
 * CWY ↔ Clisonix Signals Bridge
 *
 * Pulls live data from all 6 Clisonix AGI components and maps them
 * into CWY WaveParams so the linewave reflects real platform state.
 *
 * Components:
 *  Ocean Core    → :7000
 *  ASI Agents    → :7100
 *  AI V2         → :7200
 *  EuroWeb AGI   → :7300
 *  Labors        → :7400
 *  Nin Engine    → :7500  (emotional intelligence + code quality)
 *  Orchestrator  → :8000
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchClisonixSignals = fetchClisonixSignals;
exports.printClisonixSignals = printClisonixSignals;
const linewave_1 = require("./linewave");
// Allow override via env (useful for remote / tunneled setups)
const BASE = process.env.CLISONIX_BASE_URL ?? "http://localhost";
const COMPONENTS = [
    { name: "Ocean Core", port: 7000, healthPath: "/health" },
    { name: "ASI Agents", port: 7100, healthPath: "/health" },
    { name: "AI V2", port: 7200, healthPath: "/health" },
    { name: "EuroWeb AGI", port: 7300, healthPath: "/health" },
    { name: "Labors", port: 7400, healthPath: "/health" },
    { name: "Nin Engine", port: 7500, healthPath: "/api/v1/nin/current" },
    { name: "Orchestrator", port: 8000, healthPath: "/health" },
];
const TIMEOUT_MS = 2500;
async function fetchComponent(c) {
    const url = `${BASE}:${c.port}${c.healthPath}`;
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        const latencyMs = Date.now() - start;
        let meta;
        try {
            meta = await res.json();
        }
        catch { /* non-json health endpoints */ }
        return { ...c, online: res.ok, latencyMs, meta };
    }
    catch {
        return { ...c, online: false, latencyMs: Date.now() - start };
    }
}
function parseNin(component) {
    if (!component.online || !component.meta)
        return null;
    const m = component.meta;
    return {
        emotion: m.emotion ?? "unknown",
        intensity: m.intensity ?? 0,
        systemHealth: m.system_health ?? 0,
        codeQuality: m.code_quality ?? 0,
        activityLevel: m.activity_level ?? 0,
        reason: m.reason ?? "",
    };
}
/**
 * Fetch all Clisonix components in parallel and return aggregated CWY signals.
 */
async function fetchClisonixSignals() {
    const results = await Promise.all(COMPONENTS.map(fetchComponent));
    const onlineCount = results.filter(c => c.online).length;
    const aggregateHealth = onlineCount / results.length;
    const errorRate = 1 - aggregateHealth;
    const ninComponent = results.find(c => c.name === "Nin Engine");
    const nin = ninComponent ? parseNin(ninComponent) : null;
    // Build EdgeSignals for the wave renderer
    // load = aggregate health (more online → more activity)
    // error_rate = fraction offline
    const edgeSignals = {
        load: nin?.activityLevel ?? aggregateHealth,
        error_rate: errorRate,
    };
    const waveParams = (0, linewave_1.computeWaveParams)(edgeSignals);
    return {
        components: results,
        nin,
        aggregateHealth,
        errorRate,
        waveParams,
        fetchedAt: new Date().toISOString(),
    };
}
/**
 * Print a human-readable signals report to stdout.
 * Called by: cwy signals --source=clisonix
 */
async function printClisonixSignals() {
    console.log("\n⚡  CWY SIGNALS — Clisonix AGI Platform\n");
    const signals = await fetchClisonixSignals();
    for (const c of signals.components) {
        const status = c.online ? "✅ ONLINE " : "❌ OFFLINE";
        const lat = c.latencyMs !== undefined ? `${c.latencyMs}ms` : "—";
        console.log(`  ${status}  ${c.name.padEnd(16)} [port ${c.port}]  latency: ${lat}`);
    }
    console.log(`\n  Aggregate Health : ${(signals.aggregateHealth * 100).toFixed(0)}%`);
    console.log(`  Error Rate       : ${(signals.errorRate * 100).toFixed(0)}%`);
    if (signals.nin) {
        const n = signals.nin;
        console.log(`\n  💓 Nin Engine`);
        console.log(`     Emotion      : ${n.emotion}  (intensity ${(n.intensity * 100).toFixed(0)}%)`);
        console.log(`     System Health: ${(n.systemHealth * 100).toFixed(0)}%`);
        console.log(`     Code Quality : ${(n.codeQuality * 100).toFixed(0)}%`);
        console.log(`     Activity     : ${(n.activityLevel * 100).toFixed(0)}%`);
        console.log(`     Reason       : ${n.reason}`);
    }
    console.log(`\n  🌊 WaveParams  amplitude=${signals.waveParams.amplitude.toFixed(2)}  freq=${signals.waveParams.frequency.toFixed(2)}  jaggedness=${signals.waveParams.jaggedness.toFixed(2)}`);
    console.log(`\n  Fetched: ${signals.fetchedAt}\n`);
}
//# sourceMappingURL=clisonix-bridge.js.map