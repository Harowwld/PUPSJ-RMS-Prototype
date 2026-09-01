CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  endpoint_type TEXT NOT NULL,
  identifier TEXT NOT NULL DEFAULT 'default',
  window_seconds INTEGER NOT NULL CHECK (window_seconds > 0),
  max_requests INTEGER NOT NULL CHECK (max_requests > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (endpoint_type, identifier)
);

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id BIGSERIAL PRIMARY KEY,
  endpoint_type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  ip_address TEXT,
  user_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id BIGSERIAL PRIMARY KEY,
  endpoint_type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  ip_address TEXT,
  user_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  violation_count INTEGER NOT NULL DEFAULT 1 CHECK (violation_count > 0),
  lockout_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (endpoint_type, identifier)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_lookup
  ON rate_limit_hits (endpoint_type, identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_lookup
  ON rate_limit_violations (endpoint_type, identifier, lockout_until);

INSERT INTO rate_limits (endpoint_type, identifier, window_seconds, max_requests)
VALUES
  ('auth_login', 'default', 900, 5),
  ('auth_forgot_password', 'default', 3600, 3),
  ('api_general', 'default', 60, 100),
  ('api_sensitive', 'default', 60, 20),
  ('file_upload', 'default', 60, 10)
ON CONFLICT (endpoint_type, identifier) DO NOTHING;
