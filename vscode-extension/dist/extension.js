"use strict";
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const overview_1 = require("./panels/overview");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
function activate(context) {
    // Show overview panel
    const showOverview = vscode.commands.registerCommand("cwy.showOverview", async () => {
        const data = await getCWYData();
        overview_1.OverviewPanel.render(context.extensionUri, data);
    });
    // Scan project
    const scan = vscode.commands.registerCommand("cwy.scan", async () => {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "CWY: Scanning project..." }, async () => {
            try {
                await runCWYCommand("scan");
                vscode.window.showInformationMessage("✓ CWY scan complete");
                // Refresh overview if open
                if (overview_1.OverviewPanel.currentPanel) {
                    const data = await getCWYData();
                    overview_1.OverviewPanel.currentPanel.update(data);
                }
            }
            catch (err) {
                vscode.window.showErrorMessage(`CWY scan failed: ${err.message}`);
            }
        });
    });
    // Check integrity
    const integrity = vscode.commands.registerCommand("cwy.integrity", async () => {
        try {
            const result = await runCWYCommand("integrity");
            const channel = vscode.window.createOutputChannel("CWY Integrity");
            channel.clear();
            channel.appendLine(result.stdout);
            channel.show();
        }
        catch (err) {
            vscode.window.showErrorMessage(`CWY integrity check failed: ${err.message}`);
        }
    });
    // Detect fixes
    const fix = vscode.commands.registerCommand("cwy.fix", async () => {
        try {
            const result = await runCWYCommand("fix --json");
            const fixData = JSON.parse(result.stdout);
            if (fixData.fixes.length === 0) {
                vscode.window.showInformationMessage("✓ No fixes needed - system is healthy!");
                return;
            }
            const action = await vscode.window.showInformationMessage(`Found ${fixData.summary.total} issues (${fixData.summary.high} high priority)`, "Apply Fixes", "View Details");
            if (action === "Apply Fixes") {
                await runCWYCommand("fix --apply");
                vscode.window.showInformationMessage("✓ Fixes applied");
            }
            else if (action === "View Details") {
                const channel = vscode.window.createOutputChannel("CWY Fixes");
                channel.clear();
                channel.appendLine(JSON.stringify(fixData, null, 2));
                channel.show();
            }
        }
        catch (err) {
            vscode.window.showErrorMessage(`CWY fix detection failed: ${err.message}`);
        }
    });
    // Refresh overview
    const refresh = vscode.commands.registerCommand("cwy.refresh", async () => {
        if (overview_1.OverviewPanel.currentPanel) {
            const data = await getCWYData();
            overview_1.OverviewPanel.currentPanel.update(data);
        }
        else {
            vscode.window.showInformationMessage("Open CWY Overview first");
        }
    });
    context.subscriptions.push(showOverview, scan, integrity, fix, refresh);
}
function deactivate() {
    // Nothing to clean up
}
async function runCWYCommand(cmd) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error("No workspace folder open");
    }
    const cwd = workspaceFolder.uri.fsPath;
    const cliPath = path.join(cwd, "cli", "cwy.ts");
    // Check if CWY CLI exists
    if (!fs.existsSync(cliPath)) {
        throw new Error("CWY CLI not found in workspace");
    }
    const env = { ...process.env, CWY_DEV_MODE: "1" };
    return await execAsync(`npx ts-node --transpile-only ${cliPath} ${cmd}`, { cwd, env });
}
async function getCWYData() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return null;
    }
    const memoryPath = path.join(workspaceFolder.uri.fsPath, ".cwy", "memory.db");
    // Check if memory.db exists
    if (!fs.existsSync(memoryPath)) {
        return null;
    }
    // Get overview data from CLI
    try {
        const result = await runCWYCommand("overview --json");
        return JSON.parse(result.stdout);
    }
    catch (err) {
        console.error("Failed to get CWY data:", err);
        return null;
    }
}
//# sourceMappingURL=extension.js.map