import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Minimal local memory store (JSON on disk) for CWY; swap to SQLite/LMDB later.
export type CWYMemory = Record<string, unknown>;

const DIR = ".cwy";
const FILE = "memory.json";

function ensureStore(): string {
  const dir = join(process.cwd(), DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir);
  }
  const file = join(dir, FILE);
  if (!existsSync(file)) {
    writeFileSync(file, "{}", "utf8");
  }
  return file;
}

export function loadMemory(): CWYMemory {
  const file = ensureStore();
  const raw = readFileSync(file, "utf8");
  return raw.trim() ? JSON.parse(raw) : {};
}

export function saveMemory(data: CWYMemory): void {
  const file = ensureStore();
  writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}
