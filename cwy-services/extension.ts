import fs from "fs";
import path from "path";

export interface ExtensionRegistration {
  name: string;
  version: string;
  commandCount: number;
  commands: string[];
  activationEvents: string[];
  healthy: boolean;
}

export function registerExtension(workspaceRoot: string = process.cwd()): ExtensionRegistration {
  const extensionPkgPath = path.join(workspaceRoot, "vscode-extension", "package.json");
  if (!fs.existsSync(extensionPkgPath)) {
    throw new Error("VS Code extension package not found at vscode-extension/package.json");
  }

  const raw = fs.readFileSync(extensionPkgPath, "utf8");
  const pkg = JSON.parse(raw) as {
    name?: string;
    version?: string;
    activationEvents?: string[];
    contributes?: { commands?: Array<{ command?: string }> };
  };

  const commands = (pkg.contributes?.commands || [])
    .map((c) => c.command)
    .filter((c): c is string => Boolean(c));

  return {
    name: pkg.name || "cwy-extension",
    version: pkg.version || "0.0.0",
    commandCount: commands.length,
    commands,
    activationEvents: pkg.activationEvents || [],
    healthy: commands.length > 0,
  };
}
