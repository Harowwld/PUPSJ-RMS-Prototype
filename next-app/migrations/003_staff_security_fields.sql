-- Identity and security fields used by staff account, profile, recovery, and 2FA flows.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS avatar_filename TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS serial_key_hash TEXT;

CREATE TABLE IF NOT EXISTS security_questions (
  id INTEGER PRIMARY KEY,
  question TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS staff_security_answers (
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES security_questions(id) ON DELETE CASCADE,
  answer_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (staff_id, question_id)
);

CREATE TABLE IF NOT EXISTS staff_recovery_codes (
  id BIGSERIAL PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_recovery_codes_active
  ON staff_recovery_codes (staff_id, used_at);

INSERT INTO security_questions (id, question, is_required)
VALUES
  (1, 'What is your mother''s maiden name?', TRUE),
  (2, 'What was the name of your first school?', TRUE),
  (3, 'What is your favorite color?', FALSE)
ON CONFLICT (id) DO NOTHING;
