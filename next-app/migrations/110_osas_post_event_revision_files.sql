ALTER TABLE osas_post_event_reports
  ADD COLUMN IF NOT EXISTS revision_files text[] NOT NULL DEFAULT '{}'::text[];
