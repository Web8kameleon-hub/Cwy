"use strict";
// Integrity Detection - Local, deterministic checks for tampering, misrepresentation, abuse
// No spyware. No network calls. Only local signals.
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
exports.checkAbuseAtScale = checkAbuseAtScale;
exports.runIntegrityChecks = runIntegrityChecks;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Check binary signature (simplified for demo - real impl needs signing infra).
 */
function checkBinarySignature() {
    // In production: verify binary checksum/signature against known good hash
    // For now, placeholder that always passes
    // Real implementation would:
    // 1. Compute SHA256 of cwy binary
    // 2. Compare against embedded signature
    // 3. Flag if mismatch
    return null;
}
/**
 * Check for metadata tampering (e.g., LICENSE, package.json, README removed).
 */
function checkMetadata() {
    const projectRoot = path.join(__dirname, "../..");
    const requiredFiles = ["package.json", "README.md"];
    for (const file of requiredFiles) {
        const filePath = path.join(projectRoot, file);
        if (!fs.existsSync(filePath)) {
            return {
                type: "misrepresentation",
                severity: "medium",
                details: `Required file missing: ${file}`,
            };
        }
    }
    // Check if package.json still has correct name/author
    const pkgPath = path.join(projectRoot, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (!pkg.name || !pkg.name.includes("cwy")) {
        return {
            type: "misrepresentation",
            severity: "high",
            details: "package.json name field tampered",
        };
    }
    return null;
}
/**
 * Check for abuse at scale: high ProjectScore + repeated limit bypasses.
 */
function checkAbuseAtScale(score, bypassAttempts) {
    if (score > 50 && bypassAttempts > 5) {
        return {
            type: "abuse_scale",
            severity: "high",
            details: `Large project (score=${score.toFixed(1)}) with ${bypassAttempts} bypass attempts`,
        };
    }
    return null;
}
/**
 * Run all integrity checks.
 */
function runIntegrityChecks(score, bypassAttempts) {
    const violations = [];
    const binaryCheck = checkBinarySignature();
    if (binaryCheck)
        violations.push(binaryCheck);
    const metadataCheck = checkMetadata();
    if (metadataCheck)
        violations.push(metadataCheck);
    const abuseCheck = checkAbuseAtScale(score, bypassAttempts);
    if (abuseCheck)
        violations.push(abuseCheck);
    return {
        passed: violations.length === 0,
        violations,
    };
}
//# sourceMappingURL=detection.js.map