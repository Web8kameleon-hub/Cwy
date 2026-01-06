"use strict";
// CWY Overview - Complete system snapshot
// This is the contract between CLI and UI (chart + Postman view)
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOverview = generateOverview;
exports.formatOverview = formatOverview;
const integrity_1 = require("../integrity/integrity");
/**
 * Generate complete system overview
 * This is the single source of truth for UI rendering
 */
function generateOverview(snapshot) {
    const { orphans, missingLinks, conflicts } = (0, integrity_1.checkIntegrity)(snapshot.modules, snapshot.edges);
    // Calculate value components
    const structure = calculateStructure(snapshot);
    const connectivity = calculateConnectivity(snapshot);
    const load = calculateLoad(snapshot);
    const intelligence = calculateIntelligence(snapshot);
    const docs = calculateDocs(snapshot);
    const langComplexity = calculateLanguageComplexity(snapshot);
    const stability = calculateStability(snapshot);
    // Weighted CWY value
    const cwyValue = 0.25 * structure +
        0.2 * connectivity +
        0.15 * load +
        0.1 * intelligence +
        0.1 * docs +
        0.1 * langComplexity +
        0.1 * stability;
    // Language stats (placeholder - would come from enhanced scan)
    const languages = detectLanguages(snapshot);
    // Docs detection (placeholder - would come from enhanced scan)
    const docsInfo = detectDocs(snapshot);
    // Intelligence detection (placeholder - would come from enhanced scan)
    const intelInfo = detectIntelligence(snapshot);
    // Generate signals
    const signals = generateSignals(snapshot, {
        orphans: orphans.length,
        cycles: snapshot.cycles.length,
        conflicts: conflicts.length,
    });
    return {
        value: {
            cwy: Math.round(cwyValue * 100) / 100,
            components: {
                structure: Math.round(structure),
                connectivity: Math.round(connectivity),
                load: Math.round(load),
                intelligence: Math.round(intelligence),
                docs: Math.round(docs),
                language_complexity: Math.round(langComplexity),
                stability: Math.round(stability),
            },
        },
        system: {
            core: 1,
            nodes: snapshot.modules.length,
            modules: snapshot.modules.length,
            files: snapshot.modules.length, // Placeholder - would come from enhanced scan
        },
        languages,
        docs: docsInfo,
        intelligence: intelInfo,
        integrity: {
            orphans: orphans.length,
            cycles: snapshot.cycles.length,
            unreachable: missingLinks.length,
            conflicts: conflicts.length,
        },
        signals,
    };
}
function calculateStructure(snapshot) {
    const { orphans, missingLinks, conflicts } = (0, integrity_1.checkIntegrity)(snapshot.modules, snapshot.edges);
    let score = 100;
    score -= orphans.length * 2;
    score -= snapshot.cycles.length * 5;
    score -= missingLinks.length * 1;
    score -= conflicts.length * 3;
    return Math.max(0, Math.min(100, score));
}
function calculateConnectivity(snapshot) {
    if (snapshot.modules.length === 0)
        return 100;
    const { missingLinks } = (0, integrity_1.checkIntegrity)(snapshot.modules, snapshot.edges);
    const reachable = snapshot.modules.length - missingLinks.length;
    return (reachable / snapshot.modules.length) * 100;
}
function calculateLoad(snapshot) {
    // Based on edges per module ratio
    const avgEdges = snapshot.edges.length / Math.max(1, snapshot.modules.length);
    // Normalize: 0-2 edges per module = low load (80-100)
    // 2-5 = medium (50-80), 5+ = high (20-50)
    if (avgEdges < 2)
        return 80 + (2 - avgEdges) * 10;
    if (avgEdges < 5)
        return 50 + (5 - avgEdges) * 10;
    return Math.max(20, 50 - (avgEdges - 5) * 5);
}
function calculateIntelligence(snapshot) {
    // Placeholder - would detect agents/prompts/policies from scan
    return 40; // Neutral default
}
function calculateDocs(snapshot) {
    // Placeholder - would detect README/OpenAPI/docs/ from scan
    return 40; // Neutral default
}
function calculateLanguageComplexity(snapshot) {
    // Placeholder - would count distinct languages from scan
    const languages = 1; // Assume TypeScript only for now
    return Math.max(60, 100 - (languages - 1) * 10);
}
function calculateStability(snapshot) {
    // Placeholder - would compare with previous snapshot
    return 70; // Neutral default
}
function detectLanguages(snapshot) {
    // Placeholder - would come from enhanced file scanner
    const languages = {};
    snapshot.modules.forEach((m) => {
        const ext = m.path.split(".").pop()?.toLowerCase();
        let lang = "Unknown";
        if (ext === "ts" || ext === "tsx")
            lang = "TypeScript";
        else if (ext === "js" || ext === "jsx")
            lang = "JavaScript";
        else if (ext === "py")
            lang = "Python";
        else if (ext === "go")
            lang = "Go";
        else if (ext === "rs")
            lang = "Rust";
        else if (ext === "java")
            lang = "Java";
        languages[lang] = (languages[lang] || 0) + 1;
    });
    return languages;
}
function detectDocs(snapshot) {
    // Placeholder - would come from enhanced scan
    const hasReadme = snapshot.modules.some((m) => m.path.toLowerCase().includes("readme"));
    const openApiCount = snapshot.modules.filter((m) => m.path.toLowerCase().includes("openapi")).length;
    const hasDocsDir = snapshot.modules.some((m) => m.path.includes("docs/"));
    return {
        readme: hasReadme,
        openapi: openApiCount,
        docs_dir: hasDocsDir,
    };
}
function detectIntelligence(snapshot) {
    // Placeholder - would detect AI artifacts from scan
    const agents = snapshot.modules.filter((m) => m.path.toLowerCase().includes("agent")).length;
    const prompts = snapshot.modules.filter((m) => m.path.toLowerCase().includes("prompt")).length;
    const policies = snapshot.modules.filter((m) => m.path.toLowerCase().includes("polic")).length;
    return { agents, prompts, policies };
}
function generateSignals(snapshot, integrity) {
    const signals = [];
    if (integrity.cycles > 0) {
        signals.push({
            type: "cycle_detected",
            severity: "high",
            detail: `${integrity.cycles} cycles detected in module graph`,
        });
    }
    if (integrity.orphans > 0) {
        signals.push({
            type: "orphan_module",
            severity: "medium",
            detail: `${integrity.orphans} modules not reachable from entry points`,
        });
    }
    if (integrity.conflicts > 0) {
        signals.push({
            type: "package_conflict",
            severity: "medium",
            detail: `${integrity.conflicts} package version conflicts`,
        });
    }
    // Add more signals based on detection
    const languages = detectLanguages(snapshot);
    if (Object.keys(languages).length >= 3) {
        signals.push({
            type: "language_spread",
            severity: "low",
            detail: `${Object.keys(languages).length} languages detected`,
        });
    }
    const docs = detectDocs(snapshot);
    if (!docs.readme) {
        signals.push({
            type: "docs_missing",
            severity: "low",
            detail: "README not found",
        });
    }
    return signals;
}
/**
 * Format overview as human-readable text
 */
function formatOverview(data) {
    const lines = [];
    lines.push("CWY OVERVIEW\n");
    lines.push("Value:");
    lines.push(`  cwy = ${data.value.cwy}\n`);
    lines.push("Waves:");
    lines.push(`  Structure      ${data.value.components.structure}`);
    lines.push(`  Connectivity   ${data.value.components.connectivity}`);
    lines.push(`  Load           ${data.value.components.load}`);
    lines.push(`  Intelligence   ${data.value.components.intelligence}`);
    lines.push(`  Docs           ${data.value.components.docs}`);
    lines.push(`  LangComplex    ${data.value.components.language_complexity}`);
    lines.push(`  Stability      ${data.value.components.stability}\n`);
    lines.push("System:");
    lines.push(`  Core: ${data.system.core}`);
    lines.push(`  Nodes: ${data.system.nodes}`);
    lines.push(`  Modules: ${data.system.modules}`);
    lines.push(`  Files: ${data.system.files}\n`);
    if (Object.keys(data.languages).length > 0) {
        lines.push("Scripts / Languages:");
        Object.entries(data.languages)
            .sort((a, b) => b[1] - a[1])
            .forEach(([lang, count]) => {
            lines.push(`  ${lang}: ${count}`);
        });
        lines.push("");
    }
    lines.push("Docs:");
    lines.push(`  README: ${data.docs.readme ? "present" : "missing"}`);
    lines.push(`  OpenAPI: ${data.docs.openapi}`);
    lines.push(`  docs/: ${data.docs.docs_dir ? "present" : "missing"}\n`);
    lines.push("Intelligence:");
    lines.push(`  Agents: ${data.intelligence.agents}`);
    lines.push(`  Prompts: ${data.intelligence.prompts}`);
    lines.push(`  Policies: ${data.intelligence.policies}\n`);
    lines.push("Integrity:");
    lines.push(`  Orphans: ${data.integrity.orphans}`);
    lines.push(`  Cycles: ${data.integrity.cycles}`);
    lines.push(`  Unreachable: ${data.integrity.unreachable}`);
    lines.push(`  Conflicts: ${data.integrity.conflicts}\n`);
    if (data.signals.length > 0) {
        lines.push("Signals:");
        data.signals.forEach((sig) => {
            lines.push(`  ${sig.type} (${sig.severity})`);
            if (sig.detail)
                lines.push(`    ${sig.detail}`);
        });
    }
    else {
        lines.push("Signals: none");
    }
    return lines.join("\n");
}
//# sourceMappingURL=overview.js.map