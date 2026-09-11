CREATE TABLE IF NOT EXISTS auth_sessions (
  jti TEXT PRIMARY KEY,
  principal_id TEXT NOT NULL,
  principal_type TEXT NOT NULL CHECK (principal_type IN ('staff', 'student')),
  role TEXT NOT NULL,
  username TEXT,
  auth_level TEXT NOT NULL DEFAULT 'password',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_active_expiry
  ON auth_sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_principal_active
  ON auth_sessions (principal_id, last_active_at DESC)
  WHERE revoked_at IS NULL;
