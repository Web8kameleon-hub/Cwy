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
exports.OverviewPanel = void 0;
const vscode = __importStar(require("vscode"));
class OverviewPanel {
    constructor(panel, extensionUri, data) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.data = data;
    }
    static render(extensionUri, data = null) {
        if (OverviewPanel.currentPanel) {
            OverviewPanel.currentPanel.data = data;
            OverviewPanel.currentPanel.update(data);
            OverviewPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
            return;
        }
        const panel = vscode.window.createWebviewPanel("cwyOverview", "CWY Overview", vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        OverviewPanel.currentPanel = new OverviewPanel(panel, extensionUri, data);
        OverviewPanel.currentPanel.update(data);
        panel.onDidDispose(() => {
            OverviewPanel.currentPanel = undefined;
        });
    }
    update(data = null) {
        if (data) {
            this.data = data;
        }
        this.panel.webview.html = this.getHtml();
    }
    getHtml() {
        const csp = [
            "default-src 'none'",
            "img-src data:",
            "style-src 'unsafe-inline'",
            "script-src 'none'",
        ].join("; ");
        const waves = `
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true" class="waves">
        <path d="M0,0 C150,60 350,-40 600,30 C850,100 1050,10 1200,50 L1200,0 L0,0 Z" />
      </svg>`;
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CWY Overview</title>
  <style>
    :root {
      --bg: #ffffff;
      --fg: #0f172a;
      --accent: #0ea5e9;
      --muted: #64748b;
      --card: #f8fafc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 24px 24px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .title {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: var(--muted);
      font-size: 14px;
    }
    .pill {
      background: #e0f2fe;
      color: #0c4a6e;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    main {
      padding: 0 24px 24px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .card {
      background: var(--card);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
    }
    .label {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 11px;
      color: var(--muted);
      font-weight: 700;
    }
    .value {
      font-size: 28px;
      font-weight: 700;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .value small {
      font-size: 13px;
      color: var(--muted);
      font-weight: 500;
    }
    .waves {
      position: absolute;
      inset: auto 0 -1px 0;
      width: 100%;
      height: 68px;
      fill: rgba(14, 165, 233, 0.16);
      pointer-events: none;
    }
    .signals {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .signal-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 6px rgba(14, 165, 233, 0.12);
      animation: pulse 2.4s ease-in-out infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.6; }
      100% { transform: scale(1); opacity: 1; }
    }
  </style>
</head>
<body>
  <header>
    <div class="title">
      <div class="pill">CWY</div>
      <h1>Overview</h1>
      <div class="subtitle">White background · Black text · Waves · Signals · CWY score</div>
    </div>
    ${waves}
  </header>
  <main>
    <section class="card">
      <div class="label">CWY Score</div>
      <div class="value">${this.data?.value?.cwy?.toFixed(1) || 0}<small>/100</small></div>
    </section>
    <section class="card">
      <div class="label">Modules</div>
      <div class="value">${this.data?.system?.modules || 0}<small>files</small></div>
    </section>
    <section class="card">
      <div class="label">Structure</div>
      <div class="value">${this.data?.value?.structure?.toFixed(0) || 0}<small>/100</small></div>
    </section>
    <section class="card">
      <div class="label">Connectivity</div>
      <div class="value">${this.data?.value?.connectivity?.toFixed(0) || 0}<small>/100</small></div>
    </section>
    <section class="card">
      <div class="label">Orphans</div>
      <div class="value">${this.data?.integrity?.orphans || 0}</div>
    </section>
    <section class="card">
      <div class="label">Cycles</div>
      <div class="value">${this.data?.integrity?.cycles || 0}</div>
    </section>
    <section class="card">
      <div class="label">Signals</div>
      <div class="signals">
        ${this.data?.signals?.length > 0 ? this.data.signals.map((_, i) => `<span class="signal-dot" aria-hidden="true" style="animation-delay: ${i * 0.4}s"></span>`).join('') : '<span class="signal-dot" aria-hidden="true"></span>'}
      </div>
      <div class="subtitle">${this.data?.signals?.length || 0} active</div>
    </section>
    <section class="card">
      <div class="label">Status</div>
      <div class="value">
        ${this.data ? 'OK' : '<span style="color: #dc2626">No Data</span>'}
        <small>${this.data ? 'live' : 'run scan first'}</small>
      </div>
    </section>
  </main>
</body>
</html>`;
    }
}
exports.OverviewPanel = OverviewPanel;
//# sourceMappingURL=overview.js.map