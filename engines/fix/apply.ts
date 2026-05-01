import { Fix, FixReport } from "./detect";
import fs from "fs";
import path from "path";

export interface ApplyResult {
  success: boolean;
  applied: string[];
  errors: string[];
}

export function applyFixes(report: FixReport, workspaceRoot: string, dryRun: boolean = false): ApplyResult {
  const applied: string[] = [];
  const errors: string[] = [];

  for (const fix of report.fixes) {
    try {
      if (fix.action === "create_doc" && fix.skeleton) {
        const filePath = path.join(workspaceRoot, fix.target);
        
        if (fs.existsSync(filePath)) {
          errors.push(`${fix.target} already exists - skipping`);
          continue;
        }

        if (!dryRun) {
          fs.writeFileSync(filePath, fix.skeleton, "utf-8");
        }
        applied.push(`Created ${fix.target}`);
      } else if (fix.action === "review") {
        // Review actions are manual - just report them
        applied.push(`Review needed: ${fix.target}`);
      }
    } catch (err) {
      errors.push(`Failed to apply fix for ${fix.target}: ${err}`);
    }
  }

  return {
    success: errors.length === 0,
    applied,
    errors,
  };
}

export function formatApplyResult(result: ApplyResult): string {
  const lines = ["FIX APPLICATION RESULT\n"];

  if (result.applied.length > 0) {
    lines.push("Applied:");
    result.applied.forEach((a) => {
      lines.push(`  \u2713 ${a}`);
    });
    lines.push("");
  }

  if (result.errors.length > 0) {
    lines.push("Errors:");
    result.errors.forEach((e) => {
      lines.push(`  \u2717 ${e}`);
    });
    lines.push("");
  }

  if (result.success) {
    lines.push("All fixes applied successfully!");
    lines.push("\nNext steps:");
    lines.push("  1. Implement real services/routes for all 'Review needed' items");
    lines.push("  2. Remove or replace any existing stub modules");
    lines.push("  3. Run: cwy scan");
  } else {
    lines.push("Some fixes failed - see errors above.");
  }

  return lines.join("\n");
}
