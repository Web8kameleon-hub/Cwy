"use strict";
// Degrade Modes - CWY's technical response to project size and integrity violations
// Modes: NORMAL → ADAPTIVE_LIMIT → SILENT_DEGRADE → INTEGRITY → RESET
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineMode = determineMode;
exports.getModeConfig = getModeConfig;
exports.isOperationAllowed = isOperationAllowed;
/**
 * Determine system mode based on score, contribution, and integrity.
 */
function determineMode(score, totalContributed, integrityViolations) {
    // MODE 3: INTEGRITY (highest priority)
    if (integrityViolations >= 3) {
        return "INTEGRITY";
    }
    // MODE 2: SILENT_DEGRADE (integrity concerns)
    if (integrityViolations >= 1) {
        return "SILENT_DEGRADE";
    }
    // MODE 1: ADAPTIVE_LIMIT (large project, no contribution)
    if (score >= 20 && totalContributed === 0) {
        return "ADAPTIVE_LIMIT";
    }
    // MODE 0: NORMAL
    return "NORMAL";
}
/**
 * Get configuration for a given mode.
 */
function getModeConfig(mode) {
    switch (mode) {
        case "NORMAL":
            return {
                mode: "NORMAL",
                allowScan: true,
                allowHistory: true,
                historyDays: 365,
                allowLiveMetrics: true,
                allowProposals: true,
                allowExport: true,
                message: "",
            };
        case "ADAPTIVE_LIMIT":
            return {
                mode: "ADAPTIVE_LIMIT",
                allowScan: true,
                allowHistory: true,
                historyDays: 30,
                allowLiveMetrics: true, // but sampled
                allowProposals: true, // but basic
                allowExport: true,
                message: `This system is becoming complex.
CWY adapts to remain sustainable.
Core functionality remains available.`,
            };
        case "SILENT_DEGRADE":
            return {
                mode: "SILENT_DEGRADE",
                allowScan: true,
                allowHistory: true,
                historyDays: 7,
                allowLiveMetrics: false,
                allowProposals: false,
                allowExport: true,
                message: `CWY detected incompatible usage patterns.
Basic functionality remains available.`,
            };
        case "INTEGRITY":
            return {
                mode: "INTEGRITY",
                allowScan: false,
                allowHistory: true,
                historyDays: 7,
                allowLiveMetrics: false,
                allowProposals: false,
                allowExport: false,
                message: `CWY is in integrity mode.
This protects the project and its contributors.`,
            };
        case "RESET":
            return {
                mode: "RESET",
                allowScan: true,
                allowHistory: false,
                historyDays: 0,
                allowLiveMetrics: false,
                allowProposals: false,
                allowExport: true,
                message: `Memory reset. CWY starts fresh.`,
            };
    }
}
/**
 * Check if an operation is allowed in current mode.
 */
function isOperationAllowed(mode, operation) {
    const config = getModeConfig(mode);
    switch (operation) {
        case "scan":
            return config.allowScan;
        case "history":
            return config.allowHistory;
        case "metrics":
            return config.allowLiveMetrics;
        case "proposals":
            return config.allowProposals;
        case "export":
            return config.allowExport;
    }
}
//# sourceMappingURL=modes.js.map