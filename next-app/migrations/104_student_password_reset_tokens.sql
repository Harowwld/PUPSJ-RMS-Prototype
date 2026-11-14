ALTER TABLE password_reset_tokens
  ALTER COLUMN staff_id DROP NOT NULL,
  ADD COLUMN student_account_id BIGINT REFERENCES student_accounts(id) ON DELETE CASCADE,
  ADD CONSTRAINT password_reset_tokens_one_account
    CHECK (num_nonnulls(staff_id, student_account_id) = 1);

CREATE INDEX idx_password_reset_tokens_student_active
  ON password_reset_tokens (student_account_id, expires_at)
  WHERE student_account_id IS NOT NULL AND used_at IS NULL;
