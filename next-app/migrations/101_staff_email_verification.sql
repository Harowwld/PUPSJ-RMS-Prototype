-- Preserve sign-in for existing personnel. The directory explicitly creates new accounts as pending.
ALTER TABLE staff ADD COLUMN email_verification_required BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE staff_email_verifications (
  staff_id TEXT PRIMARY KEY REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  attempts_remaining INTEGER NOT NULL DEFAULT 5
);
