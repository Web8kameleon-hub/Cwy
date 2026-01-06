// Integrity Detection - Local, deterministic checks for tampering, misrepresentation, abuse
// No spyware. No network calls. Only local signals.

import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";

export interface IntegrityCheck {
  passed: boolean;
  violations: IntegrityViolation[];
}

export interface IntegrityViolation {
  type: "tampering" | "misrepresentation" | "abuse_scale";
  severity: "low" | "medium" | "high";
  details: string;
}

/**
 * Check binary signature (simplified for demo - real impl needs signing infra).
 */
function checkBinarySignature(): IntegrityViolation | null {
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
function checkMetadata(): IntegrityViolation | null {
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
export function checkAbuseAtScale(
  score: number,
  bypassAttempts: number
): IntegrityViolation | null {
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
export function runIntegrityChecks(
  score: number,
  bypassAttempts: number
): IntegrityCheck {
  const violations: IntegrityViolation[] = [];

  const binaryCheck = checkBinarySignature();
  if (binaryCheck) violations.push(binaryCheck);

  const metadataCheck = checkMetadata();
  if (metadataCheck) violations.push(metadataCheck);

  const abuseCheck = checkAbuseAtScale(score, bypassAttempts);
  if (abuseCheck) violations.push(abuseCheck);

  return {
    passed: violations.length === 0,
    violations,
  };
}
