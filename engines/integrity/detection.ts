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
 * Check integrity of critical files against local baseline hashes.
 */
function checkBinarySignature(): IntegrityViolation | null {
  const projectRoot = path.join(__dirname, "../..");
  const baselinePath = path.join(projectRoot, ".cwy", "integrity-baseline.json");

  if (!fs.existsSync(baselinePath)) {
    return {
      type: "tampering",
      severity: "medium",
      details: "Integrity baseline missing (.cwy/integrity-baseline.json)",
    };
  }

  try {
    const raw = fs.readFileSync(baselinePath, "utf8");
    const baseline = JSON.parse(raw) as Record<string, string>;
    const criticalFiles = ["package.json", "README.md", "cli/cwy.ts"];

    for (const relPath of criticalFiles) {
      const filePath = path.join(projectRoot, relPath);
      if (!fs.existsSync(filePath)) {
        return {
          type: "tampering",
          severity: "high",
          details: `Critical file missing: ${relPath}`,
        };
      }

      const fileBytes = fs.readFileSync(filePath);
      const digest = crypto.createHash("sha256").update(fileBytes).digest("hex");
      const expected = baseline[relPath];
      if (!expected) {
        return {
          type: "tampering",
          severity: "medium",
          details: `Baseline hash missing for: ${relPath}`,
        };
      }

      if (digest !== expected) {
        return {
          type: "tampering",
          severity: "high",
          details: `Hash mismatch detected for: ${relPath}`,
        };
      }
    }
  } catch (error) {
    return {
      type: "tampering",
      severity: "medium",
      details: `Integrity baseline invalid: ${String(error)}`,
    };
  }

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
