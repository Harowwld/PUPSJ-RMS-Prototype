-- Migration 027: Isolated backup scopes for office vs system governance backups
-- Each office has its own backup partition; SuperAdmin has a separate system governance backup.

-- Add scope discrimination columns to the backups table
ALTER TABLE backups ADD COLUMN IF NOT EXISTS office_id TEXT REFERENCES offices(id) ON DELETE CASCADE;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'office' CHECK (scope IN ('system', 'office'));
ALTER TABLE backups ADD COLUMN IF NOT EXISTS backup_type TEXT NOT NULL DEFAULT 'Full';
ALTER TABLE backups ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES staff(id) ON DELETE SET NULL;

-- Backfill any existing backup rows as office-scoped registrar backups (legacy)
UPDATE backups SET scope = 'office', office_id = 'registrar' WHERE office_id IS NULL AND scope = 'office';

-- Scoped lookup index for fast filtering by scope + office + date
CREATE INDEX IF NOT EXISTS idx_backups_scope_office_created
  ON backups(scope, office_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backups_created_by
  ON backups(created_by);
