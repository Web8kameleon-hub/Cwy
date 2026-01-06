import * as vscode from "vscode";
import { OverviewPanel } from "./panels/overview";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
  // Show overview panel
  const showOverview = vscode.commands.registerCommand("cwy.showOverview", async () => {
    const data = await getCWYData();
    OverviewPanel.render(context.extensionUri, data);
  });

  // Scan project
  const scan = vscode.commands.registerCommand("cwy.scan", async () => {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "CWY: Scanning project..." },
      async () => {
        try {
          await runCWYCommand("scan");
          vscode.window.showInformationMessage("✓ CWY scan complete");
          
          // Refresh overview if open
          if (OverviewPanel.currentPanel) {
            const data = await getCWYData();
            OverviewPanel.currentPanel.update(data);
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(`CWY scan failed: ${err.message}`);
        }
      }
    );
  });

  // Check integrity
  const integrity = vscode.commands.registerCommand("cwy.integrity", async () => {
    try {
      const result = await runCWYCommand("integrity");
      const channel = vscode.window.createOutputChannel("CWY Integrity");
      channel.clear();
      channel.appendLine(result.stdout);
      channel.show();
    } catch (err: any) {
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
      
      const action = await vscode.window.showInformationMessage(
        `Found ${fixData.summary.total} issues (${fixData.summary.high} high priority)`,
        "Apply Fixes",
        "View Details"
      );
      
      if (action === "Apply Fixes") {
        await runCWYCommand("fix --apply");
        vscode.window.showInformationMessage("✓ Fixes applied");
      } else if (action === "View Details") {
        const channel = vscode.window.createOutputChannel("CWY Fixes");
        channel.clear();
        channel.appendLine(JSON.stringify(fixData, null, 2));
        channel.show();
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`CWY fix detection failed: ${err.message}`);
    }
  });

  // Refresh overview
  const refresh = vscode.commands.registerCommand("cwy.refresh", async () => {
    if (OverviewPanel.currentPanel) {
      const data = await getCWYData();
      OverviewPanel.currentPanel.update(data);
    } else {
      vscode.window.showInformationMessage("Open CWY Overview first");
    }
  });

  context.subscriptions.push(showOverview, scan, integrity, fix, refresh);
}

export function deactivate() {
  // Nothing to clean up
}

async function runCWYCommand(cmd: string): Promise<{ stdout: string; stderr: string }> {
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

async function getCWYData(): Promise<any> {
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
  } catch (err) {
    console.error("Failed to get CWY data:", err);
    return null;
  }
}
