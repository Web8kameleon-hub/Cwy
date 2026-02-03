"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFixes = applyFixes;
exports.formatApplyResult = formatApplyResult;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function applyFixes(report, workspaceRoot, dryRun = false) {
    const applied = [];
    const errors = [];
    for (const fix of report.fixes) {
        try {
            if (fix.action === "create_doc" && fix.skeleton) {
                const filePath = path_1.default.join(workspaceRoot, fix.target);
                if (fs_1.default.existsSync(filePath)) {
                    errors.push(`${fix.target} already exists - skipping`);
                    continue;
                }
                if (!dryRun) {
                    fs_1.default.writeFileSync(filePath, fix.skeleton, "utf-8");
                }
                applied.push(`Created ${fix.target}`);
            }
            else if (fix.action === "create_stub" && fix.skeleton) {
                // Create stub files in a stubs/ directory to avoid conflicts
                const stubDir = path_1.default.join(workspaceRoot, "cwy-stubs");
                if (!fs_1.default.existsSync(stubDir) && !dryRun) {
                    fs_1.default.mkdirSync(stubDir, { recursive: true });
                }
                const stubFileName = `${fix.target.replace(/[\/\\]/g, "_")}_stub.ts`;
                const stubPath = path_1.default.join(stubDir, stubFileName);
                if (fs_1.default.existsSync(stubPath)) {
                    errors.push(`Stub for ${fix.target} already exists - skipping`);
                    continue;
                }
                if (!dryRun) {
                    fs_1.default.writeFileSync(stubPath, fix.skeleton, "utf-8");
                }
                applied.push(`Created stub: ${stubFileName}`);
            }
            else if (fix.action === "review") {
                // Review actions are manual - just report them
                applied.push(`Review needed: ${fix.target}`);
            }
        }
        catch (err) {
            errors.push(`Failed to apply fix for ${fix.target}: ${err}`);
        }
    }
    return {
        success: errors.length === 0,
        applied,
        errors,
    };
}
function formatApplyResult(result) {
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
        lines.push("  1. Review generated files in cwy-stubs/");
        lines.push("  2. Integrate stubs into your codebase");
        lines.push("  3. Run: cwy scan");
    }
    else {
        lines.push("Some fixes failed - see errors above.");
    }
    return lines.join("\n");
}
//# sourceMappingURL=apply.js.map