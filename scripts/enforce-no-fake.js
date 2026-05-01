#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const allowlist = loadAllowlist();

const targets = [
  'cli',
  'engines',
  'memory',
  'schema',
  'landing-page.html',
  'developers.html',
];

const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.cwy']);
const allowedExtensions = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.html', '.json']);

const bannedPatterns = [
  { label: 'fake', regex: /\bfake\b/i },
  { label: 'mock', regex: /\bmock\b/i },
  { label: 'placeholder', regex: /\bplaceholder\b/i },
  { label: 'coming soon', regex: /coming\s+soon/i },
  { label: 'not implemented', regex: /not\s+implemented/i },
  { label: 'demo user', regex: /demo\s+user/i },
];

// Strict contract tokens for runtime endpoints and API responses.
const contractTokenPatterns = [
  { label: 'demo session token', regex: /sess_[a-z0-9_]*demo/i },
  { label: 'demo license key', regex: /CWY-(PRO|ENTERPRISE)-LIFETIME-ABC123/i },
  { label: 'demo account value', regex: /\bdemo\b/i },
  { label: 'dummy data value', regex: /\bdummy\b/i },
  { label: 'test identity value', regex: /test@example\.com|demo@example\.com/i },
];

const endpointContextPattern = /app\.(get|post|put|patch|delete)|router\.(get|post|put|patch|delete)|res\.json|return\s*\{|\/api\/|webhook|authorization|bearer/i;

const violations = [];

for (const target of targets) {
  const fullTarget = path.join(root, target);
  if (!fs.existsSync(fullTarget)) {
    continue;
  }

  const stat = fs.statSync(fullTarget);
  if (stat.isDirectory()) {
    walk(fullTarget);
  } else {
    scanFile(fullTarget);
  }
}

if (violations.length > 0) {
  console.error('NO-FAKE POLICY VIOLATION(S) FOUND:\n');
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line} [${v.label}] ${v.text}`);
  }
  console.error('\nPolicy: do not ship fake/mock/placeholder data or behavior in production modules.');
  process.exit(1);
}

console.log('No-fake policy check passed.');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) {
        continue;
      }
      walk(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      continue;
    }

    scanFile(fullPath);
  }
}

function scanFile(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const inTests = isTestPath(rel);
  const runtimeContractScope = isRuntimeContractScope(rel);

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    const allowed = isAllowlisted(rel, line);

    for (const pattern of bannedPatterns) {
      if (pattern.regex.test(line)) {
        if (inTests || allowed) {
          break;
        }

        violations.push({
          file: rel,
          line: lineNumber,
          label: pattern.label,
          text: line.trim().slice(0, 180),
        });
        break;
      }
    }

    if (!runtimeContractScope || inTests) {
      return;
    }

    const contextWindow = [lines[idx] || '', lines[idx + 1] || '', lines[idx + 2] || ''].join(' ');
    if (!endpointContextPattern.test(contextWindow)) {
      return;
    }

    for (const token of contractTokenPatterns) {
      if (token.regex.test(contextWindow)) {
        if (isAllowlisted(rel, contextWindow)) {
          break;
        }

        violations.push({
          file: rel,
          line: lineNumber,
          label: `contract/${token.label}`,
          text: contextWindow.trim().slice(0, 180),
        });
        break;
      }
    }
  });
}

function isRuntimeContractScope(relPath) {
  return (
    relPath.startsWith('cli/') ||
    relPath.startsWith('engines/') ||
    relPath.startsWith('memory/') ||
    relPath.startsWith('schema/')
  );
}

function isTestPath(relPath) {
  return /(^|\/)(test|tests|__tests__|spec|specs|fixtures?|mocks?)(\/|$)/i.test(relPath);
}

function loadAllowlist() {
  const allowlistPath = path.join(root, '.no-fake-allowlist.json');
  if (!fs.existsSync(allowlistPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(allowlistPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry) => entry && typeof entry === 'object');
  } catch {
    return [];
  }
}

function isAllowlisted(relPath, text) {
  for (const entry of allowlist) {
    const pathPattern = typeof entry.pathPattern === 'string' ? entry.pathPattern : null;
    const tokenPattern = typeof entry.pattern === 'string' ? entry.pattern : null;
    const expiresAt = typeof entry.expiresAt === 'string' ? entry.expiresAt : null;

    if (!pathPattern || !tokenPattern) {
      continue;
    }

    if (expiresAt) {
      const exp = Date.parse(expiresAt);
      if (!Number.isNaN(exp) && Date.now() > exp) {
        continue;
      }
    }

    const pathRegex = globToRegex(pathPattern);
    const tokenRegex = new RegExp(tokenPattern, 'i');

    if (pathRegex.test(relPath) && tokenRegex.test(text)) {
      return true;
    }
  }

  return false;
}

function globToRegex(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexSource = '^' + escaped.replace(/\*/g, '.*') + '$';
  return new RegExp(regexSource);
}
