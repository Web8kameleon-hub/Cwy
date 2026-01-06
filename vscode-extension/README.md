# CWY VS Code Extension

**Offline-first system mapping directly in VS Code**

## 🚀 Features

- ✅ **Overview Panel** - Visual dashboard with CWY score, modules, structure, connectivity
- ✅ **Scan Command** - Run `cwy scan` from Command Palette
- ✅ **Integrity Check** - View orphans, cycles, conflicts
- ✅ **Fix Detection** - Detect and apply structural fixes
- ✅ **Live Refresh** - Update overview with latest scan data

## 📦 Installation (Development)

### 1. Compile Extension

```bash
cd vscode-extension
npm install
npm run compile
```

### 2. Test in VS Code

1. Open this folder in VS Code
2. Press `F5` to launch Extension Development Host
3. In the new window, open Command Palette (`Ctrl+Shift+P`)
4. Run: **CWY: Show Overview**

## 🎯 Commands

| Command | Description |
|---------|-------------|
| `CWY: Show Overview` | Open visual dashboard |
| `CWY: Scan Project` | Run full project scan |
| `CWY: Check Integrity` | View integrity report |
| `CWY: Detect Fixes` | Find structural issues |
| `CWY: Refresh Overview` | Update dashboard data |

## 🎨 Design

**Philosophy:** White background, black text, electric linewaves, signals

- **CWY Score** - Overall system health (0-100)
- **Structure** - Orphans, cycles, conflicts impact
- **Connectivity** - Module reachability
- **Signals** - Live indicators (animated dots)
- **Waves** - SVG visualization (amplitude based on load)

## 🔧 Development

### Watch Mode

```bash
npm run watch
```

### Package Extension

```bash
npx vsce package
```

This creates `cwy-0.0.1.vsix` that can be installed in VS Code.

## 📋 Requirements

- VS Code 1.85.0 or higher
- Node.js 18+ (for ts-node)
- CWY CLI in workspace root

## 🏗️ Architecture

```
vscode-extension/
├─ src/
│  ├─ extension.ts       # Activation, commands
│  └─ panels/
│     └─ overview.ts     # Webview panel
├─ dist/                 # Compiled JS
├─ package.json          # Extension manifest
└─ tsconfig.json         # TypeScript config
```

### Integration with CWY CLI

Extension runs CLI commands via `ts-node`:

```typescript
npx ts-node --transpile-only cli/cwy.ts scan
npx ts-node --transpile-only cli/cwy.ts overview --json
npx ts-node --transpile-only cli/cwy.ts fix --json
```

Data flows: **CLI → JSON → Extension → Webview**

## 🚀 Publishing

1. Create publisher account: https://marketplace.visualstudio.com/manage
2. Get Personal Access Token
3. Package and publish:

```bash
npx vsce login <publisher>
npx vsce publish
```

## 📝 License

See parent project LICENSE.md (closed-core, ethical monetization)

---

**CWY = offline-first system mapping**  
*Shows, doesn't decide*
