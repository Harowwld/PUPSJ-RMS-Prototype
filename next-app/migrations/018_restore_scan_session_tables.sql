-- Restore the legacy scanner pairing tables in PostgreSQL.
-- These tables are intentionally global because scan sessions belong to staff
-- accounts, while uploaded files remain in LOCAL_DATA_DIR.

CREATE TABLE IF NOT EXISTS scan_sessions (
  id BIGSERIAL PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending',
  pair_token_hash TEXT,
  token_expires_at TIMESTAMPTZ,
  paired_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  phone_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_sessions_staff_created
  ON scan_sessions(staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_sessions_token_hash
  ON scan_sessions(pair_token_hash);

CREATE TABLE IF NOT EXISTS scan_session_incoming (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
  client_ref TEXT,
  storage_filename TEXT,
  filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_session_incoming_session_created
  ON scan_session_incoming(session_id, created_at DESC);
