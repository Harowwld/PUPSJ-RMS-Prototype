ALTER TABLE student_accounts
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS serial_key_hash TEXT;

CREATE TABLE IF NOT EXISTS student_recovery_codes (
  id BIGSERIAL PRIMARY KEY,
  student_account_id BIGINT NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_recovery_codes_active
  ON student_recovery_codes (student_account_id, used_at);
