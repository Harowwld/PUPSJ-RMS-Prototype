CREATE TABLE IF NOT EXISTS auth_session_revocations (
  jti TEXT PRIMARY KEY,
  principal_id TEXT,
  reason TEXT NOT NULL DEFAULT 'revoked',
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_session_revocations_revoked_at
  ON auth_session_revocations(revoked_at DESC);
