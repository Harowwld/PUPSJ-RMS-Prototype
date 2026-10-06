-- Preserve source identifiers so SQLite account imports remain idempotent.
ALTER TABLE student_accounts ADD COLUMN legacy_source TEXT;
ALTER TABLE student_accounts ADD COLUMN legacy_id TEXT;

CREATE UNIQUE INDEX idx_student_accounts_legacy_import_key
  ON student_accounts(legacy_source, legacy_id)
  WHERE legacy_source IS NOT NULL AND legacy_id IS NOT NULL;
