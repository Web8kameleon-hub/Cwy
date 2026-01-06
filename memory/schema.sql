-- CWY Local Memory Schema (SQLite)
-- This is the single source of truth for a project's history, decisions, and state.
-- Offline-first, private, never sent to any server unless user opts in.

-- Project metadata
CREATE TABLE IF NOT EXISTS project (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_scan_at TEXT
);

-- Graph snapshots over time
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generated_at TEXT NOT NULL,
  score REAL,                -- ProjectScore
  modules_count INTEGER,
  edges_count INTEGER,
  conflicts_count INTEGER,
  cycles_count INTEGER,
  data BLOB                  -- JSON or CBOR serialized GraphSnapshot
);

CREATE INDEX IF NOT EXISTS idx_snapshots_time ON snapshots(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_score ON snapshots(score DESC);

-- Contribution tracking (local, no payment processing)
CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contributed_at TEXT NOT NULL,
  amount REAL,               -- user-specified amount (€)
  mode TEXT DEFAULT 'local'  -- 'local' | 'server_sync'
);

CREATE INDEX IF NOT EXISTS idx_contributions_time ON contributions(contributed_at DESC);

-- Integrity events (tampering detection)
CREATE TABLE IF NOT EXISTS integrity_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  detected_at TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- 'tampering' | 'misrepresentation' | 'abuse_scale'
  severity TEXT NOT NULL,    -- 'low' | 'medium' | 'high'
  details TEXT               -- JSON with evidence
);

-- Decisions / Proposals (future learning loop)
CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  proposal_type TEXT NOT NULL,
  target_module TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected'
  outcome TEXT                     -- measured result after acceptance
);

-- System state (current mode, flags)
CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Insert default state
INSERT OR IGNORE INTO system_state (key, value) VALUES ('mode', 'NORMAL');
INSERT OR IGNORE INTO system_state (key, value) VALUES ('last_contribution_reminder', '');
INSERT OR IGNORE INTO system_state (key, value) VALUES ('integrity_violations', '0');
