CREATE TABLE student_signup_verifications (
  email_key TEXT PRIMARY KEY,
  challenge_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  setup_token_hash TEXT,
  attempts_remaining INTEGER NOT NULL DEFAULT 5,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX student_signup_verifications_expiry_idx ON student_signup_verifications (expires_at);

INSERT INTO rate_limits (endpoint_type, identifier, window_seconds, max_requests)
VALUES ('student_signup_email', 'default', 900, 10)
ON CONFLICT (endpoint_type, identifier) DO NOTHING;
