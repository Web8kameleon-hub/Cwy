"use strict";
// CWY Local Memory - SQLite backend
// Offline-first, private, no network dependency
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDB = getDB;
exports.closeDB = closeDB;
exports.initProject = initProject;
exports.getProject = getProject;
exports.saveSnapshot = saveSnapshot;
exports.getLastSnapshot = getLastSnapshot;
exports.getSnapshotDaysAgo = getSnapshotDaysAgo;
exports.recordContribution = recordContribution;
exports.getTotalContributed = getTotalContributed;
exports.logIntegrityEvent = logIntegrityEvent;
exports.getSystemState = getSystemState;
exports.setSystemState = setSystemState;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const DB_PATH = path.join(process.cwd(), ".cwy", "memory.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");
let db = null;
/**
 * Initialize and return the SQLite database.
 * Creates .cwy/ directory and runs schema if needed.
 */
function getDB() {
    if (db)
        return db;
    const cwDir = path.dirname(DB_PATH);
    if (!fs.existsSync(cwDir)) {
        fs.mkdirSync(cwDir, { recursive: true });
    }
    const isNew = !fs.existsSync(DB_PATH);
    db = new better_sqlite3_1.default(DB_PATH);
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
function closeDB() {
    if (db) {
        db.close();
        db = null;
    }
}
/**
 * Initialize project metadata (called by `cwy init`).
 */
function initProject(name, projectPath) {
    const d = getDB();
    d.prepare(`INSERT INTO project (name, path, created_at) VALUES (?, ?, ?)`).run(name, projectPath, new Date().toISOString());
}
/**
 * Get current project metadata.
 */
function getProject() {
    const d = getDB();
    return d.prepare(`SELECT * FROM project LIMIT 1`).get();
}
/**
 * Save a new snapshot (called by `cwy scan`).
 */
function saveSnapshot(snapshot, score) {
    const d = getDB();
    const data = JSON.stringify(snapshot); // or CBOR for future
    d.prepare(`INSERT INTO snapshots (generated_at, score, modules_count, edges_count, conflicts_count, cycles_count, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`).run(snapshot.generatedAt, score, snapshot.modules.length, snapshot.edges.length, snapshot.conflicts.length, snapshot.cycles.length, data);
    // Update project last_scan_at
    d.prepare(`UPDATE project SET last_scan_at = ?`).run(snapshot.generatedAt);
}
/**
 * Get the most recent snapshot.
 */
function getLastSnapshot() {
    const d = getDB();
    const row = d
        .prepare(`SELECT data FROM snapshots ORDER BY generated_at DESC LIMIT 1`)
        .get();
    return row ? JSON.parse(row.data) : null;
}
/**
 * Get snapshot from N days ago (for "dje vs sot" comparison).
 */
function getSnapshotDaysAgo(days) {
    const d = getDB();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    const target = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const row = d
        .prepare(`SELECT data FROM snapshots
       WHERE DATE(generated_at) = ?
       ORDER BY generated_at DESC LIMIT 1`)
        .get(target);
    return row ? JSON.parse(row.data) : null;
}
/**
 * Record a contribution (local tracking, no payment processing).
 */
function recordContribution(amount) {
    const d = getDB();
    const id = `contrib_${Date.now()}`;
    d.prepare(`INSERT INTO contributions (id, contributed_at, amount) VALUES (?, ?, ?)`).run(id, new Date().toISOString(), amount);
}
/**
 * Get total contributed amount.
 */
function getTotalContributed() {
    const d = getDB();
    const row = d.prepare(`SELECT SUM(amount) as total FROM contributions`).get();
    return row?.total || 0;
}
/**
 * Log an integrity event (tampering, misrepresentation, abuse).
 */
function logIntegrityEvent(eventType, severity, details) {
    const d = getDB();
    const id = `event_${Date.now()}`;
    d.prepare(`INSERT INTO integrity_events (id, detected_at, event_type, severity, details)
     VALUES (?, ?, ?, ?, ?)`).run(id, new Date().toISOString(), eventType, severity, JSON.stringify(details));
    // Increment violation counter
    const current = getSystemState("integrity_violations");
    setSystemState("integrity_violations", String(Number(current) + 1));
}
/**
 * Get system state value.
 */
function getSystemState(key) {
    const d = getDB();
    const row = d.prepare(`SELECT value FROM system_state WHERE key = ?`).get(key);
    return row?.value || "";
}
/**
 * Set system state value.
 */
function setSystemState(key, value) {
    const d = getDB();
    d.prepare(`INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)`).run(key, value);
}
//# sourceMappingURL=db.js.map