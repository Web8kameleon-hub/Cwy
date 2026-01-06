// CWY Local Memory - SQLite backend
// Offline-first, private, no network dependency

import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";

const DB_PATH = path.join(process.cwd(), ".cwy", "memory.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

let db: Database.Database | null = null;

/**
 * Initialize and return the SQLite database.
 * Creates .cwy/ directory and runs schema if needed.
 */
export function getDB(): Database.Database {
  if (db) return db;

  const cwDir = path.dirname(DB_PATH);
  if (!fs.existsSync(cwDir)) {
    fs.mkdirSync(cwDir, { recursive: true });
  }

  const isNew = !fs.existsSync(DB_PATH);
  db = new Database(DB_PATH);

  if (isNew) {
    const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
    db.exec(schema);
    console.log("Initialized .cwy/memory.db");
  }

  return db;
}

/**
 * Close the database connection (called on exit).
 */
export function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Initialize project metadata (called by `cwy init`).
 */
export function initProject(name: string, projectPath: string) {
  const d = getDB();
  d.prepare(
    `INSERT INTO project (name, path, created_at) VALUES (?, ?, ?)`
  ).run(name, projectPath, new Date().toISOString());
}

/**
 * Get current project metadata.
 */
export function getProject() {
  const d = getDB();
  return d.prepare(`SELECT * FROM project LIMIT 1`).get() as
    | {
        id: string;
        name: string;
        path: string;
        created_at: string;
        last_scan_at: string | null;
      }
    | undefined;
}

/**
 * Save a new snapshot (called by `cwy scan`).
 */
export function saveSnapshot(snapshot: any, score: number) {
  const d = getDB();
  const data = JSON.stringify(snapshot); // or CBOR for future

  d.prepare(
    `INSERT INTO snapshots (generated_at, score, modules_count, edges_count, conflicts_count, cycles_count, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    snapshot.generatedAt,
    score,
    snapshot.modules.length,
    snapshot.edges.length,
    snapshot.conflicts.length,
    snapshot.cycles.length,
    data
  );

  // Update project last_scan_at
  d.prepare(`UPDATE project SET last_scan_at = ?`).run(snapshot.generatedAt);
}

/**
 * Get the most recent snapshot.
 */
export function getLastSnapshot(): any | null {
  const d = getDB();
  const row = d
    .prepare(`SELECT data FROM snapshots ORDER BY generated_at DESC LIMIT 1`)
    .get() as { data: string } | undefined;

  return row ? JSON.parse(row.data) : null;
}

/**
 * Get snapshot from N days ago (for "dje vs sot" comparison).
 */
export function getSnapshotDaysAgo(days: number): any | null {
  const d = getDB();
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - days);
  const target = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

  const row = d
    .prepare(
      `SELECT data FROM snapshots
       WHERE DATE(generated_at) = ?
       ORDER BY generated_at DESC LIMIT 1`
    )
    .get(target) as { data: string } | undefined;

  return row ? JSON.parse(row.data) : null;
}

/**
 * Record a contribution (local tracking, no payment processing).
 */
export function recordContribution(amount: number) {
  const d = getDB();
  const id = `contrib_${Date.now()}`;
  d.prepare(
    `INSERT INTO contributions (id, contributed_at, amount) VALUES (?, ?, ?)`
  ).run(id, new Date().toISOString(), amount);
}

/**
 * Get total contributed amount.
 */
export function getTotalContributed(): number {
  const d = getDB();
  const row = d.prepare(`SELECT SUM(amount) as total FROM contributions`).get() as
    | { total: number | null }
    | undefined;
  return row?.total || 0;
}

/**
 * Log an integrity event (tampering, misrepresentation, abuse).
 */
export function logIntegrityEvent(
  eventType: string,
  severity: string,
  details: any
) {
  const d = getDB();
  const id = `event_${Date.now()}`;
  d.prepare(
    `INSERT INTO integrity_events (id, detected_at, event_type, severity, details)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, new Date().toISOString(), eventType, severity, JSON.stringify(details));

  // Increment violation counter
  const current = getSystemState("integrity_violations");
  setSystemState("integrity_violations", String(Number(current) + 1));
}

/**
 * Get system state value.
 */
export function getSystemState(key: string): string {
  const d = getDB();
  const row = d.prepare(`SELECT value FROM system_state WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value || "";
}

/**
 * Set system state value.
 */
export function setSystemState(key: string, value: string) {
  const d = getDB();
  d.prepare(`INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)`).run(
    key,
    value
  );
}
