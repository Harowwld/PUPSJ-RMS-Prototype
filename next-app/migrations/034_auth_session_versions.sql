CREATE TABLE IF NOT EXISTS auth_session_versions (
  principal_id TEXT PRIMARY KEY,
  session_version INTEGER NOT NULL DEFAULT 0 CHECK (session_version >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
